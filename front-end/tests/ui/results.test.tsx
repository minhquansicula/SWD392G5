import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultAnalyticsView } from '../../src/components/analytics/ResultAnalyticsView';
import { studentExamService } from '../../src/services/studentExamService';
import { lecturerExamService } from '../../src/services/lecturerExamService';
import { getSessionDetail } from '../../src/services/aiService';
import { reportService } from '../../src/services/reportService';
import type { ExamScheduleDto } from '../../src/types/examApi';
import type { SessionDetail } from '../../src/services/aiService';
import { deferred } from './helpers';

vi.mock('../../src/services/studentExamService', () => ({ studentExamService: { mySchedules: vi.fn() } }));
vi.mock('../../src/services/lecturerExamService', () => ({ lecturerExamService: { list: vi.fn(), detail: vi.fn(), schedules: vi.fn() } }));
vi.mock('../../src/services/aiService', () => ({ getSessionDetail: vi.fn() }));
vi.mock('../../src/services/reportService', () => ({ reportService: { examReport: vi.fn(), gradebook: vi.fn() } }));
vi.mock('recharts', () => ({ Bar: () => null, BarChart: () => null, CartesianGrid: () => null, ResponsiveContainer: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }));
const user = { id: 'student', fullName: 'Student', email: 'a@example.com', role: 'STUDENT', studentCode: 'SE001', createdAt: '' } as const;
const schedule = (id: string, finalScore: number | null = null) => ({ id, examId: 'exam', examTitle: `Exam ${id}`, status: 'COMPLETED', finalScore, assignedQuestionCount: 1, courseCode: 'SWD392', courseName: 'Architecture', scheduledStartTime: null, scheduledEndTime: null, actualStartTime: null, actualEndTime: null, student: null }) as ExamScheduleDto;
const session = (id: string) => ({ schedule_id: id, exam_id: 'exam', exam_title: null, status: 'COMPLETED', final_score: null, actual_start_time: null, actual_end_time: null, transcripts: [], assigned_questions: [], results: [] }) as SessionDetail;
function mount(path = '/analytics', role: 'STUDENT' | 'LECTURER' = 'STUDENT') {
  return render(<MemoryRouter initialEntries={[path]}><ResultAnalyticsView language="vi" currentUser={{ ...user, role }} /></MemoryRouter>);
}
describe('results exceptions and data integrity', () => {
  beforeEach(() => {
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([schedule('one')]);
    vi.mocked(getSessionDetail).mockImplementation(async id => session(id));
    vi.mocked(lecturerExamService.list).mockResolvedValue({ content: [{ id: 'exam', title: 'Exam', courseCode: 'SWD392' }], page: { totalPages: 1 } } as never);
    vi.mocked(lecturerExamService.schedules).mockResolvedValue([schedule('one')]);
  });
  it('a failed initial load is not presented as an empty result list', async () => {
    vi.mocked(studentExamService.mySchedules).mockRejectedValueOnce(new Error('Network unavailable')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Network unavailable'));
    expect(screen.queryByText('Chưa có ca thi để hiển thị')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); await screen.findByText('Exam one');
  });
  it('does not create a score, transcript or feedback when data is missing', async () => {
    mount(); await screen.findByText('Chưa có dữ liệu chi tiết câu hỏi.');
    expect(screen.getAllByText('—').length).toBeGreaterThan(1); expect(screen.queryByText(/Thí sinh nắm được/)).toBeNull();
  });
  it('zero is a real score, not missing data', async () => {
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([schedule('one', 0)]); mount();
    await screen.findByText('Chưa có dữ liệu chi tiết câu hỏi.'); expect(screen.getByText('0', { exact: true })).not.toBeNull();
  });
  it('an unavailable AI service does not hide the recorded schedule score', async () => {
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([schedule('one', 7.2)]);
    vi.mocked(getSessionDetail).mockRejectedValue(new Error('AI service offline')); mount();
    await screen.findByRole('alert'); expect(screen.getByText('7.2', { exact: true })).not.toBeNull();
  });
  it('a student cannot open class analytics through a modified URL', async () => {
    mount('/analytics?tab=class'); await screen.findByText('Chưa có dữ liệu chi tiết câu hỏi.');
    expect(screen.queryByRole('button', { name: 'Phân tích kỳ thi' })).toBeNull(); expect(lecturerExamService.list).not.toHaveBeenCalled();
  });
  it('never substitutes another student/schedule for an unavailable requested record', async () => {
    mount('/analytics?schedule=not-assigned');
    expect(await screen.findByText('Ca thi không có trong danh sách được phép xem')).not.toBeNull();
    expect(getSessionDetail).not.toHaveBeenCalled();
  });
  it('renders partial session payloads without crashing or inventing entries', async () => {
    vi.mocked(getSessionDetail).mockResolvedValue({ schedule_id: 'one', final_score: null } as SessionDetail); mount();
    await waitFor(() => expect(getSessionDetail).toHaveBeenCalledWith('one')); await act(async () => {});
    expect(await screen.findByText('Chưa có dữ liệu chi tiết câu hỏi.')).not.toBeNull();
  });
  it('ignores a late detail response after selecting a different schedule', async () => {
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([schedule('one'), schedule('two')]);
    const pending = deferred<SessionDetail>(); vi.mocked(getSessionDetail).mockImplementation(id => id === 'one' ? pending.promise : Promise.resolve({ ...session('two'), assigned_questions: [{ id: 'q2', question_id: 'q2', order: 1, content: 'Only question two' }] }));
    mount(); await screen.findByLabelText('Ca thi');
    fireEvent.change(screen.getByLabelText('Ca thi'), { target: { value: 'two' } }); await screen.findByText('Only question two');
    await act(async () => pending.resolve({ ...session('one'), assigned_questions: [{ id: 'q1', question_id: 'q1', order: 1, content: 'Old question one' }] }));
    expect(screen.queryByText('Old question one')).toBeNull();
  });
  it('rejects a detail response belonging to a different schedule', async () => {
    vi.mocked(getSessionDetail).mockResolvedValue(session('wrong')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('không khớp ca thi'));
  });
  it('lecturer schedule API failure remains an actionable error', async () => {
    vi.mocked(lecturerExamService.schedules).mockRejectedValue(new Error('Forbidden')); mount('/analytics', 'LECTURER');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Forbidden'));
  });
  it('shows the rubric grade sheet in the school layout and hides unassessed marks', async () => {
    vi.mocked(getSessionDetail).mockImplementation(async id => ({ ...session(id), ai_report: { total_score: 8.7, scale: 10, summary: 'Tổng kết AI.', assessed_criteria: 1, criteria: [
      { criterion_id: 'a', name: 'Attitude', weight: 30, score: 10, weighted_score: 3, rationale: 'Chủ động.', improvement: '', evidence: [], assessed: true },
      { criterion_id: 's', name: 'Soft Skills', weight: 70, score: 0, weighted_score: 0, rationale: 'Chưa đủ dữ liệu.', improvement: '', evidence: [], assessed: false },
    ] } }));
    mount();
    expect(await screen.findByText('Status: Passed')).toBeTruthy();
    expect(screen.getByText('Chủ động.')).toBeTruthy();
    expect(screen.getByText('Tổng kết AI.')).toBeTruthy();
    const softRow = screen.getAllByText('Soft Skills')[1].closest('tr')!;
    expect(softRow.children[3].textContent).toBe('-');
  });
  it('lecturer analytics lists hardest questions with good-answer rates', async () => {
    vi.mocked(reportService.examReport).mockResolvedValue({ goodAnswerScore: 7, goodAnswerRate: 0.25, questions: [
      { questionId: 'q2', content: 'Giải thích JPA N+1', topic: 'JPA', difficulty: 'HARD', assignedCount: 2, gradedCount: 1, averageScore: 4, goodAnswerRate: 0 },
      { questionId: 'q1', content: 'DI là gì', topic: 'DI', difficulty: 'EASY', assignedCount: 2, gradedCount: 0, averageScore: null, goodAnswerRate: null },
    ] });
    mount('/analytics?tab=class', 'LECTURER');
    const hardest = (await screen.findByText('Giải thích JPA N+1')).closest('tr')!;
    expect(hardest.textContent).toContain('1/2');
    expect(hardest.textContent).toContain('0%');
    expect(screen.getByText('DI là gì').closest('tr')!.textContent).toContain('—');
    expect(screen.getByText(/Tỷ lệ trả lời tốt toàn kỳ thi: 25%/)).toBeTruthy();
  });
});
