package com.backend.module.reporting;

import com.backend.module.reporting.core.repository.QuestionResultRepository;
import com.backend.module.reporting.core.repository.QuestionResultRepository.CriterionMark;
import com.backend.module.reporting.core.repository.QuestionResultRepository.QuestionStat;
import com.backend.support.PostgresTestDatabase;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Runs the reporting native queries through Hibernate on real PostgreSQL (jsonb, FILTER, quoted aliases). */
@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class ReportQueriesPostgresTest {
    private static final UUID EXAM = UUID.fromString("00000000-0000-0000-0000-0000000000e1");
    private static final UUID GRADED = UUID.fromString("00000000-0000-0000-0000-0000000000b1");

    private static final String SCHEMA_AND_DATA = """
            CREATE TABLE exam_schedules (id uuid PRIMARY KEY, exam_id uuid NOT NULL, status varchar(50), ai_report jsonb);
            CREATE TABLE questions (id uuid PRIMARY KEY, content text NOT NULL, topic varchar(255), difficulty_level varchar(50));
            CREATE TABLE assigned_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exam_schedule_id uuid NOT NULL,
                question_id uuid NOT NULL, question_order integer NOT NULL, content_snapshot text NOT NULL);
            CREATE TABLE question_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exam_schedule_id uuid, question_id uuid,
                ai_score numeric(5, 2), ai_feedback text, max_score numeric(5, 2) DEFAULT 10.0, lecturer_score numeric(5, 2),
                lecturer_feedback text, graded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP);
            INSERT INTO questions VALUES
                ('00000000-0000-0000-0000-0000000000f1', 'Q1', 'DI', 'EASY'),
                ('00000000-0000-0000-0000-0000000000f2', 'Q2', 'JPA', 'HARD');
            INSERT INTO exam_schedules VALUES
                ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 'COMPLETED',
                 '{"criteria":[{"name":"Attitude","weight":30,"score":10.0,"assessed":true,"rationale":"Tốt.","improvement":""},
                               {"name":"Soft Skills","weight":70,"score":0,"assessed":false,"rationale":"Chưa đủ dữ liệu.","improvement":"Nói rõ hơn."}]}'),
                ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000e1', 'COMPLETED', NULL),
                ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000e1', 'PENDING', NULL);
            INSERT INTO assigned_questions (exam_schedule_id, question_id, question_order, content_snapshot)
                SELECT s.id, q.id, CASE WHEN q.content = 'Q1' THEN 1 ELSE 2 END, q.content FROM exam_schedules s CROSS JOIN questions q;
            INSERT INTO question_results (exam_schedule_id, question_id, ai_score, lecturer_score) VALUES
                ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 9, NULL),
                ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f2', 4, NULL),
                ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1', 6, 8),
                ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f2', NULL, NULL);
            """;

    @Test
    void questionStatsAndRubricMarksMapThroughHibernateProjections() throws Exception {
        try (PostgresTestDatabase db = new PostgresTestDatabase(); Connection c = db.connect(); Statement s = c.createStatement()) {
            s.execute(SCHEMA_AND_DATA);
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(new DriverManagerDataSource(db.url(), db.username(), db.password()));
            factory.setPackagesToScan("com.backend.module.reporting.core.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            // validate also proves the QuestionResult entity matches the question_results columns
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.default_schema", db.schema()));
            factory.afterPropertiesSet();
            EntityManager em = factory.getObject().createEntityManager();
            try {
                QuestionResultRepository repo = new JpaRepositoryFactory(em).getRepository(QuestionResultRepository.class);

                List<QuestionStat> stats = repo.questionStats(EXAM, new BigDecimal("7.0"));
                // PENDING schedule excluded; lecturer score 8 overrides AI score 6; hardest first
                assertThat(stats).extracting(QuestionStat::getTopic).containsExactly("JPA", "DI");
                assertThat(stats.get(0).getAverageScore()).isEqualByComparingTo("4.00");
                assertThat(stats.get(0).getGradedCount()).isEqualTo(1L);
                assertThat(stats.get(0).getAssignedCount()).isEqualTo(2L);
                assertThat(stats.get(0).getGoodCount()).isZero();
                assertThat(stats.get(1).getAverageScore()).isEqualByComparingTo("8.50");
                assertThat(stats.get(1).getGoodCount()).isEqualTo(2L);
                assertThat(stats.get(1).getQuestionId()).isEqualTo(UUID.fromString("00000000-0000-0000-0000-0000000000f1"));

                List<CriterionMark> marks = repo.criterionMarks(EXAM);
                assertThat(marks).extracting(CriterionMark::getScheduleId).containsOnly(GRADED);
                assertThat(marks).extracting(CriterionMark::getName).containsExactly("Attitude", "Soft Skills");
                assertThat(marks.get(0).getWeight()).isEqualByComparingTo("30");
                assertThat(marks.get(0).getAssessed()).isTrue();
                assertThat(marks.get(1).getAssessed()).isFalse();
                assertThat(marks.get(1).getImprovement()).isEqualTo("Nói rõ hơn.");
            } finally {
                em.close();
                factory.destroy();
            }
        }
    }
}
