package com.backend.schema;

import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.exam.core.entity.*;
import com.backend.module.interview.core.entity.Transcript;
import com.backend.module.reporting.core.entity.QuestionResult;
import com.backend.support.LatestSchemaSpringTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class LatestSchemaEntityTest extends LatestSchemaSpringTest {
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;
    private User student;
    private User lecturer;
    private Course course;
    private Exam exam;
    private ExamSchedule schedule;
    private Question question;

    @BeforeEach
    void seed() {
        student = user("student", Role.STUDENT);
        lecturer = user("lecturer", Role.LECTURER);
        course = new Course();
        course.setCourseCode("SWD392");
        course.setCourseName("Design");
        em.persist(course);
        exam = new Exam();
        exam.setCourse(course);
        exam.setCreatedById(lecturer.getId());
        exam.setTitle("Viva");
        exam.setStartDate(OffsetDateTime.now());
        exam.setEndDate(OffsetDateTime.now().plusHours(1));
        exam.setMaxMainQuestions(1);
        em.persist(exam);
        schedule = new ExamSchedule();
        schedule.setExam(exam);
        schedule.setStudentId(student.getId());
        em.persist(schedule);
        question = new Question();
        question.setCourse(course);
        question.setContent("Explain encapsulation");
        em.persist(question);
        em.flush();
    }

    @Test
    void everyExtendedEntityFieldRoundTripsAgainstActualScript() {
        student.setStudentCode("SE123456");
        student.setEmail("student@example.com");
        question.setTopic("OOP");
        question.setExpectedAnswer("Information hiding");
        exam.setMaxFollowupsPerMain(3);
        exam.setMainAnswerTimeLimitSeconds(180);
        exam.setFollowupAnswerTimeLimitSeconds(90);
        schedule.setIsConnected(true);
        schedule.setFullRecordingUrl("r".repeat(500));
        schedule.setGradedById(lecturer.getId());
        OffsetDateTime started = OffsetDateTime.parse("2026-10-01T08:00:00+07:00");
        schedule.setActualStartTime(started);
        schedule.setActualEndTime(started.plusMinutes(20));
        schedule.setFinalScore(new BigDecimal("8.75"));
        CourseLecturer assignment = new CourseLecturer();
        assignment.setId(new CourseLecturerId(course.getId(), lecturer.getId()));
        assignment.setCourse(course);
        assignment.setLecturer(lecturer);
        assignment.setAssignedById(lecturer.getId());
        em.persist(assignment);
        Transcript transcript = transcript();
        transcript.setAudioUrl("a".repeat(500));
        transcript.setTranscriptType("FOLLOWUP");
        transcript.setStreamSessionId("s".repeat(100));
        transcript.setSpeechDurationMs(45000);
        transcript.setLatencyMs(130);
        em.persist(transcript);
        QuestionResult result = result();
        result.setAiScore(new BigDecimal("7.50"));
        result.setAiFeedback("AI feedback");
        result.setLecturerScore(new BigDecimal("8.75"));
        result.setLecturerFeedback("Reviewed");
        em.persist(result);
        em.flush();
        em.clear();

        User reloadedStudent = em.find(User.class, student.getId());
        assertThat(reloadedStudent.getStudentCode()).isEqualTo("SE123456");
        assertThat(reloadedStudent.getEmail()).isEqualTo("student@example.com");
        assertThat(reloadedStudent.getCreatedAt()).isNotNull();
        Question reloadedQuestion = em.find(Question.class, question.getId());
        assertThat(reloadedQuestion.getTopic()).isEqualTo("OOP");
        assertThat(reloadedQuestion.getExpectedAnswer()).isEqualTo("Information hiding");
        Exam reloadedExam = em.find(Exam.class, exam.getId());
        assertThat(reloadedExam.getMaxFollowupsPerMain()).isEqualTo(3);
        assertThat(reloadedExam.getMainAnswerTimeLimitSeconds()).isEqualTo(180);
        assertThat(reloadedExam.getFollowupAnswerTimeLimitSeconds()).isEqualTo(90);
        ExamSchedule reloadedSchedule = em.find(ExamSchedule.class, schedule.getId());
        assertThat(reloadedSchedule.getIsConnected()).isTrue();
        assertThat(reloadedSchedule.getFullRecordingUrl()).hasSize(500);
        assertThat(reloadedSchedule.getGradedById()).isEqualTo(lecturer.getId());
        assertThat(reloadedSchedule.getActualStartTime().toInstant()).isEqualTo(started.toInstant());
        assertThat(reloadedSchedule.getActualEndTime().toInstant()).isEqualTo(started.plusMinutes(20).toInstant());
        assertThat(reloadedSchedule.getFinalScore()).isEqualByComparingTo("8.75");
        CourseLecturer reloadedAssignment = em.find(CourseLecturer.class, assignment.getId());
        assertThat(reloadedAssignment.getAssignedAt()).isNotNull();
        assertThat(reloadedAssignment.getAssignedById()).isEqualTo(lecturer.getId());
        Transcript reloadedTranscript = em.find(Transcript.class, transcript.getId());
        assertThat(reloadedTranscript.getQuestionId()).isEqualTo(question.getId());
        assertThat(reloadedTranscript.getAudioUrl()).hasSize(500);
        assertThat(reloadedTranscript.getTranscriptType()).isEqualTo("FOLLOWUP");
        assertThat(reloadedTranscript.getStreamSessionId()).hasSize(100);
        assertThat(reloadedTranscript.getSpeechDurationMs()).isEqualTo(45000);
        assertThat(reloadedTranscript.getLatencyMs()).isEqualTo(130);
        assertThat(reloadedTranscript.getCreatedAt()).isNotNull();
        QuestionResult reloadedResult = em.find(QuestionResult.class, result.getId());
        assertThat(reloadedResult.getQuestionId()).isEqualTo(question.getId());
        assertThat(reloadedResult.getMaxScore()).isEqualByComparingTo("10.0");
        assertThat(reloadedResult.getLecturerScore()).isEqualByComparingTo("8.75");
        assertThat(reloadedResult.getLecturerFeedback()).isEqualTo("Reviewed");
        assertThat(reloadedResult.getAiScore()).isEqualByComparingTo("7.50");
        assertThat(reloadedResult.getAiFeedback()).isEqualTo("AI feedback");
        assertThat(reloadedResult.getGradedAt()).isNotNull();
    }

    @Test
    void javaDefaultsMatchDatabaseDefaultsAndIdsAreGenerated() {
        Transcript transcript = transcript();
        QuestionResult result = result();
        em.persist(transcript);
        em.persist(result);
        em.flush();
        em.clear();
        assertThat(transcript.getId()).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(em.find(Exam.class, exam.getId()).getMaxFollowupsPerMain()).isEqualTo(2);
        assertThat(em.find(Exam.class, exam.getId()).getMainAnswerTimeLimitSeconds()).isEqualTo(120);
        assertThat(em.find(Exam.class, exam.getId()).getFollowupAnswerTimeLimitSeconds()).isEqualTo(60);
        assertThat(em.find(ExamSchedule.class, schedule.getId()).getStatus()).isEqualTo("PENDING");
        assertThat(em.find(ExamSchedule.class, schedule.getId()).getIsConnected()).isFalse();
        assertThat(em.find(Transcript.class, transcript.getId()).getTranscriptType()).isEqualTo("MAIN");
        assertThat(em.find(QuestionResult.class, result.getId()).getMaxScore()).isEqualByComparingTo("10");
    }

    @Test
    void nullableDatabaseFieldsRemainNullWhenLoaded() {
        jdbc.update("UPDATE exam_schedules SET is_connected = NULL, status = NULL WHERE id = ?", schedule.getId());
        jdbc.update("UPDATE exams SET max_followups_per_main = NULL, main_answer_time_limit_seconds = NULL WHERE id = ?", exam.getId());
        jdbc.update("UPDATE users SET created_at = NULL WHERE id = ?", student.getId());
        em.clear();
        assertThat(em.find(ExamSchedule.class, schedule.getId()).getIsConnected()).isNull();
        assertThat(em.find(ExamSchedule.class, schedule.getId()).getStatus()).isNull();
        assertThat(em.find(Exam.class, exam.getId()).getMaxFollowupsPerMain()).isNull();
        assertThat(em.find(Exam.class, exam.getId()).getMainAnswerTimeLimitSeconds()).isNull();
        assertThat(em.find(User.class, student.getId()).getCreatedAt()).isNull();
    }

    @Test
    void deletingOriginalQuestionNullsTranscriptAndCascadesResults() {
        Transcript transcript = transcript();
        QuestionResult result = result();
        em.persist(transcript);
        em.persist(result);
        em.flush();
        jdbc.update("DELETE FROM questions WHERE id = ?", question.getId());
        em.clear();
        assertThat(em.find(Transcript.class, transcript.getId()).getQuestionId()).isNull();
        assertThat(em.find(QuestionResult.class, result.getId())).isNull();
    }

    @Test
    void deletingParentTranscriptCascadesItsFollowups() {
        Transcript parent = transcript();
        em.persist(parent);
        Transcript child = transcript();
        child.setParentTranscript(parent);
        em.persist(child);
        em.flush();
        jdbc.update("DELETE FROM transcripts WHERE id = ?", parent.getId());
        em.clear();
        assertThat(em.find(Transcript.class, child.getId())).isNull();
    }

    @Test
    void resultSchemaAllowsMultipleResultsForSameQuestion() {
        em.persist(result());
        em.persist(result());
        em.flush();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM question_results WHERE question_id = ?", Integer.class, question.getId())).isEqualTo(2);
    }

    @Test
    void invalidFinalScoreIsRejectedByEntityValidation() {
        schedule.setFinalScore(new BigDecimal("10.01"));
        assertThatThrownBy(em::flush).isInstanceOf(jakarta.validation.ConstraintViolationException.class);
    }

    @Test
    void tooLongAudioUrlIsRejectedBeforePersistence() {
        Transcript transcript = transcript();
        transcript.setAudioUrl("x".repeat(501));
        assertThatThrownBy(() -> { em.persist(transcript); em.flush(); })
                .isInstanceOf(jakarta.validation.ConstraintViolationException.class);
    }

    @Test
    void assignedQuestionPreventsDeletingItsOriginalQuestion() {
        em.persist(AssignedQuestion.builder().examSchedule(schedule).question(question)
                .questionOrder(1).contentSnapshot(question.getContent()).build());
        em.flush();
        assertThatThrownBy(() -> jdbc.update("DELETE FROM questions WHERE id = ?", question.getId()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    private User user(String name, Role role) {
        User user = User.builder().username(name + UUID.randomUUID()).fullName(name).passwordHash("hash").role(role).build();
        em.persist(user);
        return user;
    }

    private Transcript transcript() {
        Transcript transcript = new Transcript();
        transcript.setExamScheduleId(schedule.getId());
        transcript.setQuestionId(question.getId());
        transcript.setRole("STUDENT");
        transcript.setTextContent("An answer");
        return transcript;
    }

    private QuestionResult result() {
        QuestionResult result = new QuestionResult();
        result.setExamScheduleId(schedule.getId());
        result.setQuestionId(question.getId());
        return result;
    }
}
