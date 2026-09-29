package com.backend.support;

import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;

public final class LatestSchemaFixture {
    private LatestSchemaFixture() { }

    public static void create(PostgresTestDatabase database) {
        try (Connection connection = database.connect(); Statement statement = connection.createStatement()) {
            String sql = new ClassPathResource("schema-fixtures/lastScriptDB.sql").getContentAsString(StandardCharsets.UTF_8);
            // The exported schema creates public; use the disposable test schema instead.
            sql = sql.replaceFirst("(?i)CREATE\\s+SCHEMA\\s+\"public\"\\s*;", "");
            statement.execute(sql);
        } catch (Exception ex) {
            database.close();
            throw new IllegalStateException("Cannot initialize the latest database script", ex);
        }
    }
}
