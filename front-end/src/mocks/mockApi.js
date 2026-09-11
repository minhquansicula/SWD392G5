// ============================================================
// AIVES — Mock API Handlers (In-Memory CRUD)
// ============================================================
import { ScheduleStatus, } from '../types';
import { mockExams, mockSchedules, mockCourses, mockQuestions, mockUsers, mockTranscripts, mockQuestionResults, mockTranscriptsSched2, mockQuestionResultsSched2, } from './data';
// ---------- In-memory stores (mutable copies) ----------
let exams = [...mockExams];
let schedules = [...mockSchedules];
const allTranscripts = [...mockTranscripts, ...mockTranscriptsSched2];
const allQuestionResults = [...mockQuestionResults, ...mockQuestionResultsSched2];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// ---------- Exam APIs ----------
export async function apiGetExams() {
    await delay(300);
    return [...exams];
}
export async function apiGetExamById(id) {
    await delay(200);
    return exams.find((e) => e.id === id);
}
export async function apiCreateExam(req) {
    await delay(400);
    const course = mockCourses.find((c) => c.id === req.courseId);
    const newExam = {
        id: `exam-${Date.now()}`,
        courseId: req.courseId,
        courseName: course?.courseName,
        title: req.title,
        startDate: req.startDate,
        endDate: req.endDate,
        maxMainQuestions: req.maxMainQuestions,
        maxFollowupQuestions: req.maxFollowupQuestions,
        createdBy: 'usr-lecturer-001',
        createdByName: 'TS. Nguyễn Văn An',
    };
    exams = [...exams, newExam];
    return newExam;
}
export async function apiUpdateExam(id, updates) {
    await delay(300);
    exams = exams.map((e) => (e.id === id ? { ...e, ...updates } : e));
    return exams.find((e) => e.id === id);
}
export async function apiDeleteExam(id) {
    await delay(200);
    exams = exams.filter((e) => e.id !== id);
}
// ---------- Schedule APIs ----------
export async function apiGetSchedules(examId) {
    await delay(200);
    return schedules.filter((s) => s.examId === examId);
}
export async function apiGetScheduleById(id) {
    await delay(150);
    return schedules.find((s) => s.id === id);
}
export async function apiCreateSchedules(examId, req) {
    await delay(400);
    const newSchedules = req.schedules.map((s, i) => {
        const student = mockUsers.find((u) => u.id === s.studentId);
        return {
            id: `sched-${Date.now()}-${i}`,
            examId,
            studentId: s.studentId,
            studentName: student?.fullName,
            scheduledStartTime: s.startTime,
            scheduledEndTime: s.endTime,
            status: ScheduleStatus.PENDING,
            aiSuggestedScore: null,
            finalScore: null,
            gradedBy: null,
            gradedAt: null,
        };
    });
    schedules = [...schedules, ...newSchedules];
    return newSchedules;
}
export async function apiGetMySchedules(studentId) {
    await delay(200);
    return schedules
        .filter((s) => s.studentId === studentId)
        .map((s) => {
        const exam = exams.find((e) => e.id === s.examId);
        return { ...s, examTitle: exam?.title };
    });
}
export async function apiGetPendingReview(examId) {
    await delay(200);
    return schedules.filter((s) => s.examId === examId && s.status === ScheduleStatus.COMPLETED);
}
export async function apiSubmitGrade(scheduleId, req) {
    await delay(400);
    schedules = schedules.map((s) => s.id === scheduleId
        ? {
            ...s,
            finalScore: req.finalScore,
            gradedBy: 'usr-lecturer-001',
            gradedAt: new Date().toISOString(),
            status: ScheduleStatus.GRADED,
        }
        : s);
    return schedules.find((s) => s.id === scheduleId);
}
// ---------- Results & Transcripts APIs ----------
export async function apiGetScheduleResults(scheduleId) {
    await delay(300);
    const schedule = schedules.find((s) => s.id === scheduleId);
    const results = allQuestionResults.filter((r) => r.examScheduleId === scheduleId);
    const transcripts = allTranscripts.filter((t) => t.examScheduleId === scheduleId);
    return {
        schedule: schedule,
        results,
        transcripts,
    };
}
// ---------- Audio Upload ----------
export async function apiUploadAudio(_scheduleId, _blob) {
    await delay(800);
    return {
        audioUploadId: `audio-${Date.now()}`,
        audioUrl: `/mock-audio/${Date.now()}.webm`,
    };
}
// ---------- Analytics ----------
export async function apiGetExamAnalytics(examId) {
    await delay(400);
    const examSchedules = schedules.filter((s) => s.examId === examId);
    const completed = examSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED || s.status === ScheduleStatus.GRADED);
    const graded = examSchedules.filter((s) => s.status === ScheduleStatus.GRADED);
    const scores = completed.map((s) => s.finalScore ?? s.aiSuggestedScore ?? 0);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
        scoreDistribution: [
            { range: '0-2', count: scores.filter((s) => s < 2).length },
            { range: '2-4', count: scores.filter((s) => s >= 2 && s < 4).length },
            { range: '4-5', count: scores.filter((s) => s >= 4 && s < 5).length },
            { range: '5-6', count: scores.filter((s) => s >= 5 && s < 6).length },
            { range: '6-7', count: scores.filter((s) => s >= 6 && s < 7).length },
            { range: '7-8', count: scores.filter((s) => s >= 7 && s < 8).length },
            { range: '8-9', count: scores.filter((s) => s >= 8 && s < 9).length },
            { range: '9-10', count: scores.filter((s) => s >= 9).length },
        ],
        questionDifficulty: mockQuestions
            .filter((q) => {
            const exam = exams.find((e) => e.id === examId);
            return q.courseId === exam?.courseId;
        })
            .map((q) => {
            const qResults = allQuestionResults.filter((r) => r.questionId === q.id);
            const avg = qResults.length ? qResults.reduce((a, b) => a + b.aiScore, 0) / qResults.length : 0;
            return {
                questionId: q.id,
                questionContent: q.content.substring(0, 80) + '...',
                difficulty: q.difficultyLevel,
                avgScore: Math.round(avg * 10) / 10,
                successRate: qResults.length ? Math.round((qResults.filter((r) => r.aiScore >= 5).length / qResults.length) * 100) : 0,
                timesAsked: qResults.length,
            };
        }),
        overallStats: {
            totalStudents: examSchedules.length,
            completedCount: completed.length,
            gradedCount: graded.length,
            avgScore: Math.round(avgScore * 10) / 10,
            highestScore: scores.length ? Math.max(...scores) : 0,
            lowestScore: scores.length ? Math.min(...scores) : 0,
        },
    };
}
// ---------- Export ----------
export async function apiExportReport(examId) {
    await delay(500);
    const examSchedules = schedules.filter((s) => s.examId === examId);
    const exam = exams.find((e) => e.id === examId);
    let csv = 'StudentName,StudentId,ScheduledTime,AIScore,FinalScore,Status\n';
    for (const s of examSchedules) {
        csv += `"${s.studentName}","${s.studentId}","${s.scheduledStartTime}",${s.aiSuggestedScore ?? ''},${s.finalScore ?? ''},${s.status}\n`;
    }
    return new Blob([`${exam?.title}\n\n${csv}`], { type: 'text/csv' });
}
// ---------- Utility exports ----------
export function getMockCourses() {
    return mockCourses;
}
export function getMockStudents() {
    return mockUsers.filter((u) => u.role === 'STUDENT');
}
export function getMockQuestions(courseId) {
    return mockQuestions.filter((q) => q.courseId === courseId);
}
