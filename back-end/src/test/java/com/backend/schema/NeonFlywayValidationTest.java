package com.backend.schema;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.CoreErrorCode;
import org.flywaydb.core.api.MigrationState;
import org.flywaydb.core.api.callback.Callback;
import org.flywaydb.core.internal.callback.InternalCallback;
import org.flywaydb.core.internal.jdbc.StatementInterceptor;
import org.flywaydb.core.internal.nc.NativeConnectorsSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@EnabledIfEnvironmentVariable(
        named = "NEON_FLYWAY_VALIDATION_ENABLED", matches = "true")
class NeonFlywayValidationTest {

    private static final Set<String> MIGRATION_FILES = Set.of(
            "V1__create_core_tables.sql",
            "V2__create_exam_schedule_tables.sql",
            "V3__align_interview_question_references.sql",
            "V5__add_normalized_user_email.sql",
            "V6__add_password_setup_link.sql");

    @Test
    void baselineFourReportsV5AndV6PendingWithoutMigration() throws Exception {
        String url = requiredEnv("NEON_SCHEMA_VALIDATION_JDBC_URL");
        String username = requiredEnv("NEON_SCHEMA_VALIDATION_USERNAME");
        String passfile = requiredEnv("PGPASSFILE");

        assertThat(url).isEqualTo(
                "jdbc:postgresql://ep-dry-block-b3yhbez5-pooler.c-4.ap-southeast-1.aws.neon.tech"
                + ":5432/neondb?sslmode=require&channelBinding=require");
        assertThat(username).isEqualTo("neondb_owner");
        assertThat(Files.isReadable(Path.of(passfile))).isTrue();
        assertThat(System.getProperty("org.postgresql.pgpassfile")).isNull();

        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties runtime = yaml.getObject();
        assertThat(runtime).isNotNull();
        assertThat(runtime.getProperty("spring.flyway.enabled"))
                .isEqualTo("true");
        assertThat(runtime.getProperty("spring.flyway.locations"))
                .isEqualTo("classpath:db/migration");
        assertThat(runtime.getProperty("spring.flyway.baseline-version"))
                .isEqualTo("4");
        assertThat(runtime.getProperty("spring.flyway.baseline-on-migrate"))
                .isEqualTo("true");

        Set<String> flywayKeys = runtime.keySet().stream()
                .map(String.class::cast)
                .filter(key -> key.startsWith("spring.flyway."))
                .collect(java.util.stream.Collectors.toSet());
        assertThat(flywayKeys).containsExactlyInAnyOrder(
                "spring.flyway.enabled",
                "spring.flyway.locations",
                "spring.flyway.baseline-version",
                "spring.flyway.baseline-on-migrate");

        PathMatchingResourcePatternResolver resources =
                new PathMatchingResourcePatternResolver();
        assertThat(readableNames(resources, "classpath*:db/migration/**/*")
                .stream().filter(name -> !".gitkeep".equals(name)).toList())
                .containsExactlyInAnyOrderElementsOf(MIGRATION_FILES);
        assertThat(readableNames(resources, "classpath*:db/callback/**/*"))
                .isEmpty();

        Properties connectionProperties = new Properties();
        connectionProperties.setProperty(
                "options", "-c default_transaction_read_only=on");
        connectionProperties.setProperty("readOnly", "true");
        connectionProperties.setProperty("readOnlyMode", "always");

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setConnectionProperties(connectionProperties);

        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                try (var statement = connection.createStatement();
                     var result = statement.executeQuery("""
                             SELECT current_database(), current_user,
                                    current_schema(),
                                    current_setting('transaction_read_only'),
                                    to_regclass('public.flyway_schema_history')::text
                             """)) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString(1)).isEqualTo("neondb");
                    assertThat(result.getString(2)).isEqualTo(username);
                    assertThat(result.getString(3)).isEqualTo("public");
                    assertThat(result.getString(4)).isEqualTo("on");
                    assertThat(result.getString(5))
                            .isEqualTo("flyway_schema_history");
                }
            } finally {
                connection.rollback();
            }
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> before = history(jdbc);
        assertThat(before).hasSize(1);
        assertThat(before.get(0).get("version")).isEqualTo("4");
        assertThat(before.get(0).get("type")).isEqualTo("BASELINE");
        assertThat(before.get(0).get("success")).isEqualTo(true);

        var configuration = Flyway.configure()
                .dataSource(dataSource)
                .locations(runtime.getProperty("spring.flyway.locations"))
                .baselineVersion(runtime.getProperty("spring.flyway.baseline-version"))
                .baselineOnMigrate(Boolean.parseBoolean(
                        runtime.getProperty("spring.flyway.baseline-on-migrate")))
                .defaultSchema("public")
                .schemas("public")
                .table("flyway_schema_history")
                .createSchemas(false)
                .failOnMissingLocations(true)
                .skipDefaultCallbacks(true)
                .callbacks(new Callback[0]);

        assertThat(configuration.getCallbacks()).isEmpty();
        assertThat(configuration.getResolvers()).isEmpty();
        assertThat(configuration.getInitSql()).isNull();
        assertThat(configuration.isSkipDefaultResolvers()).isFalse();
        assertThat(configuration.isReportEnabled()).isFalse();
        assertThat(configuration.getIgnoreMigrationPatterns())
                .extracting(Object::toString).containsExactly("*:future");
        assertThat(configuration.getPluginRegister()
                .getInstancesOf(InternalCallback.class)).isEmpty();
        assertThat(configuration.getPluginRegister()
                .getInstancesOf(StatementInterceptor.class)).isEmpty();
        assertThat(configuration.getPluginRegister()
                .getInstancesOf(NativeConnectorsSupport.class)).isEmpty();

        Flyway flyway = configuration.load();
        assertThat(flyway.getConfiguration().getCallbacks()).isEmpty();

        var info = flyway.info();
        for (var migration : info.all()) {
            System.out.printf("version=%s type=%s state=%s script=%s%n",
                    migration.getVersion(), migration.getType(),
                    migration.getState(), migration.getScript());
        }

        assertThat(info.all()).extracting(
                migration -> migration.getVersion().toString(),
                migration -> migration.getState(),
                migration -> migration.getScript())
                .containsExactly(
                        tuple("1", MigrationState.BELOW_BASELINE,
                                "V1__create_core_tables.sql"),
                        tuple("2", MigrationState.BELOW_BASELINE,
                                "V2__create_exam_schedule_tables.sql"),
                        tuple("3", MigrationState.BELOW_BASELINE,
                                "V3__align_interview_question_references.sql"),
                        tuple("4", MigrationState.BASELINE,
                                "<< Flyway Baseline >>"),
                        tuple("5", MigrationState.PENDING,
                                "V5__add_normalized_user_email.sql"),
                        tuple("6", MigrationState.PENDING,
                                "V6__add_password_setup_link.sql"));
        assertThat(info.applied()).hasSize(1);
        assertThat(info.pending()).extracting(
                migration -> migration.getVersion().toString(),
                migration -> migration.getState(),
                migration -> migration.getScript())
                .containsExactly(
                        tuple("5", MigrationState.PENDING,
                                "V5__add_normalized_user_email.sql"),
                        tuple("6", MigrationState.PENDING,
                                "V6__add_password_setup_link.sql"));
        assertThat(Arrays.stream(info.all())
                .filter(migration -> migration.getState().isFailed())
                .toList()).isEmpty();
        assertThat(info.current()).isNotNull();
        assertThat(info.current().getVersion().toString()).isEqualTo("4");

        var validation = flyway.validateWithResult();
        assertThat(validation.validationSuccessful).isFalse();
        assertThat(validation.errorDetails).isNotNull();
        assertThat(validation.errorDetails.errorCode)
                .isEqualTo(CoreErrorCode.VALIDATE_ERROR);
        // One entry per migration that the code has but the database does not.
        assertThat(validation.invalidMigrations)
                .extracting(invalid -> invalid.version).containsExactly("5", "6");
        for (var pendingValidation : validation.invalidMigrations) {
            assertThat(pendingValidation.errorDetails).isNotNull();
            assertThat(pendingValidation.errorDetails.errorCode)
                    .isEqualTo(CoreErrorCode.RESOLVED_VERSIONED_MIGRATION_NOT_APPLIED);
        }
        assertThat(validation.validateCount).isEqualTo(0);

        assertThat(history(jdbc)).isEqualTo(before);
    }

    private static List<String> readableNames(
            PathMatchingResourcePatternResolver resources, String pattern)
            throws Exception {
        return Arrays.stream(resources.getResources(pattern))
                .filter(Resource::isReadable)
                .map(Resource::getFilename)
                .toList();
    }

    private static List<Map<String, Object>> history(JdbcTemplate jdbc) {
        return jdbc.queryForList("""
                SELECT installed_rank, version, description, type, script,
                       checksum, installed_by, installed_on,
                       execution_time, success
                FROM public.flyway_schema_history
                ORDER BY installed_rank
                """);
    }

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        assertThat(value).as("Required environment variable: %s", name)
                .isNotBlank();
        return value;
    }
}
