package com.backend.schema;

import com.backend.support.LatestSchemaSpringTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class LatestSchemaApiTest extends LatestSchemaSpringTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    private final ObjectMapper json = new ObjectMapper();
    private UUID adminId;
    private UUID lecturerId;
    private UUID studentId;
    private UUID courseId;

    @BeforeEach
    void seed() throws Exception {
        assertThat(jdbc.queryForObject("select current_schema()", String.class)).startsWith("exam_test_");
        jdbc.execute("TRUNCATE users, courses, course_lecturers, questions, exams, exam_schedules, assigned_questions, transcripts, question_results CASCADE");
        adminId = insertUser("admin", "ADMIN");
        lecturerId = insertUser("lecturer", "LECTURER");
        studentId = insertUser("student", "STUDENT");
        courseId = UUID.randomUUID();
        jdbc.update("INSERT INTO courses(id, course_code, course_name) VALUES (?, 'SWD392', 'Design')", courseId);
        mvc.perform(post("/api/admin/courses/" + courseId + "/lecturers").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("lecturerIds", List.of(lecturerId)))))
                .andExpect(status().isOk());
        jdbc.update("INSERT INTO questions(course_id, content, topic, expected_answer) VALUES (?, 'Question?', 'OOP', 'Answer')", courseId);
    }

    @Test
    void userCrudAndLoginReturnNewFieldsWithoutExposingPassword() throws Exception {
        UUID id = createUser("newstudent", "SE100");
        mvc.perform(get("/api/admin/users").param("role", "STUDENT").param("sort", "studentCode,asc")
                .with(user("admin").roles("ADMIN"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.id=='" + id + "')].studentCode").value(org.hamcrest.Matchers.hasItem("SE100")));
        mvc.perform(put("/api/admin/users/" + id).with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"updated@example.com\",\"studentCode\":\"SE101\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.studentCode").value("SE101"))
                .andExpect(jsonPath("$.data.email").value("updated@example.com"));
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newstudent\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.user.studentCode").value("SE101"))
                .andExpect(jsonPath("$.data.user.createdAt").exists())
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(response, "$.data.token");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value("updated@example.com"));
        mvc.perform(put("/api/admin/users/" + id).with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"studentCode\":\"\",\"email\":\"\"}"))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT student_code FROM users WHERE id = ?", String.class, id)).isNull();
        mvc.perform(delete("/api/admin/users/" + id).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/users/" + id).with(user("admin").roles("ADMIN"))).andExpect(status().isNotFound());
    }

    @Test
    void duplicateStudentCodeAndTrimmedUsernameAreRejected() throws Exception {
        createUser("unique", "SE001");
        postUser(payload("second", "SE001")).andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("STUDENT_CODE_EXISTS"));
        postUser(payload("  unique  ", "SE002")).andExpect(status().is4xxClientError());
        UUID other = createUser("other", "SE003");
        mvc.perform(put("/api/admin/users/" + other).with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"studentCode\":\"SE001\"}"))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT student_code FROM users WHERE id = ?", String.class, other)).isEqualTo("SE003");
    }

    @Test
    void invalidUserLengthsEmailAndRoleReturn400() throws Exception {
        Map<String, Object> body = payload("x".repeat(256), "SE001");
        postUser(body).andExpect(status().isBadRequest());
        body = payload("new", "x".repeat(51));
        postUser(body).andExpect(status().isBadRequest());
        body = payload("new", "SE001");
        body.put("email", "not-an-email");
        postUser(body).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/users").param("role", "INVALID").with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_ROLE"));
        mvc.perform(get("/api/admin/users").param("sort", "passwordHash,asc").with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/users/" + studentId).with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\" \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void batchRollbackCoversInvalidLaterEntryNullAndDuplicateCode() throws Exception {
        mvc.perform(post("/api/admin/users/batch").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(List.of(payload("batch1", "B1"), payload("batch2", "B1")))))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE username LIKE 'batch%'", Integer.class)).isZero();
        mvc.perform(post("/api/admin/users/batch").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("[null]"))
                .andExpect(status().isBadRequest());
        Map<String, Object> invalid = payload("batch2", "B2");
        invalid.put("password", "short");
        mvc.perform(post("/api/admin/users/batch").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(List.of(payload("batch1", "B1"), invalid))))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE username LIKE 'batch%'", Integer.class)).isZero();
        mvc.perform(post("/api/admin/users/batch").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("[]")).andExpect(status().isBadRequest());
    }

    @Test
    void assignmentAuditIsRecordedAndRepeatedAssignmentPreservesIt() throws Exception {
        String before = jdbc.queryForObject("SELECT assigned_at::text FROM course_lecturers WHERE course_id = ?", String.class, courseId);
        mvc.perform(post("/api/admin/courses/" + courseId + "/lecturers").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("lecturerIds", List.of(lecturerId, lecturerId)))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.lecturerCount").value(1))
                .andExpect(jsonPath("$.data.lecturerAssignments[0].assignedById").value(adminId.toString()))
                .andExpect(jsonPath("$.data.lecturerAssignments[0].assignedAt").exists());
        assertThat(jdbc.queryForObject("SELECT assigned_at::text FROM course_lecturers WHERE course_id = ?", String.class, courseId)).isEqualTo(before);
        mvc.perform(get("/api/courses").with(user("student").roles("STUDENT"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].lecturers[0].id").value(lecturerId.toString()));
        mvc.perform(get("/api/courses/" + courseId + "/lecturers").with(user("student").roles("STUDENT")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].id").value(lecturerId.toString()));
        mvc.perform(delete("/api/admin/courses/" + courseId + "/lecturers/" + lecturerId).with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM course_lecturers WHERE course_id = ?", Integer.class, courseId)).isZero();
    }

    @Test
    void invalidAssignmentRollsBackEarlierValidAssignmentAndKeepsAudit() throws Exception {
        UUID second = insertUser("secondLecturer", "LECTURER");
        mvc.perform(post("/api/admin/courses/" + courseId + "/lecturers").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("lecturerIds", List.of(second, studentId)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_ROLE"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM course_lecturers WHERE course_id = ?", Integer.class, courseId)).isEqualTo(1);
    }

    @Test
    void courseCreateUpdateDeleteAndLengthValidationWork() throws Exception {
        String response = mvc.perform(post("/api/admin/courses").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"courseCode\":\" prn232 \",\"courseName\":\"Dotnet\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.courseCode").value("PRN232"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.data.id");
        mvc.perform(put("/api/admin/courses/" + id).with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"courseCode\":\"PRN233\",\"courseName\":\"Updated\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/admin/courses").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("courseCode", "X".repeat(51), "courseName", "Name"))))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/admin/courses/" + id).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
    }

    @Test
    void newExamSettingsUseDefaultsSupportUpdatesAndFreezeAfterAssignment() throws Exception {
        UUID exam = createExam();
        mvc.perform(get("/api/exams/" + exam).with(user("lecturer").roles("LECTURER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.exam.maxFollowupsPerMain").value(2))
                .andExpect(jsonPath("$.data.exam.mainAnswerTimeLimitSeconds").value(120))
                .andExpect(jsonPath("$.data.exam.followupAnswerTimeLimitSeconds").value(60));
        mvc.perform(put("/api/lecturer/exams/" + exam).with(user("lecturer").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"maxFollowupsPerMain\":3,\"mainAnswerTimeLimitSeconds\":180,\"followupAnswerTimeLimitSeconds\":90}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.mainAnswerTimeLimitSeconds").value(180));
        mvc.perform(put("/api/lecturer/exams/" + exam).with(user("lecturer").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"mainAnswerTimeLimitSeconds\":0}"))
                .andExpect(status().isBadRequest());
        UUID schedule = addStudent(exam);
        mvc.perform(post("/api/lecturer/schedules/" + schedule + "/assign-questions").with(user("lecturer").roles("LECTURER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalAssigned").value(1));
        mvc.perform(put("/api/lecturer/exams/" + exam).with(user("lecturer").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"mainAnswerTimeLimitSeconds\":200}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("CANNOT_MODIFY_ACTIVE_EXAM"));
    }

    @Test
    void startRecordsActualStartAndScheduleResponsesExposeNewMetadata() throws Exception {
        UUID exam = createExam();
        UUID schedule = addStudent(exam);
        jdbc.update("UPDATE exams SET start_date = now() - interval '1 hour', end_date = now() + interval '1 hour' WHERE id = ?", exam);
        jdbc.update("UPDATE exam_schedules SET scheduled_start_time = now() - interval '1 minute', scheduled_end_time = now() + interval '30 minutes' WHERE id = ?", schedule);
        mvc.perform(post("/api/student/schedules/" + schedule + "/start").with(user("student").roles("STUDENT")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.actualStartTime").exists()).andExpect(jsonPath("$.data.isConnected").value(false));
        jdbc.update("UPDATE exam_schedules SET full_recording_url = ?, graded_by = ?, actual_end_time = now(), final_score = 9, status = 'COMPLETED' WHERE id = ?", "r".repeat(500), lecturerId, schedule);
        mvc.perform(get("/api/student/my-schedules").with(user("student").roles("STUDENT")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].gradedById").value(lecturerId.toString()))
                .andExpect(jsonPath("$.data[0].fullRecordingUrl").value("r".repeat(500)))
                .andExpect(jsonPath("$.data[0].actualEndTime").exists()).andExpect(jsonPath("$.data[0].finalScore").value(9));
    }

    @Test
    void restrictDeletesReturnBusinessErrorsAndRollback() throws Exception {
        UUID exam = createExam();
        UUID schedule = addStudent(exam);
        mvc.perform(post("/api/lecturer/schedules/" + schedule + "/assign-questions").with(user("lecturer").roles("LECTURER"))).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/users/" + studentId).with(user("admin").roles("ADMIN")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("USER_IN_USE"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Integer.class, studentId)).isEqualTo(1);
        mvc.perform(delete("/api/admin/courses/" + courseId).with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("COURSE_IN_USE"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM course_lecturers WHERE course_id = ?", Integer.class, courseId)).isEqualTo(1);
    }

    @Test
    void deletingAuditUserNullsForeignKeysWithoutDeletingAssignment() throws Exception {
        UUID otherAdmin = insertUser("otherAdmin", "ADMIN");
        UUID exam = createExam();
        UUID schedule = addStudent(exam);
        jdbc.update("UPDATE exam_schedules SET graded_by = ? WHERE id = ?", adminId, schedule);
        mvc.perform(delete("/api/admin/users/" + adminId).with(user("otherAdmin").roles("ADMIN"))).andExpect(status().isOk());
        assertThat(otherAdmin).isNotNull();
        assertThat(jdbc.queryForObject("SELECT assigned_by FROM course_lecturers WHERE course_id = ?", UUID.class, courseId)).isNull();
        assertThat(jdbc.queryForObject("SELECT graded_by FROM exam_schedules WHERE id = ?", UUID.class, schedule)).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM course_lecturers WHERE course_id = ?", Integer.class, courseId)).isEqualTo(1);
    }

    @Test
    void concurrentUserCreationRespectsUniqueStudentCode() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Integer> first = executor.submit(() -> { start.await(); return postUser(payload("race1", "RACE")).andReturn().getResponse().getStatus(); });
            Future<Integer> second = executor.submit(() -> { start.await(); return postUser(payload("race2", "RACE")).andReturn().getResponse().getStatus(); });
            start.countDown();
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS))).containsExactlyInAnyOrder(201, 409);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE student_code = 'RACE'", Integer.class)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void adminEndpointsRejectStudentAndUnauthenticatedCallers() throws Exception {
        mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/users").with(user("student").roles("STUDENT"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload("blocked", "B"))))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/courses/" + courseId).with(user("lecturer").roles("LECTURER")))
                .andExpect(status().isForbidden());
    }

    private Map<String, Object> payload(String username, String code) {
        Map<String, Object> result = new HashMap<>();
        result.put("username", username);
        result.put("password", "password123");
        result.put("fullName", "Full Name");
        result.put("role", "STUDENT");
        result.put("studentCode", code);
        result.put("email", "student@example.com");
        return result;
    }

    private ResultActions postUser(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/admin/users").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private UUID createUser(String username, String code) throws Exception {
        String response = postUser(payload(username, code)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.studentCode").value(code)).andExpect(jsonPath("$.data.createdAt").exists())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(response, "$.data.id"));
    }

    private UUID insertUser(String name, String role) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id, username, full_name, password_hash, role) VALUES (?, ?, ?, 'hash', ?)", id, name, name, role);
        return id;
    }

    private UUID createExam() throws Exception {
        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withNano(0);
        String response = mvc.perform(post("/api/lecturer/exams").with(user("lecturer").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "courseId", courseId, "title", "Viva", "startDate", start.toString(), "endDate", start.plusHours(2).toString(),
                        "maxMainQuestions", 1, "maxFollowupQuestions", 2))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(response, "$.data.id"));
    }

    private UUID addStudent(UUID exam) throws Exception {
        OffsetDateTime start = jdbc.queryForObject("SELECT start_date FROM exams WHERE id = ?", (rs, row) -> rs.getObject(1, OffsetDateTime.class), exam);
        String response = mvc.perform(post("/api/lecturer/exams/" + exam + "/schedules").with(user("lecturer").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("students", List.of(Map.of(
                        "studentId", studentId, "scheduledStartTime", start.toString(), "scheduledEndTime", start.plusMinutes(30).toString()))))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(response, "$.data[0].id"));
    }
}
