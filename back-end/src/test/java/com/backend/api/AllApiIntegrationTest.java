package com.backend.api;

import com.backend.module.auth.core.entity.User;
import com.backend.module.auth.core.enums.Role;
import com.backend.module.auth.core.repository.UserRepository;
import com.backend.support.EntitySchemaApiTestSupport;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real JWT -> filters -> MVC -> services -> repositories -> isolated PostgreSQL. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class AllApiIntegrationTest extends EntitySchemaApiTestSupport {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mappings;
    private final ObjectMapper json = new ObjectMapper();
    private UUID ownerId, studentId, otherStudentId;
    private String admin, owner, outsider, student, otherStudent;
    private static final String PASSWORD = "Api-test-password-2026";
    private static final String ID = "11111111-1111-4111-8111-111111111111";

    // Both start aliases count as separate HTTP routes. Inventory test detects new untested routes.
    private static final List<String> ROUTES = List.of(
            "POST /api/auth/login", "GET /api/auth/me",
            "GET /api/admin/users", "POST /api/admin/users", "POST /api/admin/users/batch",
            "PUT /api/admin/users/{id}", "DELETE /api/admin/users/{id}",
            "GET /api/courses", "POST /api/admin/courses", "PUT /api/admin/courses/{id}",
            "DELETE /api/admin/courses/{id}", "GET /api/courses/{id}/lecturers",
            "POST /api/admin/courses/{id}/lecturers", "DELETE /api/admin/courses/{id}/lecturers/{lecturerId}",
            "POST /api/lecturer/exams", "GET /api/exams", "GET /api/exams/{id}",
            "PUT /api/lecturer/exams/{id}", "DELETE /api/lecturer/exams/{id}",
            "GET /api/lecturer/students", "POST /api/lecturer/exams/{examId}/schedules",
            "GET /api/exams/{examId}/schedules", "PUT /api/lecturer/schedules/{scheduleId}",
            "DELETE /api/lecturer/schedules/{scheduleId}", "GET /api/student/my-schedules",
            "POST /api/lecturer/schedules/{scheduleId}/assign-questions",
            "GET /api/schedules/{scheduleId}/assigned-questions",
            "POST /api/student/schedules/{scheduleId}/start", "POST /api/lecturer/schedules/{scheduleId}/start",
            "GET /api/questions", "GET /api/questions/{id}", "POST /api/questions",
            "POST /api/questions/batch", "PUT /api/questions/{id}", "DELETE /api/questions/{id}");

    @BeforeEach
    void fixtures() throws Exception {
        assertThat(jdbc.queryForObject("select current_schema()", String.class)).startsWith("exam_test_");
        jdbc.execute("TRUNCATE users, courses, course_lecturers, questions, exams, exam_schedules, assigned_questions, transcripts, question_results CASCADE");
        seed("admin", Role.ADMIN);
        ownerId = seed("owner", Role.LECTURER);
        seed("outsider", Role.LECTURER);
        studentId = seed("student", Role.STUDENT);
        otherStudentId = seed("otherstudent", Role.STUDENT);
        admin = login("admin"); owner = login("owner"); outsider = login("outsider");
        student = login("student"); otherStudent = login("otherstudent");
    }

    @Test
    void inventoryCoversAllApplicationRestRoutes() {
        Set<String> actual = new TreeSet<>();
        mappings.getHandlerMethods().forEach((mapping, handler) -> {
            if (handler.getBeanType().getPackageName().startsWith("com.backend.module")) {
                mapping.getMethodsCondition().getMethods().forEach(method ->
                        mapping.getPatternValues().forEach(path -> actual.add(method + " " + path)));
            }
        });
        assertThat(actual).containsExactlyInAnyOrderElementsOf(ROUTES);
    }

    @Test
    void everyProtectedRouteRejectsMissingAndInvalidJwt() throws Exception {
        for (String route : ROUTES) {
            if (route.equals("POST /api/auth/login")) continue;
            String[] parts = route.split(" ", 2);
            String path = parts[1].replaceAll("\\{[^}]+}", ID);
            mvc.perform(request(HttpMethod.valueOf(parts[0]), path)).andExpect(status().isUnauthorized());
            mvc.perform(request(HttpMethod.valueOf(parts[0]), path).header("Authorization", "Bearer invalid.jwt.token"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void studentCannotAccessManagementRoutesAndLecturerCannotUseAdminOrStudentPrefixes() throws Exception {
        for (String route : ROUTES) {
            String[] parts = route.split(" ", 2);
            String path = parts[1].replaceAll("\\{[^}]+}", ID);
            if (path.startsWith("/api/admin/") || path.startsWith("/api/lecturer/")
                    || path.startsWith("/api/questions") || path.startsWith("/api/exams") || path.startsWith("/api/schedules/")) {
                call(parts[0], path, student, null).andExpect(status().isForbidden());
            }
            if (path.startsWith("/api/admin/") || path.startsWith("/api/student/")) {
                call(parts[0], path, owner, null).andExpect(status().isForbidden());
            }
        }
    }

    @Test
    void loginMeAndInvalidCredentialsUseRealPasswordAndToken() throws Exception {
        call("GET", "/api/auth/me", owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(ownerId.toString()))
                .andExpect(jsonPath("$.data.role").value("LECTURER"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("username", "owner", "password", "wrong"))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.validationErrors.username").exists());
    }

    @Test
    void adminUserCrudAndBatchRollback() throws Exception {
        String id = id(call("POST", "/api/admin/users", admin, userBody("newstudent")), 201);
        call("GET", "/api/admin/users?role=STUDENT&page=0&size=10&sort=fullName,asc", admin, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(3));
        call("PUT", "/api/admin/users/" + id, admin, Map.of("fullName", "Updated", "email", "updated@example.com"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.fullName").value("Updated"));
        call("POST", "/api/admin/users/batch", admin, List.of(userBody("batchA"), userBody("batchB")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.length()").value(2));
        call("POST", "/api/admin/users/batch", admin, List.of(userBody("rolledBack"), userBody("batchA")))
                .andExpect(status().isConflict());
        assertThat(users.existsByUsername("rolledBack")).isFalse();
        call("DELETE", "/api/admin/users/" + id, admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.data").doesNotExist());
        call("DELETE", "/api/admin/users/" + id, admin, null).andExpect(status().isNotFound());
    }

    @Test
    void courseCrudAndLecturerAssignment() throws Exception {
        String course = course();
        call("GET", "/api/courses", student, null).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].lecturerCount").value(1));
        call("GET", "/api/courses/" + course + "/lecturers", owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(ownerId.toString()));
        call("PUT", "/api/admin/courses/" + course, admin, Map.of("courseCode", " SWD393 ", "courseName", "Updated"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.courseCode").value("SWD393"));
        call("POST", "/api/admin/courses/" + course + "/lecturers", admin, Map.of("lecturerIds", List.of(studentId.toString())))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_ROLE"));
        call("DELETE", "/api/admin/courses/" + course + "/lecturers/" + ownerId, admin, null).andExpect(status().isOk());
        call("DELETE", "/api/admin/courses/" + course, admin, null).andExpect(status().isOk());
        call("GET", "/api/courses/" + course + "/lecturers", owner, null).andExpect(status().isNotFound());
    }

    @Test
    void questionCrudBatchAndSearch() throws Exception {
        String course = course();
        String question = id(call("POST", "/api/questions", owner, Map.of("courseId", course, "content", "Dependency injection?", "difficultyLevel", "EASY", "topic", "OOP")), 201);
        call("GET", "/api/questions/" + question, owner, null).andExpect(status().isOk()).andExpect(jsonPath("$.data.content").value("Dependency injection?"));
        call("GET", "/api/questions?courseId=" + course + "&difficulty=EASY&topic=OOP&query=Dependency", owner, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1));
        call("PUT", "/api/questions/" + question, owner, Map.of("content", "Updated question", "expectedAnswer", "Updated answer"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.expectedAnswer").value("Updated answer"));
        call("POST", "/api/questions/batch", owner, Map.of("courseId", course, "questions", List.of(Map.of("content", "Q2"), Map.of("content", "Q3"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.length()").value(2));
        call("DELETE", "/api/questions/" + question, owner, null).andExpect(status().isOk());
        call("GET", "/api/questions/" + question, owner, null).andExpect(status().isNotFound());
    }

    @Test
    void questionListingWorksWithNoOptionalFilters() throws Exception {
        String course = course();
        id(call("POST", "/api/questions", owner, Map.of("courseId", course, "content", "Q")), 201);
        call("GET", "/api/questions", owner, null).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void nullQuestionBatchEntryIsBadRequestNotServerError() throws Exception {
        String course = course();
        // Bean validation must reject null elements before service dereferences them.
        call("POST", "/api/questions/batch", owner, Map.of("courseId", course, "questions", Collections.singletonList(null)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
        assertThat(jdbc.queryForObject("select count(*) from questions", Integer.class)).isZero();
    }

    @Test
    void studentLookupSupportsCodeNameEmailAndNeverReturnsLecturers() throws Exception {
        call("GET", "/api/lecturer/students?query=CODE-student", owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1)).andExpect(jsonPath("$.data[0].id").value(studentId.toString()));
        call("GET", "/api/lecturer/students?query=student%40example.com", owner, null).andExpect(status().isOk());
        call("GET", "/api/lecturer/students?query=owner", owner, null).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        call("GET", "/api/lecturer/students", admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void examScheduleAndAssignmentLifecyclePreservesSnapshotAndPermissions() throws Exception {
        String course = course();
        String question = id(call("POST", "/api/questions", owner, Map.of("courseId", course, "content", "Original snapshot")), 201);
        String exam = exam(course);
        call("GET", "/api/exams?page=0&size=10&sort=startDate,desc", owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page.totalElements").value(1));
        call("GET", "/api/exams/" + exam, outsider, null).andExpect(status().isForbidden());
        call("PUT", "/api/lecturer/exams/" + exam, outsider, Map.of("title", "Forbidden")).andExpect(status().isForbidden());
        call("PUT", "/api/lecturer/exams/" + exam, admin, Map.of("title", "Admin updated"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.title").value("Admin updated"));
        Map<String, Object> times = slot(studentId);
        String schedule = JsonPath.read(call("POST", "/api/lecturer/exams/" + exam + "/schedules", owner, Map.of("students", List.of(times)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.data[0].id");
        call("GET", "/api/exams/" + exam, owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exam.totalStudents").value(1))
                .andExpect(jsonPath("$.data.schedules[0].id").value(schedule));
        call("GET", "/api/exams/" + exam + "/schedules", owner, null).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].status").value("PENDING"));
        call("GET", "/api/student/my-schedules", student, null).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].id").value(schedule));
        call("GET", "/api/student/my-schedules", otherStudent, null).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        call("PUT", "/api/lecturer/schedules/" + schedule, owner, Map.of("scheduledStartTime", times.get("scheduledStartTime"), "scheduledEndTime", times.get("scheduledEndTime"))).andExpect(status().isOk());
        call("POST", "/api/lecturer/schedules/" + schedule + "/assign-questions", owner, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalAssigned").value(1));
        call("PUT", "/api/questions/" + question, owner, Map.of("content", "Changed source")).andExpect(status().isOk());
        call("GET", "/api/schedules/" + schedule + "/assigned-questions", owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].contentSnapshot").value("Original snapshot"));
        call("POST", "/api/lecturer/schedules/" + schedule + "/assign-questions", owner, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("QUESTIONS_ALREADY_ASSIGNED"));
        call("PUT", "/api/lecturer/exams/" + exam, owner, Map.of("maxMainQuestions", 2))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("CANNOT_MODIFY_ACTIVE_EXAM"));
        call("DELETE", "/api/lecturer/schedules/" + schedule, owner, null).andExpect(status().isOk());
        call("DELETE", "/api/lecturer/exams/" + exam, owner, null).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from assigned_questions", Integer.class)).isZero();
    }

    @Test
    void bothStartRoutesEnforceTimeAndOwnershipThenPersistInProgress() throws Exception {
        String course = course();
        id(call("POST", "/api/questions", owner, Map.of("courseId", course, "content", "Q")), 201);
        String exam = exam(course);
        String response = call("POST", "/api/lecturer/exams/" + exam + "/schedules", owner,
                Map.of("students", List.of(slot(studentId), slot(otherStudentId))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String first = JsonPath.read(response, "$.data[0].id");
        String second = JsonPath.read(response, "$.data[1].id");
        call("POST", "/api/student/schedules/" + first + "/start", otherStudent, null).andExpect(status().isForbidden());
        call("POST", "/api/student/schedules/" + first + "/start", student, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("SCHEDULE_NOT_OPEN"));
        jdbc.update("update exams set start_date = now() - interval '1 hour', end_date = now() + interval '1 hour' where id = ?", UUID.fromString(exam));
        jdbc.update("update exam_schedules set scheduled_start_time = now() - interval '5 minutes', scheduled_end_time = now() + interval '30 minutes' where exam_id = ?", UUID.fromString(exam));
        call("POST", "/api/student/schedules/" + first + "/start", student, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS")).andExpect(jsonPath("$.data.actualStartTime").exists());
        call("POST", "/api/lecturer/schedules/" + second + "/start", owner, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
        call("POST", "/api/student/schedules/" + first + "/start", student, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("SCHEDULE_NOT_PENDING"));
        call("DELETE", "/api/lecturer/exams/" + exam, owner, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("EXAM_HAS_ACTIVE_SCHEDULES"));
    }

    @Test
    void invalidEnrollmentIsAtomicAndMalformedParametersReturn400() throws Exception {
        String exam = exam(course());
        call("POST", "/api/lecturer/exams/" + exam + "/schedules", owner,
                Map.of("students", List.of(slot(studentId), slot(UUID.randomUUID()))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.error").value("STUDENT_NOT_FOUND"));
        assertThat(jdbc.queryForObject("select count(*) from exam_schedules", Integer.class)).isZero();
        call("POST", "/api/lecturer/exams/" + exam + "/schedules", owner,
                Map.of("students", List.of(slot(studentId), slot(studentId))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("STUDENT_ALREADY_SCHEDULED"));
        call("GET", "/api/exams/not-a-uuid", owner, null).andExpect(status().isBadRequest());
        call("GET", "/api/exams?sort=createdBy.passwordHash,asc", owner, null).andExpect(status().isBadRequest());
        call("GET", "/api/admin/users?role=INVALID", admin, null).andExpect(status().isBadRequest());
    }

    @Test
    void insufficientQuestionPoolRollsBackStartWithoutChangingStatus() throws Exception {
        String exam = exam(course()); // deliberately empty question bank
        String schedule = JsonPath.read(call("POST", "/api/lecturer/exams/" + exam + "/schedules", owner,
                Map.of("students", List.of(slot(studentId))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.data[0].id");
        jdbc.update("update exams set start_date = now() - interval '1 hour', end_date = now() + interval '1 hour' where id = ?", UUID.fromString(exam));
        jdbc.update("update exam_schedules set scheduled_start_time = now() - interval '5 minutes', scheduled_end_time = now() + interval '30 minutes' where id = ?", UUID.fromString(schedule));
        call("POST", "/api/student/schedules/" + schedule + "/start", student, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("NOT_ENOUGH_QUESTIONS"));
        assertThat(jdbc.queryForObject("select status from exam_schedules where id = ?", String.class, UUID.fromString(schedule))).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("select count(*) from assigned_questions", Integer.class)).isZero();
    }

    private UUID seed(String name, Role role) {
        return users.saveAndFlush(User.builder().username(name).fullName(name).role(role)
                .passwordHash(passwords.encode(PASSWORD)).email(name + "@example.com")
                .studentCode(role == Role.STUDENT ? "CODE-" + name : null).build()).getId();
    }
    private String login(String name) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("username", name, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.token");
    }
    private ResultActions call(String method, String path, String token, Object body) throws Exception {
        MockHttpServletRequestBuilder request = request(HttpMethod.valueOf(method), path).header("Authorization", "Bearer " + token);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return mvc.perform(request);
    }
    private String id(ResultActions result, int statusCode) throws Exception {
        return JsonPath.read(result.andExpect(status().is(statusCode)).andReturn().getResponse().getContentAsString(), "$.data.id");
    }
    private Map<String, Object> userBody(String name) {
        return Map.of("username", name, "password", PASSWORD, "fullName", name, "role", "STUDENT");
    }
    private String course() throws Exception {
        String id = id(call("POST", "/api/admin/courses", admin, Map.of("courseCode", "SWD392", "courseName", "Design")), 201);
        call("POST", "/api/admin/courses/" + id + "/lecturers", admin, Map.of("lecturerIds", List.of(ownerId.toString())))
                .andExpect(status().isOk());
        return id;
    }
    private String exam(String course) throws Exception {
        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withHour(8).withMinute(0).withSecond(0).withNano(0);
        return id(call("POST", "/api/lecturer/exams", owner, Map.of("courseId", course, "title", "Viva", "startDate", start.toString(),
                "endDate", start.plusHours(4).toString(), "maxMainQuestions", 1, "maxFollowupQuestions", 2)), 201);
    }
    private Map<String, Object> slot(UUID userId) {
        OffsetDateTime start = OffsetDateTime.now().plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
        return Map.of("studentId", userId.toString(), "scheduledStartTime", start.toString(), "scheduledEndTime", start.plusMinutes(30).toString());
    }
}
