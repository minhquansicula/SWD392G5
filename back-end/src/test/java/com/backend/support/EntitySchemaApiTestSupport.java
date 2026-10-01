package com.backend.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Diagnostic API tests against real PostgreSQL and entity-generated tables.
 * This deliberately does NOT certify Flyway/schema correctness: the existing
 * PostgresSpringTest and migration tests still exercise production migrations.
 * All DDL/DML is restricted to a new disposable exam_test_* schema.
 */
public abstract class EntitySchemaApiTestSupport {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        PostgresTestDatabase database = new PostgresTestDatabase();
        Runtime.getRuntime().addShutdownHook(new Thread(database::close));
        registry.add("spring.datasource.url", database::url);
        registry.add("spring.datasource.username", database::username);
        registry.add("spring.datasource.password", database::password);
        registry.add("spring.jpa.properties.hibernate.default_schema", database::schema);
        registry.add("spring.flyway.enabled", () -> false);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create");
        registry.add("spring.jpa.show-sql", () -> false);
    }
}
