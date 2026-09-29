package com.backend.schema;

import com.backend.support.LatestSchemaFixture;
import com.backend.support.PostgresTestDatabase;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import java.nio.charset.StandardCharsets;

import java.sql.*;
import java.util.*;

import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class LatestSchemaMigrationTest {
    @Test
    void emptyDatabaseBaselineMatchesLatestScriptColumnsKeysAndDeleteActions() throws Exception {
        try (PostgresTestDatabase expected = new PostgresTestDatabase(); PostgresTestDatabase actual = new PostgresTestDatabase()) {
            LatestSchemaFixture.create(expected);
            assertThat(flyway(actual, null).migrate().migrationsExecuted).isEqualTo(1);
            assertSchemasMatch(expected, actual);
            assertThat(flyway(actual, null).migrate().migrationsExecuted).isZero();
        }
    }

    @Test
    void alreadyProvisionedLatestDatabaseIsBaselinedWithoutRunningObsoleteMigrations() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect()) {
            LatestSchemaFixture.create(db);
            c.createStatement().execute("INSERT INTO question_results(ai_score) VALUES (8), (9)");
            Flyway flyway = Flyway.configure().dataSource(db.url(), db.username(), db.password()).defaultSchema(db.schema())
                    .baselineOnMigrate(true).baselineVersion("4").locations("classpath:db/migration").load();
            assertThat(flyway.migrate().migrationsExecuted).isZero();
            assertThat(query(c, "SELECT count(*)::text FROM question_results")).containsExactly("2");
            assertThat(query(c, "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'assigned_question_id'")).isEmpty();
        }
    }

    @Test
    void v3UpgradePreservesQuestionReferencesScoresTranscriptsAndSnapshots() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); PostgresTestDatabase expected = new PostgresTestDatabase(); Connection c = db.connect()) {
            flyway(db, "3").migrate();
            oldData(c);
            assertThat(flyway(db, null).migrate().migrationsExecuted).isEqualTo(1);
            assertThat(query(c, "SELECT count(*)::text FROM transcripts t JOIN question_results r ON t.question_id = r.question_id WHERE t.text_content = 'Answer' AND r.ai_score = 8.5")).containsExactly("1");
            assertThat(query(c, "SELECT content_snapshot FROM assigned_questions")).containsExactly("Original snapshot");
            assertThat(query(c, "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'assigned_question_id'")).isEmpty();
            c.createStatement().execute("INSERT INTO question_results(exam_schedule_id, question_id, ai_score) SELECT exam_schedule_id, question_id, 9 FROM question_results");
            assertThat(query(c, "SELECT count(*)::text FROM question_results")).containsExactly("2");
            LatestSchemaFixture.create(expected);
            assertSchemasMatch(expected, db);
        }
    }

    @Test
    void conflictingLegacyReferencesAbortUpgradeAtomically() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect()) {
            flyway(db, "3").migrate();
            oldData(c);
            c.createStatement().execute("ALTER TABLE transcripts ADD COLUMN question_id UUID");
            c.createStatement().execute("INSERT INTO questions(content) VALUES ('Other question')");
            c.createStatement().execute("UPDATE transcripts SET question_id = (SELECT id FROM questions WHERE content = 'Other question')");
            assertThatThrownBy(() -> flyway(db, null).migrate()).isInstanceOf(FlywayException.class);
            assertThat(query(c, "SELECT text_content FROM transcripts")).containsExactly("Answer");
            assertThat(query(c, "SELECT count(*)::text FROM transcripts WHERE assigned_question_id IS NOT NULL")).containsExactly("1");
            assertThat(query(c, "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'student_code'")).isEmpty();
        }
    }

    @Test
    void invalidHistoricalFinalScoreFailsWithoutClampingOrDiscardingIt() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect()) {
            flyway(db, "3").migrate();
            oldData(c);
            c.createStatement().execute("UPDATE exam_schedules SET final_score = 11");
            assertThatThrownBy(() -> flyway(db, null).migrate()).isInstanceOf(FlywayException.class);
            assertThat(query(c, "SELECT final_score::text FROM exam_schedules")).containsExactly("11.00");
            assertThat(query(c, "SELECT count(*)::text FROM transcripts WHERE assigned_question_id IS NOT NULL")).containsExactly("1");
        }
    }

    private Flyway flyway(PostgresTestDatabase db, String target) {
        var config = Flyway.configure().dataSource(db.url(), db.username(), db.password())
                .defaultSchema(db.schema()).locations("classpath:db/migration");
        if (target != null) {
            // Model an existing V1 deployment. On an EMPTY database Flyway selects the
            // latest baseline migration even when a lower version target is requested.
            try (Connection c = db.connect(); Statement statement = c.createStatement()) {
                statement.execute(new ClassPathResource("db/migration/V1__create_core_tables.sql")
                        .getContentAsString(StandardCharsets.UTF_8));
            } catch (Exception ex) {
                throw new IllegalStateException(ex);
            }
            config.baselineOnMigrate(true).baselineVersion("1").target(target);
        }
        return config.load();
    }

    private void assertSchemasMatch(PostgresTestDatabase expected, PostgresTestDatabase actual) throws Exception {
        try (Connection left = expected.connect(); Connection right = actual.connect()) {
            String columns = """
                    SELECT concat_ws('|', table_name, column_name, udt_name, is_nullable,
                        character_maximum_length, numeric_precision, numeric_scale, datetime_precision)
                    FROM information_schema.columns WHERE table_schema = current_schema()
                        AND table_name <> 'flyway_schema_history' ORDER BY table_name, column_name
                    """;
            assertThat(query(right, columns)).containsExactlyElementsOf(query(left, columns));
            String foreignKeys = """
                    SELECT concat_ws('|', t.relname,
                        (SELECT string_agg(a.attname, ',' ORDER BY u.n) FROM unnest(c.conkey) WITH ORDINALITY u(num,n)
                         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.num),
                        referenced.relname, c.confdeltype)
                    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_namespace s ON s.oid = t.relnamespace JOIN pg_class referenced ON referenced.oid = c.confrelid
                    WHERE s.nspname = current_schema() AND c.contype = 'f' ORDER BY 1
                    """;
            assertThat(query(right, foreignKeys)).containsExactlyElementsOf(query(left, foreignKeys));
            String uniqueKeys = """
                    SELECT DISTINCT concat_ws('|', t.relname,
                        (SELECT string_agg(a.attname, ',' ORDER BY u.n) FROM unnest(i.indkey) WITH ORDINALITY u(num,n)
                         JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = u.num))
                    FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid JOIN pg_namespace s ON s.oid = t.relnamespace
                    WHERE s.nspname = current_schema() AND i.indisunique AND t.relname <> 'flyway_schema_history' ORDER BY 1
                    """;
            assertThat(query(right, uniqueKeys)).containsExactlyElementsOf(query(left, uniqueKeys));
        }
    }

    private List<String> query(Connection c, String sql) throws SQLException {
        try (Statement statement = c.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            List<String> rows = new ArrayList<>();
            while (result.next()) rows.add(result.getString(1));
            return rows;
        }
    }

    private void oldData(Connection c) throws SQLException {
        c.createStatement().execute("""
                INSERT INTO questions(content) VALUES ('Original question');
                INSERT INTO exams(title, start_date, end_date) VALUES ('Old exam', now(), now() + interval '1 day');
                INSERT INTO exam_schedules(exam_id, status, final_score) SELECT id, 'COMPLETED', 8.5 FROM exams;
                INSERT INTO assigned_questions(exam_schedule_id, question_id, question_order, content_snapshot)
                    SELECT s.id, q.id, 1, 'Original snapshot' FROM exam_schedules s CROSS JOIN questions q;
                INSERT INTO transcripts(exam_schedule_id, assigned_question_id, role, text_content)
                    SELECT exam_schedule_id, id, 'STUDENT', 'Answer' FROM assigned_questions;
                INSERT INTO question_results(exam_schedule_id, assigned_question_id, ai_score)
                    SELECT exam_schedule_id, id, 8.5 FROM assigned_questions;
                """);
    }
}
