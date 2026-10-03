package com.backend.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Boots against the user's actual SQL, not a schema generated from the entities. */
public abstract class LatestSchemaSpringTest {
    @DynamicPropertySource
    static void latestDatabase(DynamicPropertyRegistry registry) {
        PostgresTestDatabase database = new PostgresTestDatabase();
        LatestSchemaFixture.create(database);
        Runtime.getRuntime().addShutdownHook(new Thread(database::close));
        registry.add("spring.datasource.url", database::url);
        registry.add("spring.datasource.username", database::username);
        registry.add("spring.datasource.password", database::password);
        registry.add("spring.flyway.default-schema", database::schema);
        registry.add("spring.flyway.baseline-on-migrate", () -> true);
        registry.add("spring.flyway.baseline-version", () -> "4");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.jpa.show-sql", () -> false);
    }
}
