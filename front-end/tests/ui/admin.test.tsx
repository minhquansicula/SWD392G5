import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserManagementPage } from '../../src/components/admin/UserManagementPage';
import { CourseManagementPage } from '../../src/components/admin/CourseManagementPage';
import * as auth from '../../src/services/authService';
import * as course from '../../src/services/courseService';
import { deferred } from './helpers';

vi.mock('../../src/services/authService', () => ({ getRegisteredUsers: vi.fn(), updateUserRole: vi.fn(), updateUserAccount: vi.fn(), deleteUser: vi.fn(), createUserByAdmin: vi.fn(), importStudentsBatch: vi.fn(), resendPasswordLink: vi.fn() }));
vi.mock('../../src/services/courseService', () => ({ getCourses: vi.fn(), createCourse: vi.fn(), updateCourse: vi.fn(), deleteCourse: vi.fn(), getCourseLecturers: vi.fn(), assignLecturersToCourse: vi.fn(), removeLecturerFromCourse: vi.fn() }));
describe('admin mutation exceptions', () => {
  beforeEach(() => { vi.mocked(auth.getRegisteredUsers).mockResolvedValue([]); vi.mocked(course.getCourses).mockResolvedValue([]); });
  it('failed user-list requests show an error, not a false empty list', async () => {
    vi.mocked(auth.getRegisteredUsers).mockRejectedValue(new Error('Forbidden'));
    render(<MemoryRouter><UserManagementPage language="vi" currentUserId="admin" /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Forbidden'));
  });
  it('failed course-list requests show an actionable error', async () => {
    vi.mocked(course.getCourses).mockRejectedValue(new Error('Network down'));
    render(<MemoryRouter><CourseManagementPage language="vi" /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Network down'));
  });
  it('prevents simultaneous account creation requests', async () => {
    const pending = deferred<auth.BackendUserDto>(); vi.mocked(auth.createUserByAdmin).mockReturnValue(pending.promise as never);
    render(<MemoryRouter><UserManagementPage language="vi" currentUserId="admin" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản' }));
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText(/Mã sinh viên/), { target: { value: 'SE001' } });
    fireEvent.change(document.getElementById('create-user-email')!, { target: { value: 'new@example.com' } });
    const form = screen.getByRole('dialog').querySelector('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); }); expect(auth.createUserByAdmin).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ id: 'new', fullName: 'New Student', role: 'STUDENT', email: 'new@example.com' }));
  });
  it('prevents simultaneous course creation requests', async () => {
    const pending = deferred<course.Course>(); vi.mocked(course.createCourse).mockReturnValue(pending.promise);
    render(<MemoryRouter><CourseManagementPage language="vi" /></MemoryRouter>);
    await waitFor(() => expect(course.getCourses).toHaveBeenCalled()); fireEvent.click(screen.getByRole('button', { name: 'Thêm môn học mới' }));
    fireEvent.change(screen.getByLabelText('Mã môn học', { exact: true }), { target: { value: 'NEW101' } });
    fireEvent.change(screen.getByLabelText('Tên môn học', { exact: true }), { target: { value: 'New Course' } });
    const form = screen.getByRole('dialog').querySelector('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); }); expect(course.createCourse).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ id: 'new', courseCode: 'NEW101', courseName: 'New Course' } as course.Course));
  });
});
