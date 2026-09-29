package com.backend.module.exam;

import com.backend.support.PostgresTestDatabase;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.sql.*;

import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class ExamMigrationTest {
    @Test
    void baselinesAnExistingUpdatedSchemaWithoutRecreatingData() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect()) {
            script(c, "V1__create_core_tables.sql");
            script(c, "V2__create_exam_schedule_tables.sql");
            script(c, "V3__align_interview_question_references.sql");
            c.createStatement().execute("INSERT INTO courses(course_code, course_name) VALUES ('EXISTING', 'Preserved course')");
            Flyway flyway = flyway(db);
            assertThat(flyway.migrate().migrationsExecuted).isEqualTo(2);
            assertThat(count(c, "SELECT count(*) FROM courses WHERE course_code = 'EXISTING'")).isEqualTo(1);
            assertThat(flyway.migrate().migrationsExecuted).isZero();
        }
    }

    @Test
    void migratesLegacyQuestionReferencesAndPreservesTranscriptAndScore() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect()) {
            legacySchema(c);
            assertThat(flyway(db).migrate().migrationsExecuted).isEqualTo(2);
            assertThat(count(c, "SELECT count(*) FROM assigned_questions WHERE content_snapshot = 'Legacy question'")).isEqualTo(1);
            assertThat(count(c, "SELECT count(*) FROM transcripts t JOIN question_results r ON t.assigned_question_id = r.assigned_question_id WHERE t.text_content = 'Legacy answer' AND r.ai_score = 8.5")).isEqualTo(1);
            assertThat(count(c, "SELECT count(*) FROM transcripts WHERE question_id IS NOT NULL")).isEqualTo(1);
        }
    }

    @Test
    void conflictingLegacyScoresFailWithoutDiscardingData() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect()) {
            legacySchema(c);
            c.createStatement().execute("INSERT INTO question_results(exam_schedule_id, question_id, ai_score) SELECT exam_schedule_id, question_id, 9 FROM question_results");
            assertThatThrownBy(() -> flyway(db).migrate()).isInstanceOf(org.flywaydb.core.api.FlywayException.class);
            assertThat(count(c, "SELECT count(*) FROM question_results")).isEqualTo(2);
            // PostgreSQL rolls the failed V3 migration back, including generated snapshots.
            assertThat(count(c, "SELECT count(*) FROM assigned_questions")).isZero();
        }
    }

    private Flyway flyway(PostgresTestDatabase db) {
        return Flyway.configure().dataSource(db.url(), db.username(), db.password())
                .defaultSchema(db.schema()).baselineOnMigrate(true).baselineVersion("1").target("3")
                .locations("classpath:db/migration").load();
    }

    private void legacySchema(Connection c) throws Exception {
        script(c, "V1__create_core_tables.sql");
        script(c, "V2__create_exam_schedule_tables.sql");
        c.createStatement().execute("DROP TABLE assigned_questions");
        c.createStatement().execute("""
                CREATE TABLE transcripts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    exam_schedule_id UUID REFERENCES exam_schedules(id),
                    question_id UUID REFERENCES questions(id), text_content TEXT);
                CREATE TABLE question_results (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    exam_schedule_id UUID REFERENCES exam_schedules(id),
                    question_id UUID REFERENCES questions(id), ai_score DECIMAL(5,2));
                INSERT INTO users(username, password_hash, full_name, role) VALUES ('legacy', 'hash', 'Legacy Student', 'STUDENT');
                INSERT INTO courses(course_code, course_name) VALUES ('OLD', 'Legacy course');
                INSERT INTO questions(course_id, content) SELECT id, 'Legacy question' FROM courses;
                INSERT INTO exams(course_id, title, start_date, end_date, max_main_questions, max_followup_questions)
                    SELECT id, 'Legacy exam', now(), now() + interval '1 day', 1, 0 FROM courses;
                INSERT INTO exam_schedules(exam_id, student_id, status) SELECT e.id, u.id, 'COMPLETED' FROM exams e CROSS JOIN users u;
                INSERT INTO transcripts(exam_schedule_id, question_id, text_content) SELECT s.id, q.id, 'Legacy answer' FROM exam_schedules s CROSS JOIN questions q;
                INSERT INTO question_results(exam_schedule_id, question_id, ai_score) SELECT s.id, q.id, 8.5 FROM exam_schedules s CROSS JOIN questions q;
                """);
    }

    private void script(Connection c, String name) throws Exception {
        String sql = new ClassPathResource("db/migration/" + name).getContentAsString(StandardCharsets.UTF_8);
        try (Statement statement = c.createStatement()) { statement.execute(sql); }
    }

    private int count(Connection c, String sql) throws SQLException {
        try (Statement statement = c.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }
}
