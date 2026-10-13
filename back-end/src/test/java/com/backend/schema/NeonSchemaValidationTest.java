package com.backend.schema;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(
        named = "NEON_SCHEMA_VALIDATION_ENABLED", matches = "true")
class NeonSchemaValidationTest {

    @Test
    void currentEntitiesValidateAgainstNeonReadOnly() throws Exception {
        String url = requiredEnv("NEON_SCHEMA_VALIDATION_JDBC_URL");
        String username = requiredEnv("NEON_SCHEMA_VALIDATION_USERNAME");
        String passfile = requiredEnv("PGPASSFILE");

        assertThat(Files.isReadable(Path.of(passfile)))
                .as("PGPASSFILE must be readable")
                .isTrue();
        assertThat(System.getProperty("org.postgresql.pgpassfile"))
                .as("Do not override the approved PGPASSFILE")
                .isNull();
        assertThat(url).doesNotContain("password=", "service=");

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
                                    current_setting('transaction_read_only')
                             """)) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString(1)).isEqualTo("neondb");
                    assertThat(result.getString(2)).isEqualTo(username);
                    assertThat(result.getString(3)).isEqualTo("public");
                    assertThat(result.getString(4)).isEqualTo("on");
                }
            } finally {
                connection.rollback();
            }
        }

        LocalContainerEntityManagerFactoryBean factory =
                new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setPackagesToScan(
                "com.backend.module.auth.core.entity",
                "com.backend.module.exam.core.entity",
                "com.backend.module.interview.core.entity",
                "com.backend.module.reporting.core.entity");
        factory.setJpaPropertyMap(Map.of(
                "hibernate.hbm2ddl.auto", "validate",
                "hibernate.default_schema", "public",
                "hibernate.jdbc.lob.non_contextual_creation", "true"));

        try {
            factory.afterPropertiesSet();
            var entityManagerFactory = factory.getObject();
            assertThat(entityManagerFactory).isNotNull();

            Set<String> entities = entityManagerFactory.getMetamodel()
                    .getEntities().stream()
                    .map(entity -> entity.getName())
                    .collect(Collectors.toSet());

            assertThat(entities).containsExactlyInAnyOrderElementsOf(Set.of(
                    "User", "Course", "CourseLecturer", "Exam",
                    "ExamSchedule", "Question", "AssignedQuestion",
                    "Transcript", "QuestionResult"));
        } finally {
            factory.destroy();
        }
    }

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        assertThat(value).as("Required environment variable: %s", name)
                .isNotBlank();
        return value;
    }
}
