package com.backend.module.exam;

import com.backend.module.exam.api.dto.*;
import com.backend.module.exam.api.service.*;
import com.backend.shared.exception.AppException;
import com.backend.support.PostgresSpringTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

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
class ExamModuleIntegrationTest extends PostgresSpringTest {
    @Autowired ExamService exams;
    @Autowired ExamScheduleService schedules;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired PasswordEncoder passwordEncoder;

    private UUID courseId;
    private UUID studentId;
    private UUID student2Id;
    private UUID ownerId;

    @BeforeEach
    void fixtures() {
        jdbc.execute("TRUNCATE users, courses, course_lecturers, questions, exams, exam_schedules, assigned_questions, transcripts, question_results CASCADE");
        ownerId = addUser("owner", "LECTURER");
        UUID peer = addUser("peer", "LECTURER");
        addUser("stranger", "LECTURER");
        addUser("admin", "ADMIN");
        studentId = addUser("student", "STUDENT");
        student2Id = addUser("student2", "STUDENT");
        courseId = UUID.randomUUID();
        jdbc.update("INSERT INTO courses(id, course_code, course_name) VALUES (?, 'SWD392', 'Software Design')", courseId);
        jdbc.update("INSERT INTO course_lecturers(course_id, lecturer_id) VALUES (?, ?), (?, ?)", courseId, ownerId, courseId, peer);
        for (int i = 1; i <= 8; i++) {
            jdbc.update("INSERT INTO questions(id, course_id, content, difficulty_level) VALUES (?, ?, ?, 'MEDIUM')",
                    UUID.randomUUID(), courseId, "Question " + i);
        }
        authenticate("owner", "LECTURER");
    }

    @AfterEach
    void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test
    void createAndListRespectCourseAccessAndOwnership() {
        ExamDto exam = createExam(3);
        assertThat(exam.getCreatedBy().getId()).isEqualTo(ownerId);
        assertThat(exam.getTotalStudents()).isZero();
        authenticate("peer", "LECTURER");
        assertThat(exams.getExams(PageRequest.of(0, 10)).getContent()).extracting(ExamDto::getId).containsExactly(exam.getId());
        assertThat(exams.getExamDetail(exam.getId()).getExam().getCourseCode()).isEqualTo("SWD392");
        error("NOT_EXAM_OWNER", () -> exams.updateExam(exam.getId(), UpdateExamRequest.builder().title("Changed").build()));
        authenticate("stranger", "LECTURER");
        assertThat(exams.getExams(PageRequest.of(0, 10))).isEmpty();
        error("NOT_COURSE_LECTURER", () -> exams.getExamDetail(exam.getId()));
        error("NOT_COURSE_LECTURER", () -> schedules.getSchedulesByExamId(exam.getId()));
        error("NOT_COURSE_LECTURER", () -> createExam(3));
        authenticate("admin", "ADMIN");
        assertThat(exams.updateExam(exam.getId(), UpdateExamRequest.builder().title("Admin update").build()).getTitle())
                .isEqualTo("Admin update");
        assertThat(createExam(2).getCreatedBy().getRole()).isEqualTo("ADMIN");
    }

    @Test
    void creationAndPartialUpdateValidateDatesLimitsAndTitle() {
        CreateExamRequest request = request(3);
        request.setEndDate(request.getStartDate());
        error("INVALID_DATE_RANGE", () -> exams.createExam(request));
        request.setStartDate(OffsetDateTime.now().minusDays(1));
        error("START_DATE_IN_PAST", () -> exams.createExam(request));
        request.setStartDate(OffsetDateTime.now().plusDays(1));
        request.setEndDate(OffsetDateTime.now().plusDays(2));
        request.setMaxMainQuestions(0);
        error("VALIDATION_FAILED", () -> exams.createExam(request));
        ExamDto exam = createExam(3);
        error("INVALID_DATE_RANGE", () -> exams.updateExam(exam.getId(), UpdateExamRequest.builder()
                .endDate(exam.getStartDate()).build()));
        error("VALIDATION_FAILED", () -> exams.updateExam(exam.getId(), UpdateExamRequest.builder().title("  ").build()));
        assertThat(exams.getExamById(exam.getId()).getTitle()).isEqualTo("Oral exam");
        error("VALIDATION_FAILED", () -> exams.getExams(PageRequest.of(0, 10, Sort.by("createdBy.passwordHash"))));
    }

    @Test
    void studentBatchIsAtomicAndRejectsDuplicatesAndNonStudents() {
        ExamDto exam = createExam(3);
        AddStudentsRequest.StudentScheduleEntry valid = entry(exam, studentId);
        AddStudentsRequest.StudentScheduleEntry invalid = entry(exam, UUID.randomUUID());
        error("STUDENT_NOT_FOUND", () -> schedules.addStudentsToExam(exam.getId(), batch(valid, invalid)));
        assertThat(schedules.getSchedulesByExamId(exam.getId())).isEmpty();
        error("STUDENT_ALREADY_SCHEDULED", () -> schedules.addStudentsToExam(exam.getId(), batch(valid, valid)));
        error("NOT_A_STUDENT", () -> schedules.addStudentsToExam(exam.getId(), batch(entry(exam, ownerId))));
        schedules.addStudentsToExam(exam.getId(), batch(valid));
        error("STUDENT_ALREADY_SCHEDULED", () -> schedules.addStudentsToExam(exam.getId(), batch(valid)));
        assertThat(exams.getExamDetail(exam.getId()).getExam().getPendingStudents()).isEqualTo(1);
    }

    @Test
    void scheduleAndExamUpdatesKeepAllTimeWindowsConsistent() {
        ExamDto exam = createExam(3);
        AddStudentsRequest.StudentScheduleEntry outside = entry(exam, studentId);
        outside.setScheduledEndTime(exam.getEndDate().plusMinutes(1));
        error("SCHEDULE_TIME_OUT_OF_RANGE", () -> schedules.addStudentsToExam(exam.getId(), batch(outside)));
        ExamScheduleDto schedule = add(exam, studentId);
        error("INVALID_SCHEDULE_TIME", () -> schedules.updateSchedule(schedule.getId(), UpdateScheduleRequest.builder()
                .scheduledStartTime(exam.getStartDate()).scheduledEndTime(exam.getStartDate()).build()));
        error("SCHEDULE_TIME_OUT_OF_RANGE", () -> schedules.updateSchedule(schedule.getId(), UpdateScheduleRequest.builder()
                .scheduledStartTime(exam.getStartDate().minusMinutes(1)).scheduledEndTime(exam.getEndDate()).build()));
        error("SCHEDULE_TIME_OUT_OF_RANGE", () -> exams.updateExam(exam.getId(), UpdateExamRequest.builder()
                .startDate(exam.getStartDate().plusMinutes(1)).build()));
        assertThat(schedules.updateSchedule(schedule.getId(), UpdateScheduleRequest.builder()
                .scheduledStartTime(exam.getStartDate().plusMinutes(1)).scheduledEndTime(exam.getEndDate()).build())
                .getScheduledStartTime().toInstant()).isEqualTo(exam.getStartDate().plusMinutes(1).toInstant());
    }

    @Test
    void assignmentsAvoidRepeatsAndPreserveSnapshots() {
        ExamDto exam = createExam(3);
        ExamScheduleDto first = add(exam, studentId);
        ExamScheduleDto second = add(exam, student2Id);
        QuestionAssignmentResultDto a = schedules.assignQuestionsToSchedule(first.getId());
        QuestionAssignmentResultDto b = schedules.assignQuestionsToSchedule(second.getId());
        assertThat(a.getTotalAssigned()).isEqualTo(3);
        assertThat(a.getTotalAvailableInPool()).isEqualTo(8);
        assertThat(a.getAssignedQuestions()).extracting(AssignedQuestionDto::getQuestionOrder).containsExactly(1, 2, 3);
        assertThat(b.getAssignedQuestions()).extracting(AssignedQuestionDto::getQuestionId)
                .doesNotContainAnyElementsOf(a.getAssignedQuestions().stream().map(AssignedQuestionDto::getQuestionId).toList());
        jdbc.update("UPDATE questions SET content = 'Edited after assignment' WHERE course_id = ?", courseId);
        assertThat(schedules.getAssignedQuestions(first.getId())).extracting(AssignedQuestionDto::getContentSnapshot)
                .containsExactlyElementsOf(a.getAssignedQuestions().stream().map(AssignedQuestionDto::getContentSnapshot).toList());
        error("QUESTIONS_ALREADY_ASSIGNED", () -> schedules.assignQuestionsToSchedule(first.getId()));
        error("CANNOT_MODIFY_ACTIVE_EXAM", () -> exams.updateExam(exam.getId(), UpdateExamRequest.builder().maxMainQuestions(4).build()));
        error("CANNOT_MODIFY_ACTIVE_EXAM", () -> exams.updateExam(exam.getId(), UpdateExamRequest.builder().maxFollowupQuestions(4).build()));
        authenticate("stranger", "LECTURER");
        error("NOT_COURSE_LECTURER", () -> schedules.getAssignedQuestions(first.getId()));
        error("NOT_EXAM_OWNER", () -> schedules.assignQuestionsToSchedule(first.getId()));
    }

    @Test
    void fallbackUsesAllUnusedQuestionsBeforeRepeatingAndNeverDuplicatesWithinSet() {
        ExamDto exam = createExam(5);
        QuestionAssignmentResultDto first = schedules.assignQuestionsToSchedule(add(exam, studentId).getId());
        QuestionAssignmentResultDto second = schedules.assignQuestionsToSchedule(add(exam, student2Id).getId());
        Set<UUID> ids = new HashSet<>(first.getAssignedQuestions().stream().map(AssignedQuestionDto::getQuestionId).toList());
        List<UUID> secondIds = second.getAssignedQuestions().stream().map(AssignedQuestionDto::getQuestionId).toList();
        assertThat(secondIds).doesNotHaveDuplicates().hasSize(5);
        assertThat(secondIds.stream().filter(ids::contains).count()).isEqualTo(2);
    }

    @Test
    void insufficientPoolRollsBackStartAndAssignment() {
        ExamDto exam = createExam(9);
        ExamScheduleDto schedule = add(exam, studentId);
        openNow(exam, schedule);
        authenticate("student", "STUDENT");
        error("NOT_ENOUGH_QUESTIONS", () -> schedules.startSchedule(schedule.getId()));
        assertThat(schedules.getScheduleById(schedule.getId()).getStatus()).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM assigned_questions", Integer.class)).isZero();
    }

    @Test
    void startAutoAssignsAndProtectsActiveSchedules() {
        ExamDto exam = createExam(3);
        ExamScheduleDto schedule = add(exam, studentId);
        authenticate("student2", "STUDENT");
        error("FORBIDDEN", () -> schedules.startSchedule(schedule.getId()));
        authenticate("student", "STUDENT");
        error("SCHEDULE_NOT_OPEN", () -> schedules.startSchedule(schedule.getId()));
        openNow(exam, schedule);
        ExamScheduleDto started = schedules.startSchedule(schedule.getId());
        assertThat(started.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(started.getAssignedQuestionCount()).isEqualTo(3);
        error("SCHEDULE_NOT_PENDING", () -> schedules.startSchedule(schedule.getId()));
        authenticate("owner", "LECTURER");
        error("EXAM_HAS_ACTIVE_SCHEDULES", () -> exams.deleteExam(exam.getId()));
        error("SCHEDULE_NOT_PENDING", () -> schedules.removeStudentFromExam(schedule.getId()));
        error("SCHEDULE_NOT_PENDING", () -> schedules.updateSchedule(schedule.getId(), UpdateScheduleRequest.builder().build()));
        jdbc.update("UPDATE exam_schedules SET status = 'COMPLETED', final_score = 8.50 WHERE id = ?", schedule.getId());
        error("EXAM_HAS_ACTIVE_SCHEDULES", () -> exams.deleteExam(exam.getId()));
        assertThat(exams.getExamById(exam.getId()).getCompletedStudents()).isEqualTo(1);
        authenticate("student", "STUDENT");
        assertThat(schedules.getMySchedules()).singleElement().satisfies(s -> assertThat(s.getFinalScore()).isEqualByComparingTo("8.50"));
    }

    @Test
    void startReusesManuallyAssignedQuestionsAndPendingDeletionCleansChildren() {
        ExamDto exam = createExam(3);
        ExamScheduleDto schedule = add(exam, studentId);
        schedules.assignQuestionsToSchedule(schedule.getId());
        openNow(exam, schedule);
        assertThat(schedules.startSchedule(schedule.getId()).getAssignedQuestionCount()).isEqualTo(3);
        ExamDto removable = createExam(2);
        ExamScheduleDto pending = add(removable, student2Id);
        schedules.assignQuestionsToSchedule(pending.getId());
        schedules.removeStudentFromExam(pending.getId());
        assertThat(schedules.getSchedulesByExamId(removable.getId())).isEmpty();
        pending = add(removable, student2Id);
        schedules.assignQuestionsToSchedule(pending.getId());
        exams.deleteExam(removable.getId());
        error("EXAM_NOT_FOUND", () -> exams.getExamById(removable.getId()));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM assigned_questions", Integer.class)).isEqualTo(3);
    }

    @Test
    void concurrentAssignmentAndEnrollmentAreSerialized() throws Exception {
        ExamDto exam = createExam(3);
        ExamScheduleDto schedule = add(exam, studentId);
        assertThat(concurrently(() -> schedules.assignQuestionsToSchedule(schedule.getId())))
                .containsExactlyInAnyOrder("OK", "QUESTIONS_ALREADY_ASSIGNED");
        assertThat(concurrently(() -> schedules.addStudentsToExam(exam.getId(), batch(entry(exam, student2Id)))))
                .containsExactlyInAnyOrder("OK", "STUDENT_ALREADY_SCHEDULED");
        assertThat(schedules.getAssignedQuestions(schedule.getId())).hasSize(3);
        assertThat(schedules.getSchedulesByExamId(exam.getId())).hasSize(2);
    }

    @Test
    void concurrentStudentsReceiveDisjointQuestionSetsWhenPoolAllows() throws Exception {
        ExamDto exam = createExam(4);
        UUID first = add(exam, studentId).getId();
        UUID second = add(exam, student2Id).getId();
        assertThat(concurrently(() -> schedules.assignQuestionsToSchedule(first),
                () -> schedules.assignQuestionsToSchedule(second))).containsExactly("OK", "OK");
        List<UUID> firstIds = schedules.getAssignedQuestions(first).stream().map(AssignedQuestionDto::getQuestionId).toList();
        assertThat(schedules.getAssignedQuestions(second)).extracting(AssignedQuestionDto::getQuestionId)
                .doesNotContainAnyElementsOf(firstIds);
    }

    @Test
    void timestampsRoundTripAtPostgresPrecisionAndAdminCanReadDeletedCreator() {
        CreateExamRequest request = request(2);
        request.setStartDate(request.getStartDate().withNano(123456789));
        ExamDto created = exams.createExam(request);
        assertThat(created.getStartDate().getNano()).isEqualTo(123456000);
        assertThat(exams.getExamById(created.getId()).getStartDate().toInstant()).isEqualTo(created.getStartDate().toInstant());
        AddStudentsRequest.StudentScheduleEntry entry = entry(created, studentId);
        entry.setScheduledStartTime(created.getStartDate().withOffsetSameInstant(java.time.ZoneOffset.UTC));
        assertThat(schedules.addStudentsToExam(created.getId(), batch(entry))).hasSize(1);
        jdbc.update("DELETE FROM users WHERE id = ?", ownerId);
        authenticate("admin", "ADMIN");
        assertThat(exams.getExamDetail(created.getId()).getExam().getCreatedBy()).isNull();
    }

    @Test
    void realLoginTokenAuthenticatesExamRequestsAndSwaggerDescribesEndpoints() throws Exception {
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", passwordEncoder.encode("test-password"), ownerId);
        createExam(2);
        SecurityContextHolder.clearContext();
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"owner\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = com.jayway.jsonpath.JsonPath.read(response, "$.data.token");
        mvc.perform(get("/api/exams").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.totalElements").value(1));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/lecturer/exams']").exists())
                .andExpect(jsonPath("$.paths['/api/student/schedules/{scheduleId}/start']").exists());
    }

    @Test
    void httpEndpointsEnforceRolesValidationAndPaginationShape() throws Exception {
        ExamDto exam = createExam(3);
        ExamScheduleDto schedule = add(exam, studentId);
        SecurityContextHolder.clearContext();
        mvc.perform(get("/api/exams")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/exams").with(user("student").roles("STUDENT"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/exams").with(user("owner").roles("LECTURER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].pendingStudents").value(1));
        mvc.perform(get("/api/exams/" + exam.getId()).with(user("stranger").roles("LECTURER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/student/my-schedules").with(user("student").roles("STUDENT")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].student.id").value(studentId.toString()));
        mvc.perform(get("/api/student/my-schedules").with(user("student2").roles("STUDENT")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(get("/api/schedules/" + schedule.getId() + "/assigned-questions").with(user("student").roles("STUDENT")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/lecturer/exams").with(user("owner").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
        mvc.perform(post("/api/lecturer/exams/" + exam.getId() + "/schedules").with(user("owner").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"students\":[null]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/exams/not-a-uuid").with(user("owner").roles("LECTURER")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
        mvc.perform(put("/api/lecturer/exams/" + exam.getId()).with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Via admin HTTP\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.title").value("Via admin HTTP"));
        mvc.perform(put("/api/lecturer/exams/" + exam.getId()).with(user("owner").roles("LECTURER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"  \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/lecturer/schedules/" + schedule.getId() + "/assign-questions").with(user("stranger").roles("LECTURER")))
                .andExpect(status().isForbidden());
    }

    private UUID addUser(String username, String role) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id, username, password_hash, full_name, role) VALUES (?, ?, 'test-only', ?, ?)", id, username, username, role);
        return id;
    }

    private void authenticate(String username, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(username, "unused",
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    private CreateExamRequest request(int count) {
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        return CreateExamRequest.builder().courseId(courseId).title("  Oral exam  ").startDate(start)
                .endDate(start.plusHours(3)).maxMainQuestions(count).maxFollowupQuestions(2).build();
    }

    private ExamDto createExam(int count) { return exams.createExam(request(count)); }

    private AddStudentsRequest.StudentScheduleEntry entry(ExamDto exam, UUID student) {
        return AddStudentsRequest.StudentScheduleEntry.builder().studentId(student)
                .scheduledStartTime(exam.getStartDate()).scheduledEndTime(exam.getStartDate().plusMinutes(30)).build();
    }

    private AddStudentsRequest batch(AddStudentsRequest.StudentScheduleEntry... entries) {
        return AddStudentsRequest.builder().students(Arrays.asList(entries)).build();
    }

    private ExamScheduleDto add(ExamDto exam, UUID student) {
        return schedules.addStudentsToExam(exam.getId(), batch(entry(exam, student))).get(0);
    }

    private void openNow(ExamDto exam, ExamScheduleDto schedule) {
        jdbc.update("UPDATE exams SET start_date = now() - interval '1 hour', end_date = now() + interval '1 hour' WHERE id = ?", exam.getId());
        jdbc.update("UPDATE exam_schedules SET scheduled_start_time = now() - interval '5 minutes', scheduled_end_time = now() + interval '30 minutes' WHERE id = ?", schedule.getId());
    }

    private void error(String code, Runnable operation) {
        assertThatThrownBy(operation::run).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }

    private List<String> concurrently(Runnable operation) throws Exception {
        return concurrently(operation, operation);
    }

    private List<String> concurrently(Runnable first, Runnable second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        java.util.function.Function<Runnable, Callable<String>> call = operation -> () -> {
            authenticate("owner", "LECTURER");
            try {
                start.await();
                operation.run();
                return "OK";
            } catch (AppException ex) {
                return ex.getErrorCode();
            } finally {
                SecurityContextHolder.clearContext();
            }
        };
        try {
            Future<String> a = executor.submit(call.apply(first));
            Future<String> b = executor.submit(call.apply(second));
            start.countDown();
            return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }
}
