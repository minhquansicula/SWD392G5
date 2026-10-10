package com.backend.module.auth;

import com.backend.config.CorsConfig;
import com.backend.config.SecurityConfig;
import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.service.AdminUserService;
import com.backend.module.auth.api.service.AuthService;
import com.backend.module.auth.core.EmailNormalizer;
import com.backend.module.auth.core.controller.AdminUserController;
import com.backend.module.auth.core.controller.AuthController;
import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.PasswordMailStatus;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.module.auth.core.service.AdminUserServiceImpl;
import com.backend.module.auth.core.service.PasswordLinkMail;
import com.backend.module.auth.core.service.PasswordLinkService;
import com.backend.module.auth.core.service.AuthServiceImpl;
import com.backend.security.jwt.JwtAuthenticationEntryPoint;
import com.backend.security.jwt.JwtAuthenticationFilter;
import com.backend.security.jwt.JwtTokenProvider;
import com.backend.security.user.CustomUserDetailsService;
import com.backend.shared.exception.GlobalExceptionHandler;
import com.backend.support.LocalAuthPostgresDatabase;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.*;
import org.springframework.core.env.MapPropertySource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockServletContext;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.json.JsonMapper;

import javax.sql.DataSource;
import java.security.SecureRandom;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(
        named = "LOCAL_AUTH_POSTGRES_IT_ENABLED", matches = "true")
class AdminEmailPostgresIntegrationTest {
    private static final String PASSWORD = "Auth-it-password-2026";
    private static LocalAuthPostgresDatabase database;
    // Stands in for SMTP: the only place a raw link token is ever visible.
    private static final List<PasswordLinkMail> MAILED = new java.util.concurrent.CopyOnWriteArrayList<>();

    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private UserRepository users;
    private PasswordEncoder encoder;
    private JwtTokenProvider tokens;
    private JdbcTemplate jdbc;
    private PlatformTransactionManager manager;
    private final JsonMapper json = JsonMapper.builder().build();
    private boolean suitePassed;

    @BeforeAll
    void prepare() throws Exception {
        database = new LocalAuthPostgresDatabase();
        database.prepare();

        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.getEnvironment().getPropertySources().addFirst(
                new MapPropertySource("auth-it", Map.of(
                        "jwt.secret", Base64.getEncoder().encodeToString(key),
                        "jwt.expiration-ms", 86400000L)));
        context.register(AuthConfiguration.class);
        context.refresh();

        mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .webAppContextSetup(context).apply(springSecurity()).build();
        users = context.getBean(UserRepository.class);
        encoder = context.getBean(PasswordEncoder.class);
        tokens = context.getBean(JwtTokenProvider.class);
        manager = context.getBean(PlatformTransactionManager.class);
        jdbc = new JdbcTemplate(context.getBean(DataSource.class));
    }

    @AfterAll
    void finish() throws Exception {
        boolean mayDrop = suitePassed;
        try {
            if (context != null) context.close();
        } catch (RuntimeException failure) {
            mayDrop = false;
            throw failure;
        } finally {
            if (database != null) database.finish(mayDrop);
        }
    }

    @Test
    void createUpdateBatchAndEmailLoginUseRealPostgresTransactionsAndJwt()
            throws Exception {
        String initialHistory = historySnapshot();

        // Controlled test fixtures, not business account creation.
        User admin = fixture("it_admin", " Admin@EXAMPLE.INVALID ", Role.ADMIN, null);
        User legacy = fixture("legacy@example.invalid", null, Role.STUDENT, null);
        new TransactionTemplate(manager).execute(status -> {
            users.saveAndFlush(admin);
            users.saveAndFlush(legacy);
            return null;
        });

        String adminToken = login(" Admin@EXAMPLE.INVALID ", PASSWORD);
        assertTrue(tokens.validateToken(adminToken));
        assertEquals("it_admin", tokens.getUsernameFromToken(adminToken));
        System.out.println("PASS: real BCrypt login/JWT and internal admin subject");

        String primaryRaw = " Primary@EXAMPLE.INVALID ";
        UUID primaryId = create(adminToken,
                request("it_primary", primaryRaw, "IT_PRIMARY"));
        User primary = users.findById(primaryId).orElseThrow();
        assertEquals(primaryRaw, primary.getEmail());
        assertEquals("primary@example.invalid", primary.getEmailNormalized());
        // The account starts with a password nobody knows and a hashed one-time link.
        assertFalse(encoder.matches(PASSWORD, primary.getPasswordHash()));
        assertNull(primary.getPasswordSetAt());
        assertEquals(PasswordMailStatus.SENT, primary.getPasswordMailStatus());
        String primaryLink = linkTokenFor(primaryId);
        assertNotEquals(primaryLink, primary.getPasswordTokenHash());
        assertTrue(primary.getPasswordTokenHash().matches("[0-9a-f]{64}"));
        credentialsRejected("primary@example.invalid", PASSWORD);
        mvc.perform(get("/api/admin/users/" + primaryId).header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.data.passwordStatus").value("PENDING"));

        // Public endpoints: no Authorization header at all.
        passwordLink(primaryLink).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(primaryRaw))
                .andExpect(jsonPath("$.data.activation").value(true));
        setPassword(primaryLink, "short").andExpect(status().isBadRequest());
        setPassword(primaryLink, PASSWORD).andExpect(status().isOk());
        setPassword(primaryLink, "Another-password-2026").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_PASSWORD_LINK"));
        passwordLink(primaryLink).andExpect(status().isBadRequest());
        primary = users.findById(primaryId).orElseThrow();
        assertTrue(encoder.matches(PASSWORD, primary.getPasswordHash()));
        assertNotNull(primary.getPasswordSetAt());
        assertNull(primary.getPasswordTokenHash());
        mvc.perform(get("/api/admin/users/" + primaryId).header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.data.passwordStatus").value("ACTIVATED"));
        System.out.println("PASS: random initial password, hashed one-time link, set-password activates once");

        String primaryToken = login(" PRIMARY@EXAMPLE.INVALID ", PASSWORD);
        assertEquals("it_primary", tokens.getUsernameFromToken(primaryToken));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + primaryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(primaryId.toString()))
                .andExpect(jsonPath("$.data.username").value("it_primary"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
        System.out.println("PASS: create/JPA round-trip/email-login/JWT filter/me");

        long beforeInvalid = users.count();
        postCreate(adminToken, request("invalid", "", null))
                .andExpect(status().isBadRequest());
        assertEquals(beforeInvalid, users.count());

        putUpdate(adminToken, primaryId, Map.of("fullName", "Primary Updated"))
                .andExpect(status().isOk());
        Map<String, Object> nullEmail = new HashMap<>();
        nullEmail.put("email", null);
        putUpdate(adminToken, primaryId, nullEmail).andExpect(status().isOk());
        assertPair(primaryId, primaryRaw);

        String updatedRaw = " Updated.Primary@EXAMPLE.INVALID ";
        putUpdate(adminToken, primaryId, Map.of("email", updatedRaw))
                .andExpect(status().isOk());
        assertPair(primaryId, updatedRaw);

        String beforeEmpty = rowSnapshot(primaryId);
        putUpdate(adminToken, primaryId, Map.of("fullName", "Must not persist", "email", ""))
                .andExpect(status().isBadRequest());
        assertEquals(beforeEmpty, rowSnapshot(primaryId));
        System.out.println("PASS: update pair, omitted/null preservation and empty rejection");

        putUpdate(adminToken, legacy.getId(), Map.of("fullName", "Legacy Updated"))
                .andExpect(status().isOk());
        putUpdate(adminToken, legacy.getId(), nullEmail).andExpect(status().isOk());
        User storedLegacy = users.findById(legacy.getId()).orElseThrow();
        assertNull(storedLegacy.getEmail());
        assertNull(storedLegacy.getEmailNormalized());

        credentialsRejected("legacy@example.invalid", PASSWORD);
        putUpdate(adminToken, legacy.getId(), Map.of("email", " Legacy.Real@EXAMPLE.INVALID "))
                .andExpect(status().isOk());
        String legacyToken = login("legacy.real@example.invalid", PASSWORD);
        assertEquals("legacy@example.invalid", tokens.getUsernameFromToken(legacyToken));
        System.out.println("PASS: legacy missing canonical has no fallback; supplied email enables login");

        UUID secondaryId = create(adminToken,
                request("it_secondary", "secondary@example.invalid", "IT_SECONDARY"));

        // Admin resend: the earlier link dies, the new one works.
        String firstSecondaryLink = linkTokenFor(secondaryId);
        mvc.perform(post("/api/admin/users/" + secondaryId + "/password-link")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordStatus").value("PENDING"));
        String secondSecondaryLink = linkTokenFor(secondaryId);
        assertNotEquals(firstSecondaryLink, secondSecondaryLink);
        passwordLink(firstSecondaryLink).andExpect(status().isBadRequest());
        passwordLink(secondSecondaryLink).andExpect(status().isOk());
        mvc.perform(post("/api/admin/users/" + secondaryId + "/password-link"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/users/" + secondaryId + "/password-link")
                        .header("Authorization", "Bearer " + primaryToken))
                .andExpect(status().isForbidden());

        // An expired link is rejected and reported as EXPIRED.
        jdbc.update("UPDATE public.users SET password_token_expires_at = now() - interval '1 minute' WHERE id = ?",
                secondaryId);
        passwordLink(secondSecondaryLink).andExpect(status().isBadRequest());
        setPassword(secondSecondaryLink, PASSWORD).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/users/" + secondaryId).header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.data.passwordStatus").value("EXPIRED"));
        System.out.println("PASS: resend replaces link, admin-only, expiry enforced");

        // Forgot password: same answer for unknown email; a known one gets a reset link.
        int mailsBeforeForgot = MAILED.size();
        forgot("missing@example.invalid").andExpect(status().isOk());
        assertEquals(mailsBeforeForgot, MAILED.size());
        forgot(" UPDATED.primary@example.invalid ").andExpect(status().isOk());
        assertEquals(mailsBeforeForgot + 1, MAILED.size());
        assertFalse(MAILED.get(MAILED.size() - 1).activation());
        String resetLink = linkTokenFor(primaryId);
        login("updated.primary@example.invalid", PASSWORD);
        setPassword(resetLink, "Reset-password-2026").andExpect(status().isOk());
        credentialsRejected("updated.primary@example.invalid", PASSWORD);
        login("updated.primary@example.invalid", "Reset-password-2026");
        System.out.println("PASS: forgot-password reset link; old password stops working only after reset");
        String primaryBeforeConflict = rowSnapshot(primaryId);
        putUpdate(adminToken, primaryId, Map.of(
                "fullName", "Must rollback",
                "email", " SECONDARY@EXAMPLE.INVALID "))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("DATA_INTEGRITY_CONFLICT"));
        assertEquals(primaryBeforeConflict, rowSnapshot(primaryId));

        CreateUserRequest acrossRole = request(
                "it_duplicate_email", " SECONDARY@EXAMPLE.INVALID ", null);
        acrossRole.setRole("LECTURER");
        postCreate(adminToken, acrossRole).andExpect(status().isConflict());
        assertFalse(users.existsByUsername("it_duplicate_email"));
        assertPair(secondaryId, "secondary@example.invalid");
        System.out.println("PASS: global canonical unique and real update transaction rollback");

        // Explicit repository writes bypass service pre-checks.
        // These assertions inspect actual exceptions from PostgreSQL/Hibernate.
        User usernameCollision = fixture(
                "it_primary", "db.username@example.invalid", Role.STUDENT, null);
        assertDatabaseUnique(usernameCollision, "users_username_key");

        User codeCollision = fixture(
                "db_code", "db.code@example.invalid", Role.STUDENT, "IT_PRIMARY");
        assertDatabaseUnique(codeCollision, "users_student_code_key");

        User emailCollision = fixture(
                "db_email", " SECONDARY@EXAMPLE.INVALID ", Role.LECTURER, null);
        assertDatabaseUnique(emailCollision, "users_email_normalized_key");
        System.out.println("PASS: actual DB 23505 + actual Hibernate names for all three business constraints");

        String existingBeforeBatch = rowSnapshot(primaryId);
        long beforeBatch = users.count();
        CreateUserRequest first = request("batch_first", " First@EXAMPLE.INVALID ", "B_FIRST");
        CreateUserRequest invalid = request("batch_invalid", "", null);
        CreateUserRequest precheckUsername = request(
                "it_primary", "replacement@example.invalid", "REPLACEMENT");
        precheckUsername.setFullName("Must not overwrite");
        CreateUserRequest precheckCode = request(
                "batch_code", "batch.code@example.invalid", "IT_PRIMARY");
        CreateUserRequest dbEmail = request(
                "batch_email", " SECONDARY@EXAMPLE.INVALID ", null);
        dbEmail.setRole("LECTURER");
        CreateUserRequest last = request("batch_last", "last@example.invalid", "B_LAST");
        int mailsBeforeBatch = MAILED.size();

        mvc.perform(post("/api/admin/users/batch")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(List.of(
                                first, invalid, precheckUsername,
                                precheckCode, dbEmail, last))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value(6))
                .andExpect(jsonPath("$.data.created").value(2))
                .andExpect(jsonPath("$.data.skipped").value(4))
                .andExpect(jsonPath("$.data.rows[0].user.username").value("batch_first"))
                .andExpect(jsonPath("$.data.rows[0].user.passwordStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.rows[1].reason").value("MISSING_REQUIRED"))
                .andExpect(jsonPath("$.data.rows[2].reason").value("USERNAME_EXISTS"))
                .andExpect(jsonPath("$.data.rows[3].reason").value("STUDENT_CODE_EXISTS"))
                // No service pre-check for email: this reason comes from the real DB constraint.
                .andExpect(jsonPath("$.data.rows[4].reason").value("EMAIL_EXISTS"))
                .andExpect(jsonPath("$.data.rows[4].row").value(5))
                .andExpect(jsonPath("$.data.rows[5].user.username").value("batch_last"));
        assertEquals(mailsBeforeBatch + 2, MAILED.size());
        assertEquals("First@EXAMPLE.INVALID", MAILED.get(mailsBeforeBatch).to());
        assertEquals(PasswordMailStatus.SENT,
                users.findByUsername("batch_first").orElseThrow().getPasswordMailStatus());
        assertEquals(PasswordMailStatus.SENT,
                users.findByUsername("batch_last").orElseThrow().getPasswordMailStatus());

        // No test-wide transaction: these reads observe actual committed rows.
        assertEquals(beforeBatch + 2, users.count());
        assertTrue(users.existsByUsername("batch_first"));
        assertTrue(users.existsByUsername("batch_last"));
        assertFalse(users.existsByUsername("batch_invalid"));
        assertFalse(users.existsByUsername("batch_code"));
        assertFalse(users.existsByUsername("batch_email"));
        assertEquals(existingBeforeBatch, rowSnapshot(primaryId));
        System.out.println("PASS: batch valid rows committed independently; invalid/pre-check/DB-duplicate rows skipped");

        long beforeAllInvalid = users.count();
        mvc.perform(post("/api/admin/users/batch")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                List.of(request("all_invalid", "", null)))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.created").value(0))
                .andExpect(jsonPath("$.data.rows[0].status").value("SKIPPED"));
        assertEquals(beforeAllInvalid, users.count());

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("username", "it_primary", "password", PASSWORD))))
                .andExpect(status().isBadRequest());
        credentialsRejected("missing@example.invalid", PASSWORD);
        credentialsRejected("secondary@example.invalid", "wrong");
        // it_secondary never completed its link, so no password can log it in.
        credentialsRejected("secondary@example.invalid", PASSWORD);
        assertEquals(initialHistory, historySnapshot());

        suitePassed = true;
        System.out.println("PASS: all auth integration steps; Flyway history unchanged");
    }

    private User fixture(String username, String rawEmail, Role role, String code) {
        return User.builder().username(username).fullName(username).role(role)
                .studentCode(code).passwordHash(encoder.encode(PASSWORD))
                .passwordSetAt(java.time.OffsetDateTime.now())
                .email(rawEmail).emailNormalized(EmailNormalizer.normalize(rawEmail))
                .build();
    }

    private CreateUserRequest request(String username, String rawEmail, String code) {
        return CreateUserRequest.builder().username(username).fullName(username)
                .role("STUDENT").studentCode(code).email(rawEmail).build();
    }

    /** Raw token from the latest mail captured for the user. */
    private String linkTokenFor(UUID userId) {
        for (int i = MAILED.size() - 1; i >= 0; i--) {
            PasswordLinkMail mail = MAILED.get(i);
            if (mail.userId().equals(userId)) {
                assertTrue(mail.link().startsWith("http://localhost:5173/#/set-password?token="));
                return mail.link().substring(mail.link().indexOf('=') + 1);
            }
        }
        throw new AssertionError("No password link mail captured for " + userId);
    }

    private ResultActions passwordLink(String token) throws Exception {
        return mvc.perform(post("/api/auth/password/link").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", token))));
    }

    private ResultActions setPassword(String token, String password) throws Exception {
        return mvc.perform(post("/api/auth/password/set").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", token, "newPassword", password))));
    }

    private ResultActions forgot(String email) throws Exception {
        return mvc.perform(post("/api/auth/password/forgot").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email))));
    }

    private UUID create(String token, CreateUserRequest request) throws Exception {
        String body = postCreate(token, request).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(json.readTree(body).path("data").path("id").asText());
    }

    private ResultActions postCreate(String token, CreateUserRequest request)
            throws Exception {
        return mvc.perform(post("/api/admin/users")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request)));
    }

    private ResultActions putUpdate(String token, UUID id, Map<String, Object> body)
            throws Exception {
        return mvc.perform(put("/api/admin/users/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }

    private String login(String rawEmail, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("username", rawEmail, "password", password))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).path("data").path("token").asText();
    }

    private void credentialsRejected(String email, String password) throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("username", email, "password", password))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect"));
    }

    private void assertPair(UUID id, String rawEmail) {
        User user = users.findById(id).orElseThrow();
        assertEquals(rawEmail, user.getEmail());
        assertEquals(EmailNormalizer.normalize(rawEmail), user.getEmailNormalized());
    }

    private String rowSnapshot(UUID id) {
        return jdbc.queryForObject(
                "SELECT row_to_json(u)::text FROM public.users u WHERE id = ?",
                String.class, id);
    }

    private String historySnapshot() {
        return jdbc.queryForObject("""
                SELECT jsonb_agg(to_jsonb(h) ORDER BY installed_rank)::text
                FROM public.flyway_schema_history h
                """, String.class);
    }

    private void assertDatabaseUnique(User collision, String expectedName) {
        long before = users.count();
        DataIntegrityViolationException failure =
                assertThrows(DataIntegrityViolationException.class,
                        () -> new TransactionTemplate(manager).execute(status ->
                                users.saveAndFlush(collision)));

        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        ConstraintViolationException actual = null;
        for (Throwable cause = failure; cause != null && visited.add(cause);
             cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraint) {
                actual = constraint;
                break;
            }
        }
        assertNotNull(actual, "Expected actual Hibernate constraint exception");
        assertEquals("23505", actual.getSQLState());
        assertEquals(expectedName, actual.getConstraintName());
        assertEquals(before, users.count());
        assertFalse(users.existsByUsername(collision.getUsername())
                && !"users_username_key".equals(expectedName));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = UserRepository.class)
    @Import({SecurityConfig.class, CorsConfig.class})
    static class AuthConfiguration {
        @Bean
        DataSource dataSource() {
            return database.dataSource();
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            LocalContainerEntityManagerFactoryBean factory =
                    new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setPackagesToScan("com.backend.module.auth.core.entity");
            factory.setJpaPropertyMap(Map.of(
                    "hibernate.hbm2ddl.auto", "validate",
                    "hibernate.default_schema", "public",
                    "hibernate.show_sql", "false",
                    "hibernate.jdbc.lob.non_contextual_creation", "true"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        LocalValidatorFactoryBean validator() {
            return new LocalValidatorFactoryBean();
        }

        @Bean
        JsonMapper jsonMapper() {
            return JsonMapper.builder().build();
        }

        @Bean
        JwtTokenProvider jwtTokenProvider() {
            return new JwtTokenProvider();
        }

        @Bean
        UserDetailsService userDetailsService(UserRepository repository) {
            return new CustomUserDetailsService(repository);
        }

        @Bean
        JwtAuthenticationEntryPoint entryPoint(JsonMapper mapper) {
            return new JwtAuthenticationEntryPoint(mapper);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(
                JwtTokenProvider provider, ObjectProvider<UserDetailsService> details,
                JwtAuthenticationEntryPoint entryPoint) {
            return new JwtAuthenticationFilter(provider, details, entryPoint);
        }

        @Bean
        AuthService authService(UserRepository repository, PasswordEncoder encoder,
                                JwtTokenProvider tokens, LocalValidatorFactoryBean validator) {
            return new AuthServiceImpl(repository, encoder, tokens, validator);
        }

        @Bean
        PasswordLinkService passwordLinkService(UserRepository repository, PasswordEncoder encoder,
                                                PlatformTransactionManager manager) {
            return new PasswordLinkService(repository, encoder, mails -> {
                MAILED.addAll(mails);
                return new java.util.HashSet<>();
            }, manager, 72, "http://localhost:5173", Runnable::run);
        }

        @Bean
        AdminUserService adminUserService(
                UserRepository repository, PasswordEncoder encoder,
                LocalValidatorFactoryBean validator, PlatformTransactionManager manager,
                PasswordLinkService links) {
            return new AdminUserServiceImpl(repository, encoder, validator, manager, links);
        }

        @Bean
        AuthController authController(AuthService service, PasswordLinkService links) {
            return new AuthController(service, links);
        }

        @Bean
        AdminUserController adminUserController(AdminUserService service) {
            return new AdminUserController(service);
        }

        @Bean
        GlobalExceptionHandler exceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
