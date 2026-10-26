import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthLandingPage } from '../../src/components/auth/AuthLandingPage';
import { SetPasswordPage } from '../../src/components/auth/SetPasswordPage';
import { loginUser, requestPasswordReset, checkPasswordLink, setPasswordWithLink } from '../../src/services/authService';
import { deferred } from './helpers';

vi.mock('../../src/services/authService', () => ({ loginUser: vi.fn(), requestPasswordReset: vi.fn(), checkPasswordLink: vi.fn(), setPasswordWithLink: vi.fn() }));
const user = { id: 'u1', fullName: 'Student', email: 'a@example.com', role: 'STUDENT', studentCode: 'SE001', createdAt: '' } as const;
function landing() {
  const onLoginSuccess = vi.fn();
  render(<AuthLandingPage language="vi" setLanguage={vi.fn()} isDarkMode={false} setIsDarkMode={vi.fn()} onLoginSuccess={onLoginSuccess} />);
  return onLoginSuccess;
}
function fillLogin(email = 'a@example.com', password = ' password123 ') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Mật khẩu', { exact: true }), { target: { value: password } });
}
function submitForm() { fireEvent.submit(document.querySelector('form')!); }

describe('authentication exceptions', () => {
  beforeEach(() => {
    vi.mocked(loginUser).mockResolvedValue(user);
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);
    vi.mocked(checkPasswordLink).mockResolvedValue({ email: user.email, fullName: user.fullName, activation: true });
    vi.mocked(setPasswordWithLink).mockResolvedValue(undefined);
  });
  it('forwards raw Unicode email and password without client-side normalization', async () => {
    const done = landing(); const raw = ' É+Tag@EXAMPLE.COM ';
    fillLogin(raw); submitForm();
    await waitFor(() => expect(done).toHaveBeenCalledWith(user));
    expect(loginUser).toHaveBeenCalledWith(raw, ' password123 ');
  });
  it.each(['', '   '])('rejects missing email %j without a request', async email => {
    landing(); fillLogin(email); submitForm();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Vui lòng nhập email');
    expect(loginUser).not.toHaveBeenCalled();
  });
  it('rejects an empty password without a request', async () => {
    landing(); fillLogin('a@example.com', ''); submitForm();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Vui lòng nhập mật khẩu');
    expect(loginUser).not.toHaveBeenCalled();
  });
  it('prevents duplicate login submits while pending', async () => {
    const request = deferred<typeof user>(); vi.mocked(loginUser).mockReturnValue(request.promise);
    const done = landing(); fillLogin(); submitForm(); submitForm();
    expect(loginUser).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve(user)); expect(done).toHaveBeenCalledTimes(1);
  });
  it.each(['Email or password is incorrect', 'Network unavailable'])('preserves the real failure: %s', async message => {
    vi.mocked(loginUser).mockRejectedValue(new Error(message)); const done = landing(); fillLogin(); submitForm();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', message); expect(done).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Đăng nhập' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('forgot-password uses a generic account-independent message and the raw email', async () => {
    landing(); fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' User@EXAMPLE.COM ' } }); submitForm();
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Nếu email thuộc về một tài khoản'));
    expect(requestPasswordReset).toHaveBeenCalledWith(' User@EXAMPLE.COM '); expect(loginUser).not.toHaveBeenCalled();
  });
  it('distinguishes an expired link from a server outage', async () => {
    vi.mocked(checkPasswordLink).mockRejectedValue(Object.assign(new Error('expired'), { invalidLink: true }));
    render(<SetPasswordPage token="expired" language="vi" onDone={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('hết hạn'));
    expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  });
  it('allows link verification to be retried after an outage', async () => {
    vi.mocked(checkPasswordLink).mockRejectedValueOnce(new Error('offline'));
    render(<SetPasswordPage token="token" language="vi" onDone={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByLabelText('Mật khẩu mới')).not.toBeNull(); expect(checkPasswordLink).toHaveBeenCalledTimes(2);
  });
  it.each([['short', 'short', 'ít nhất 8'], ['password123', 'different', 'không khớp'], ['ắ'.repeat(25), 'ắ'.repeat(25), '72 byte']])('rejects invalid password or confirmation (%s)', async (password, confirmation, message) => {
    render(<SetPasswordPage token="token" language="vi" onDone={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Mật khẩu mới'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: confirmation } }); submitForm();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(message)); expect(setPasswordWithLink).not.toHaveBeenCalled();
  });
  it('sends the token/raw password once and requires a fresh sign in after success', async () => {
    const request = deferred<void>(); vi.mocked(setPasswordWithLink).mockReturnValue(request.promise); const done = vi.fn();
    render(<SetPasswordPage token="token" language="vi" onDone={done} />);
    fireEvent.change(await screen.findByLabelText('Mật khẩu mới'), { target: { value: ' password123 ' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: ' password123 ' } }); submitForm(); submitForm();
    expect(setPasswordWithLink).toHaveBeenCalledTimes(1); expect(setPasswordWithLink).toHaveBeenCalledWith('token', ' password123 ');
    await act(async () => request.resolve()); fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' })); expect(done).toHaveBeenCalledWith(true);
  });
  it('handles a null rejection from the password service without an unhandled exception', async () => {
    vi.mocked(setPasswordWithLink).mockRejectedValue(null);
    render(<SetPasswordPage token="token" language="vi" onDone={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Mật khẩu mới'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: 'password123' } }); submitForm();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Không thể lưu mật khẩu.');
  });
});
