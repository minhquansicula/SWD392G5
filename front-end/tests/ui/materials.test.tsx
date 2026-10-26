import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseMaterialsPage } from '../../src/components/materials/CourseMaterialsPage';
import * as ai from '../../src/services/aiService';
import { getCourses } from '../../src/services/courseService';
import { deferred } from './helpers';

vi.mock('../../src/services/courseService', () => ({ getCourses: vi.fn() }));
vi.mock('../../src/services/aiService', () => ({ getAiCourses: vi.fn(), getCourseDocuments: vi.fn(), getCourseRubrics: vi.fn(), uploadCourseDocument: vi.fn(), deleteCourseDocument: vi.fn(), previewRubricFile: vi.fn(), saveCourseRubric: vi.fn(), deleteCourseRubric: vi.fn() }));
const courses = [{ id: 'one', courseCode: 'C1', courseName: 'First course' }, { id: 'two', courseCode: 'C2', courseName: 'Second course' }];
function mount(path = '/materials') { return render(<MemoryRouter initialEntries={[path]}><CourseMaterialsPage language="vi" /></MemoryRouter>); }
async function settled() { await waitFor(() => expect((screen.getByLabelText('Chọn môn học:') as HTMLSelectElement).disabled).toBe(false)); }
describe('materials exceptions', () => {
  beforeEach(() => {
    vi.mocked(ai.getAiCourses).mockResolvedValue(courses); vi.mocked(getCourses).mockResolvedValue(courses as never);
    vi.mocked(ai.getCourseDocuments).mockResolvedValue([]); vi.mocked(ai.getCourseRubrics).mockResolvedValue([]);
  });
  it('falls back to course API when AI course listing is unavailable', async () => {
    vi.mocked(ai.getAiCourses).mockRejectedValue(new Error('AI offline')); mount(); await settled(); expect(getCourses).toHaveBeenCalledTimes(1);
  });
  it('shows a persistent error when both course sources fail', async () => {
    vi.mocked(ai.getAiCourses).mockRejectedValue(new Error('AI offline')); vi.mocked(getCourses).mockRejectedValue(new Error('Backend offline')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Backend offline'));
  });
  it('does not disguise document loading failure as an empty collection', async () => {
    vi.mocked(ai.getCourseDocuments).mockRejectedValue(new Error('Documents unavailable')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Documents unavailable');
    expect(screen.queryByText('Chưa có tài liệu nào được nạp cho môn học này.')).toBeNull();
  });
  it('ignores the old course response after switching courses', async () => {
    const pending = deferred<ai.CourseDocument[]>(); vi.mocked(ai.getCourseDocuments).mockImplementation(id => id === 'one' ? pending.promise : Promise.resolve([{ id: 'doc2', course_id: 'two', filename: 'new.pdf', chunk_count: 1, created_at: '' }]));
    mount(); await settled(); fireEvent.change(screen.getByLabelText('Chọn môn học:'), { target: { value: 'two' } }); await screen.findByText('new.pdf');
    await act(async () => pending.resolve([{ id: 'doc1', course_id: 'one', filename: 'old.pdf', chunk_count: 1, created_at: '' }]));
    expect(screen.queryByText('old.pdf')).toBeNull();
  });
  it.each([['malware.exe', 10], ['huge.pdf', 20 * 1024 * 1024 + 1]])('blocks invalid upload %s (%d bytes)', async (name, size) => {
    mount(); await settled(); const file = new File(['data'], name); Object.defineProperty(file, 'size', { value: size });
    fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [file] } });
    expect(ai.uploadCourseDocument).not.toHaveBeenCalled();
    expect(screen.getByText(name.endsWith('.exe') ? 'Chỉ hỗ trợ file .pdf, .docx, .txt, .md' : 'Tài liệu không được vượt quá 20MB.')).not.toBeNull();
  });
  it('requires confirmation before deleting a document and retains it on API failure', async () => {
    vi.mocked(ai.getCourseDocuments).mockResolvedValue([{ id: 'd1', course_id: 'one', filename: 'keep.pdf', chunk_count: 1, created_at: '' }]);
    vi.mocked(ai.deleteCourseDocument).mockRejectedValue(new Error('Delete failed')); mount(); await screen.findByText('keep.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' })); expect(ai.deleteCourseDocument).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' })); await screen.findByRole('alert');
    expect(screen.getByText('keep.pdf', { exact: true })).not.toBeNull();
  });
});
