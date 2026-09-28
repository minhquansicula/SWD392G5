package com.backend.support;

import java.sql.*;
import java.util.UUID;

/** Explicit opt-in PostgreSQL tests, always in a disposable schema. */
public final class PostgresTestDatabase implements AutoCloseable {
    private final String baseUrl = System.getenv("EXAM_TEST_DATABASE_URL");
    private final String username = System.getenv().getOrDefault("EXAM_TEST_DATABASE_USERNAME", "postgres");
    private final String password = System.getenv().getOrDefault("EXAM_TEST_DATABASE_PASSWORD", "");
    private final String schema = "exam_test_" + UUID.randomUUID().toString().replace("-", "");

    public PostgresTestDatabase() {
        if (baseUrl == null || baseUrl.contains("currentSchema=")) {
            throw new IllegalStateException("Set EXAM_TEST_DATABASE_URL without currentSchema for isolated PostgreSQL tests");
        }
        try (Connection connection = DriverManager.getConnection(baseUrl, username, password);
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot create isolated test schema", e);
        }
    }

    public String url() { return baseUrl + (baseUrl.contains("?") ? "&" : "?") + "currentSchema=" + schema; }
    public String username() { return username; }
    public String password() { return password; }
    public String schema() { return schema; }

    public Connection connect() throws SQLException {
        return DriverManager.getConnection(url(), username, password);
    }

    @Override
    public void close() {
        try (Connection connection = DriverManager.getConnection(baseUrl, username, password);
             Statement statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot clean up test schema " + schema, e);
        }
    }
}
