import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { verifyCurrentSession, clearSession } from '../../src/services/authService';
import { deferred } from './helpers';
import type { UserAccount } from '../../src/types';

vi.mock('../../src/services/authService', () => ({ verifyCurrentSession: vi.fn(), clearSession: vi.fn() }));
vi.mock('../../src/components/exams/student/StudentScheduleList', () => ({ StudentScheduleList: () => <p>Student schedules</p> }));
vi.mock('../../src/components/exams/lecturer/LecturerExamManagement', () => ({ LecturerExamManagement: () => <p>Lecturer examinations</p> }));
vi.mock('../../src/components/admin/UserManagementPage', () => ({ UserManagementPage: () => <p>Admin accounts</p> }));
vi.mock('../../src/components/admin/CourseManagementPage', () => ({ CourseManagementPage: () => <p>Admin courses</p> }));
vi.mock('../../src/components/questions/QuestionBankPage', () => ({ QuestionBankPage: () => <p>Question bank</p> }));
vi.mock('../../src/components/materials/CourseMaterialsPage', () => ({ CourseMaterialsPage: () => <p>Course materials</p> }));
vi.mock('../../src/components/analytics/ResultAnalyticsView', () => ({ ResultAnalyticsView: () => <p>Results</p> }));
vi.mock('../../src/components/auth/AuthLandingPage', () => ({ AuthLandingPage: () => <p>Sign in screen</p> }));
vi.mock('../../src/components/auth/SetPasswordPage', () => ({ SetPasswordPage: ({ token }: { token: string }) => <p data-testid="password-token">{token}</p> }));

const user = (role: UserAccount['role']) => ({ id: 'u', fullName: 'User', role, email: 'u@example.com', studentCode: null, createdAt: '' });
function Path() { return <span data-testid="path">{useLocation().pathname}</span>; }
function mount(path = '/') { return render(<MemoryRouter initialEntries={[path]}><App /><Path /></MemoryRouter>); }
describe('session and role-based navigation', () => {
  beforeEach(() => { vi.mocked(verifyCurrentSession).mockResolvedValue(null); });
  it('never renders a workspace while identity verification is pending', async () => {
    const pending = deferred<UserAccount | null>(); vi.mocked(verifyCurrentSession).mockReturnValue(pending.promise); mount('/admin');
    expect(screen.queryByText('Admin accounts')).toBeNull(); await act(async () => pending.resolve(null)); expect(screen.getByText('Sign in screen')).not.toBeNull();
  });
  it.each(['/admin', '/courses', '/questions', '/materials'])('student access to %s redirects to schedules', async path => {
    vi.mocked(verifyCurrentSession).mockResolvedValue(user('STUDENT')); mount(path);
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/exams')); await screen.findByText('Student schedules');
    expect(screen.queryByText('Admin accounts')).toBeNull(); expect(screen.queryByText('Course materials')).toBeNull();
  });
  it('lecturer cannot enter administration through a pasted URL', async () => {
    vi.mocked(verifyCurrentSession).mockResolvedValue(user('LECTURER')); mount('/admin');
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/exams')); expect(screen.getByText('Lecturer examinations')).not.toBeNull();
  });
  it('admin root route goes to account management', async () => {
    vi.mocked(verifyCurrentSession).mockResolvedValue(user('ADMIN')); mount(); await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/admin')); expect(screen.getByText('Admin accounts')).not.toBeNull();
  });
  it('an unavailable /me remains an error and can be retried', async () => {
    vi.mocked(verifyCurrentSession).mockRejectedValueOnce(new Error('Server unavailable')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Server unavailable'); expect(screen.queryByText('Sign in screen')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); await screen.findByText('Sign in screen');
  });
  it('an unauthorized event leaves the workspace immediately', async () => {
    vi.mocked(verifyCurrentSession).mockResolvedValue(user('STUDENT')); mount('/exams'); await screen.findByText('Student schedules');
    act(() => window.dispatchEvent(new Event('auth:unauthorized'))); expect(screen.getByText('Sign in screen')).not.toBeNull();
  });
  it('logout clears the session and leaves protected views', async () => {
    vi.mocked(verifyCurrentSession).mockResolvedValue(user('STUDENT')); mount('/exams'); await screen.findByText('Student schedules');
    fireEvent.click(screen.getByLabelText('Menu tài khoản')); fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(clearSession).toHaveBeenCalledTimes(1); expect(screen.getByText('Sign in screen')).not.toBeNull();
  });
  it('preserves token characters in an emailed password link', async () => {
    mount('/set-password?token=a%2Bb%2Fc%3D'); expect(screen.getByTestId('password-token').textContent).toBe('a+b/c=');
    await act(async () => {});
  });
  it('blocked browser storage does not crash the shell', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    mount(); expect(await screen.findByText('Sign in screen')).not.toBeNull();
  });
});
