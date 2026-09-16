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
    const exam = exams.find((e) => e.id === examId);
    const examSchedules = schedules.filter((s) => s.examId === examId);
    const completed = examSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED || s.status === ScheduleStatus.GRADED);
    const graded = examSchedules.filter((s) => s.status === ScheduleStatus.GRADED);
    const pendingReview = examSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED);
    
    // Scores array: use finalScore if graded, otherwise aiSuggestedScore
    const scores = completed.map((s) => s.finalScore ?? s.aiSuggestedScore ?? 0);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    // Calculate median
    const sortedScores = [...scores].sort((a, b) => a - b);
    let medianScore = 0;
    if (sortedScores.length > 0) {
        const mid = Math.floor(sortedScores.length / 2);
        medianScore = sortedScores.length % 2 !== 0 ? sortedScores[mid] : (sortedScores[mid - 1] + sortedScores[mid]) / 2;
    }
    
    const passCount = scores.filter((s) => s >= 5.0).length;
    const passRate = completed.length ? Math.round((passCount / completed.length) * 100) : 0;

    // Academic Tiers
    const academicTiers = [
        {
            tier: 'Under Threshold (< 5.0)',
            tierLabel: 'Chưa đạt (< 5.0)',
            range: '< 5.0',
            color: '#ef4444',
            count: completed.filter((s) => (s.finalScore ?? s.aiSuggestedScore ?? 0) < 5.0).length,
            students: completed
                .filter((s) => (s.finalScore ?? s.aiSuggestedScore ?? 0) < 5.0)
                .map((s) => ({ name: s.studentName, score: s.finalScore ?? s.aiSuggestedScore })),
        },
        {
            tier: 'Average (5.0 - 6.4)',
            tierLabel: 'Trung bình (5.0 - 6.4)',
            range: '5.0 - 6.4',
            color: '#f59e0b',
            count: completed.filter((s) => {
                const sc = s.finalScore ?? s.aiSuggestedScore ?? 0;
                return sc >= 5.0 && sc < 6.5;
            }).length,
            students: completed
                .filter((s) => {
                    const sc = s.finalScore ?? s.aiSuggestedScore ?? 0;
                    return sc >= 5.0 && sc < 6.5;
                })
                .map((s) => ({ name: s.studentName, score: s.finalScore ?? s.aiSuggestedScore })),
        },
        {
            tier: 'Good (6.5 - 7.9)',
            tierLabel: 'Khá (6.5 - 7.9)',
            range: '6.5 - 7.9',
            color: '#3b82f6',
            count: completed.filter((s) => {
                const sc = s.finalScore ?? s.aiSuggestedScore ?? 0;
                return sc >= 6.5 && sc < 8.0;
            }).length,
            students: completed
                .filter((s) => {
                    const sc = s.finalScore ?? s.aiSuggestedScore ?? 0;
                    return sc >= 6.5 && sc < 8.0;
                })
                .map((s) => ({ name: s.studentName, score: s.finalScore ?? s.aiSuggestedScore })),
        },
        {
            tier: 'Excellent (8.0 - 10.0)',
            tierLabel: 'Giỏi - Xuất sắc (8.0 - 10.0)',
            range: '8.0 - 10.0',
            color: '#10b981',
            count: completed.filter((s) => (s.finalScore ?? s.aiSuggestedScore ?? 0) >= 8.0).length,
            students: completed
                .filter((s) => (s.finalScore ?? s.aiSuggestedScore ?? 0) >= 8.0)
                .map((s) => ({ name: s.studentName, score: s.finalScore ?? s.aiSuggestedScore })),
        },
    ];

    // Standard 10-interval distribution with candidate details
    const standardIntervals = [
        { min: 0, max: 2, range: '0 - 2' },
        { min: 2, max: 4, range: '2 - 4' },
        { min: 4, max: 5, range: '4 - 5' },
        { min: 5, max: 6, range: '5 - 6' },
        { min: 6, max: 7, range: '6 - 7' },
        { min: 7, max: 8, range: '7 - 8' },
        { min: 8, max: 9, range: '8 - 9' },
        { min: 9, max: 10.1, range: '9 - 10' },
    ];

    const scoreDistribution = standardIntervals.map((interval) => {
        const matchingStudents = completed.filter((s) => {
            const sc = s.finalScore ?? s.aiSuggestedScore ?? 0;
            return sc >= interval.min && sc < interval.max;
        });
        return {
            range: interval.range,
            count: matchingStudents.length,
            students: matchingStudents.map((s) => `${s.studentName} (${(s.finalScore ?? s.aiSuggestedScore).toFixed(1)})`),
        };
    });

    // Question difficulty analysis
    const courseQuestions = mockQuestions.filter((q) => q.courseId === exam?.courseId);
    const questionDifficulty = courseQuestions.map((q) => {
        const qResults = allQuestionResults.filter((r) => r.questionId === q.id);
        const avg = qResults.length ? qResults.reduce((a, b) => a + b.aiScore, 0) / qResults.length : 0;
        const passAttempts = qResults.filter((r) => r.aiScore >= 5.0).length;
        const successRate = qResults.length ? Math.round((passAttempts / qResults.length) * 100) : 0;
        const latestFeedback = qResults.length > 0 ? qResults[0].aiFeedback : 'Chưa có dữ liệu bài thi cho câu hỏi này.';
        
        return {
            questionId: q.id,
            questionContent: q.content,
            difficulty: q.difficultyLevel,
            avgScore: Math.round(avg * 10) / 10,
            successRate: qResults.length ? successRate : 0,
            timesAsked: qResults.length,
            passCount: passAttempts,
            latestFeedback,
        };
    });

    // Student roster with full context
    const studentsList = examSchedules.map((s) => {
        const student = mockUsers.find((u) => u.id === s.studentId);
        const sResults = allQuestionResults.filter((r) => r.examScheduleId === s.id);
        return {
            id: s.id,
            studentId: s.studentId,
            studentName: s.studentName || student?.fullName || 'Sinh viên',
            username: student?.username || '',
            scheduledStartTime: s.scheduledStartTime,
            scheduledEndTime: s.scheduledEndTime,
            status: s.status,
            aiSuggestedScore: s.aiSuggestedScore,
            finalScore: s.finalScore,
            gradedBy: s.gradedBy,
            gradedAt: s.gradedAt,
            questionsCount: sResults.length,
        };
    });

    return {
        overallStats: {
            totalStudents: examSchedules.length,
            completedCount: completed.length,
            gradedCount: graded.length,
            pendingReviewCount: pendingReview.length,
            avgScore: Math.round(avgScore * 10) / 10,
            medianScore: Math.round(medianScore * 10) / 10,
            highestScore: scores.length ? Math.max(...scores) : 0,
            lowestScore: scores.length ? Math.min(...scores) : 0,
            passCount,
            passRate,
        },
        academicTiers,
        scoreDistribution,
        questionDifficulty,
        studentsList,
    };
}
// ---------- Export ----------
export async function apiExportReport(examId) {
    await delay(400);
    const exam = exams.find((e) => e.id === examId);
    const examSchedules = schedules.filter((s) => s.examId === examId);
    const completed = examSchedules.filter((s) => s.status === ScheduleStatus.COMPLETED || s.status === ScheduleStatus.GRADED);
    const graded = examSchedules.filter((s) => s.status === ScheduleStatus.GRADED);
    const scores = completed.map((s) => s.finalScore ?? s.aiSuggestedScore ?? 0);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
    const passRate = completed.length ? Math.round((scores.filter((s) => s >= 5.0).length / completed.length) * 100) : 0;

    let csv = `BÁO CÁO KẾT QUẢ VẤN ĐÁP — HỆ THỐNG AIVES\n`;
    csv += `Kỳ thi: "${exam?.title || examId}"\n`;
    csv += `Môn học: "${exam?.courseName || ''} (${exam?.courseId || ''})"\n`;
    csv += `Giảng viên phụ trách: "${exam?.createdByName || 'TS. Nguyễn Văn An'}"\n`;
    csv += `Thời gian xuất: "${new Date().toLocaleString('vi-VN')}"\n`;
    csv += `Thống kê tổng quan: Tổng số SV: ${examSchedules.length} | Đã thi: ${completed.length} | Đã duyệt điểm: ${graded.length} | Điểm TB: ${avgScore} | Tỷ lệ Đạt: ${passRate}%\n\n`;
    
    csv += 'Mã SV,Họ và tên,Ca thi bắt đầu,Ca thi kết thúc,Trạng thái,Điểm AI gợi ý,Điểm chính thức,Người phê duyệt,Thời gian duyệt\n';
    for (const s of examSchedules) {
        const statusText = 
            s.status === ScheduleStatus.GRADED ? 'Đã duyệt điểm' :
            s.status === ScheduleStatus.COMPLETED ? 'Chờ GV duyệt' :
            s.status === ScheduleStatus.IN_PROGRESS ? 'Đang thi' : 'Chưa thi';
            
        csv += `"${s.studentId}","${s.studentName}","${new Date(s.scheduledStartTime).toLocaleString('vi-VN')}","${new Date(s.scheduledEndTime).toLocaleString('vi-VN')}","${statusText}",${s.aiSuggestedScore ?? ''},${s.finalScore ?? ''},"${s.gradedBy || ''}","${s.gradedAt ? new Date(s.gradedAt).toLocaleString('vi-VN') : ''}"\n`;
    }
    
    // Add BOM for Excel UTF-8 display
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
