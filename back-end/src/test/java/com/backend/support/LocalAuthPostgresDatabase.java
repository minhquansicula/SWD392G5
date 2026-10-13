package com.backend.support;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.callback.Callback;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;
import java.util.UUID;

public final class LocalAuthPostgresDatabase {
    private static final String USER = "postgres";
    private static final Path PASSFILE =
            Path.of("C:/Users/dat/AppData/Local/opencode-auth-it.pgpass");

    private final String name =
            "auth_email_it_" + UUID.randomUUID().toString().replace("-", "");
    private boolean prepareAttempted;
    private boolean created;
    private boolean prepared;
    private long databaseOid;

    public String name() {
        return name;
    }

    public void prepare() throws Exception {
        require(!prepareAttempted, "Database preparation must not be retried");
        prepareAttempted = true;
        require("true".equals(System.getenv("LOCAL_AUTH_POSTGRES_IT_ENABLED")),
                "Explicit local integration opt-in is required");

        String configuredPassfile = System.getenv("PGPASSFILE");
        require(configuredPassfile != null
                        && Path.of(configuredPassfile).toAbsolutePath().normalize()
                        .equals(PASSFILE.toAbsolutePath().normalize()),
                "Use the approved local passfile");
        require(Files.isRegularFile(PASSFILE) && Files.isReadable(PASSFILE),
                "Approved local passfile is not readable");
        require(System.getProperty("org.postgresql.pgpassfile") == null,
                "Do not override PGPASSFILE through a JVM property");
        require(System.getenv("PGPASSWORD") == null,
                "Password environment variable is not permitted");
        require(name.matches("auth_email_it_[0-9a-f]{32}"),
                "Invalid generated database name");

        System.out.println("AUTH_IT_DATABASE=" + name);

        try (Connection connection = source("postgres", true).getConnection()) {
            connection.setAutoCommit(false);
            connection.setReadOnly(true);
            try {
                verifyTarget(connection, "postgres", true);
                expectTrue(connection, """
                        SELECT rolsuper OR rolcreatedb
                        FROM pg_catalog.pg_roles WHERE rolname = current_user
                        """, "Role cannot create databases");
                try (var statement = connection.prepareStatement(
                        "SELECT COUNT(*) = 0 FROM pg_catalog.pg_database WHERE datname = ?")) {
                    statement.setString(1, name);
                    try (var result = statement.executeQuery()) {
                        require(result.next(), "Database-existence result is missing");
                        boolean absent = result.getBoolean(1);
                        boolean wasNull = result.wasNull();
                        require(!result.next() && !wasNull && absent,
                                "Generated database already exists");
                    }
                }
            } finally {
                connection.rollback();
            }
        }

        // CREATE DATABASE cannot be executed inside an explicit transaction.
        try (Connection connection = source("postgres", false).getConnection();
             var statement = connection.createStatement()) {
            verifyTarget(connection, "postgres", false);
            statement.execute("""
                    CREATE DATABASE "%s"
                    OWNER postgres TEMPLATE template0 ENCODING 'UTF8'
                    LOCALE_PROVIDER libc LC_COLLATE 'C' LC_CTYPE 'C'
                    """.formatted(name));
            created = true;
        }

        try (Connection connection = source("postgres", true).getConnection()) {
            connection.setAutoCommit(false);
            try {
                verifyTarget(connection, "postgres", true);
                try (var statement = connection.prepareStatement("""
                        SELECT oid, pg_get_userbyid(datdba), datlocprovider,
                               datcollate, datctype, pg_encoding_to_char(encoding)
                        FROM pg_catalog.pg_database WHERE datname = ?
                        """)) {
                    statement.setString(1, name);
                    try (var result = statement.executeQuery()) {
                        require(result.next(), "Created database was not found");
                        databaseOid = result.getLong(1);
                        require("postgres".equals(result.getString(2))
                                        && "c".equals(result.getString(3))
                                        && "C".equals(result.getString(4))
                                        && "C".equals(result.getString(5))
                                        && "UTF8".equals(result.getString(6))
                                        && !result.next(),
                                "Created database identity/configuration differs");
                    }
                }
            } finally {
                connection.rollback();
            }
        }

        DriverManagerDataSource target = source(name, false);
        try (Connection connection = target.getConnection()) {
            verifyTarget(connection, name, false);
            connection.setAutoCommit(false);
            try {
                new ResourceDatabasePopulator(
                        new ClassPathResource("auth-it/users_before_v5.sql"))
                        .populate(connection);
                connection.commit();
            } catch (Exception failure) {
                connection.rollback();
                throw failure;
            }
        }

        Flyway flyway = Flyway.configure()
                .dataSource(target)
                .locations("classpath:db/migration")
                .defaultSchema("public")
                .schemas("public")
                .table("flyway_schema_history")
                .createSchemas(false)
                .baselineVersion("4")
                .baselineOnMigrate(false)
                .target("6")
                .executeInTransaction(true)
                .mixed(false)
                .outOfOrder(false)
                .validateOnMigrate(true)
                .cleanDisabled(true)
                .connectRetries(0)
                .failOnMissingLocations(true)
                .skipDefaultCallbacks(true)
                .callbacks(new Callback[0])
                .load();

        var baseline = flyway.baseline();
        require(baseline.successfullyBaselined
                        && "4".equals(baseline.baselineVersion),
                "Expected a new successful baseline 4");
        var migration = flyway.migrate();
        require(migration.success && migration.migrationsExecuted == 2
                        && "4".equals(migration.initialSchemaVersion)
                        && "6".equals(migration.targetSchemaVersion),
                "Expected only V5 and V6 to migrate");
        var info = flyway.info();
        require(info.current() != null
                        && "6".equals(info.current().getVersion().toString())
                        && info.pending().length == 0
                        && info.applied().length == 3
                        && java.util.Arrays.stream(info.all())
                        .noneMatch(item -> item.getState().isFailed()),
                "Unexpected post-bootstrap migration state");
        var validation = flyway.validateWithResult();
        require(validation.validationSuccessful
                        && validation.errorDetails == null
                        && validation.invalidMigrations.isEmpty(),
                "Flyway validation failed");

        prepared = true;
        System.out.println("AUTH_IT_BOOTSTRAP=PASS baseline4/V5/V6");
    }

    public DataSource dataSource() {
        require(prepared, "Database is not prepared");
        return source(name, false);
    }

    public void finish(boolean suitePassed) throws Exception {
        if (!suitePassed || !prepared) {
            System.out.println("AUTH_IT_DATABASE_RETAINED=" + name
                    + "; createdConfirmed=" + created);
            return;
        }
        require(created && databaseOid > 0,
                "Database ownership was not confirmed");

        try (Connection connection = source("postgres", false).getConnection()) {
            verifyTarget(connection, "postgres", false);
            try (var statement = connection.prepareStatement("""
                    SELECT oid, pg_get_userbyid(datdba)
                    FROM pg_catalog.pg_database WHERE datname = ?
                    """)) {
                statement.setString(1, name);
                try (var result = statement.executeQuery()) {
                    require(result.next()
                                    && result.getLong(1) == databaseOid
                                    && USER.equals(result.getString(2))
                                    && !result.next(),
                            "Cleanup database name/OID/owner differs");
                }
            }
            try (var statement = connection.createStatement()) {
                // No FORCE, IF EXISTS or termination of other sessions.
                statement.execute("DROP DATABASE \"" + name + "\"");
            }
        }
        System.out.println("AUTH_IT_DATABASE_DROPPED=" + name);
    }

    private DriverManagerDataSource source(String database, boolean readOnly) {
        require(database.equals("postgres") || database.equals(name),
                "Unapproved database target");
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setDriverClassName("org.postgresql.Driver");
        source.setUrl("jdbc:postgresql://127.0.0.1:5432/" + database
                + "?sslmode=prefer&connectTimeout=10&currentSchema=public");
        source.setUsername(USER);
        // Intentionally no password property: pgJDBC uses PGPASSFILE.
        Properties properties = new Properties();
        properties.setProperty("options",
                "-c default_transaction_read_only=" + (readOnly ? "on" : "off"));
        source.setConnectionProperties(properties);
        return source;
    }

    private void verifyTarget(Connection connection, String database,
                              boolean readOnly) throws SQLException {
        try (var statement = connection.createStatement();
             var result = statement.executeQuery("""
                     SELECT current_database(), current_user,
                            host(inet_server_addr()), inet_server_port(),
                            current_setting('server_version_num'),
                            current_setting('server_encoding'),
                            current_setting('transaction_read_only')
                     """)) {
            require(result.next()
                            && database.equals(result.getString(1))
                            && USER.equals(result.getString(2))
                            && "127.0.0.1".equals(result.getString(3))
                            && result.getInt(4) == 5432
                            && "180006".equals(result.getString(5))
                            && "UTF8".equals(result.getString(6))
                            && (readOnly ? "on" : "off").equals(result.getString(7))
                            && !result.next(),
                    "Local connection identity differs");
        }
    }

    private void expectTrue(Connection connection, String sql, String message)
            throws SQLException {
        try (var statement = connection.createStatement();
             var result = statement.executeQuery(sql)) {
            require(result.next(), message + ": missing row");
            boolean value = result.getBoolean(1);
            boolean wasNull = result.wasNull();
            require(!result.next() && !wasNull && value, message);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
