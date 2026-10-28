import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentScheduleList } from '../../src/components/exams/student/StudentScheduleList';
import { studentExamService } from '../../src/services/studentExamService';
import type { ExamScheduleDto } from '../../src/types/examApi';

vi.mock('../../src/services/studentExamService', () => ({ studentExamService: { mySchedules: vi.fn(), start: vi.fn() } }));
vi.mock('../../src/components/interview/DeviceCheckDialog', () => ({ DeviceCheckDialog: ({ onConfirm }: { onConfirm: () => Promise<void> }) => <div>Device check<button onClick={onConfirm}>Confirm checked devices</button></div> }));
vi.mock('../../src/components/interview/LiveVivaRoom', () => ({ LiveVivaRoom: ({ scheduleId }: { scheduleId: string }) => <p>Live room {scheduleId}</p> }));
const user = { id: 'student', fullName: 'Student', email: 's@example.com', role: 'STUDENT', studentCode: 'SE001', createdAt: '' } as const;
const schedule = { id: 's1', examId: 'e1', examTitle: 'Viva examination', status: 'PENDING', finalScore: null, assignedQuestionCount: 0, courseCode: 'C1', courseName: 'Course', scheduledStartTime: new Date(Date.now() - 60000).toISOString(), scheduledEndTime: new Date(Date.now() + 600000).toISOString(), actualStartTime: null, actualEndTime: null } as ExamScheduleDto;
function mount(onNavigateToResults = vi.fn()) { return render(<MemoryRouter><StudentScheduleList language="vi" currentUser={user} onNavigateToResults={onNavigateToResults} /></MemoryRouter>); }
describe('student schedule exceptions', () => {
  beforeEach(() => { vi.mocked(studentExamService.mySchedules).mockResolvedValue([schedule]); vi.mocked(studentExamService.start).mockResolvedValue({ ...schedule, status: 'IN_PROGRESS' }); });
  it('an API failure remains an error with a retry action', async () => {
    vi.mocked(studentExamService.mySchedules).mockRejectedValue(new Error('Schedule service unavailable')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Schedule service unavailable'));
    expect(studentExamService.start).not.toHaveBeenCalled();
  });
  it('does not start an examination when merely opening device checks', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Chuẩn bị & Vào thi' }));
    expect(screen.getByText('Device check')).not.toBeNull(); expect(studentExamService.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm checked devices' })); await screen.findByText('Live room s1');
    expect(studentExamService.start).toHaveBeenCalledWith('s1');
  });
  it('does not restart an in-progress examination when entering the room', async () => {
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([{ ...schedule, status: 'IN_PROGRESS' }]); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Vào phòng thi vấn đáp ngay' }));
    expect(screen.getByText('Live room s1')).not.toBeNull(); expect(studentExamService.start).not.toHaveBeenCalled();
  });
  it('opens results with the completed schedule identifier', async () => {
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([{ ...schedule, status: 'COMPLETED' }]); const result = vi.fn(); mount(result);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem kết quả & nhận xét' })); expect(result).toHaveBeenCalledWith('s1');
  });
  it('forces a fresh load when the user refreshes schedules', async () => {
    mount(); await screen.findByRole('button', { name: 'Chuẩn bị & Vào thi' });
    vi.mocked(studentExamService.mySchedules).mockResolvedValue([{ ...schedule, status: 'COMPLETED' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới' }));
    await screen.findByRole('button', { name: 'Xem kết quả & nhận xét' });
    await waitFor(() => expect(studentExamService.mySchedules).toHaveBeenLastCalledWith(expect.any(AbortSignal), true));
  });
});
