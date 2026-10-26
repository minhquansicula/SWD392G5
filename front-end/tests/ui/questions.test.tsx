import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionBankPage } from '../../src/components/questions/QuestionBankPage';
import { questionService } from '../../src/services/questionService';
import { getCourses } from '../../src/services/courseService';
import { generateQuestionsFromMaterials } from '../../src/services/aiService';
import { deferred } from './helpers';
import type { QuestionDto } from '../../src/services/questionService';

vi.mock('../../src/services/courseService', () => ({ getCourses: vi.fn() }));
vi.mock('../../src/services/aiService', () => ({ generateQuestionsFromMaterials: vi.fn() }));
vi.mock('../../src/services/questionService', () => ({ questionService: { getQuestions: vi.fn(), createQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn(), createBatchQuestions: vi.fn() } }));
function mount() { return render(<MemoryRouter><QuestionBankPage language="vi" /></MemoryRouter>); }
describe('question bank exceptions', () => {
  beforeEach(() => { vi.mocked(getCourses).mockResolvedValue([{ id: 'c1', courseCode: 'C1', courseName: 'Course' }]); vi.mocked(questionService.getQuestions).mockResolvedValue([]); });
  it('list failure is an error rather than an empty question bank', async () => {
    vi.mocked(questionService.getQuestions).mockRejectedValue(new Error('offline')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Không thể tải danh sách câu hỏi'));
  });
  it('debounces searches and ignores late responses for old filters', async () => {
    const old = deferred<QuestionDto[]>(); vi.mocked(questionService.getQuestions).mockReturnValueOnce(old.promise).mockResolvedValue([]); mount();
    await waitFor(() => expect(questionService.getQuestions).toHaveBeenCalledTimes(1));
    const search = screen.getByLabelText('Tìm nội dung hoặc chủ đề câu hỏi');
    fireEvent.change(search, { target: { value: 'a' } }); fireEvent.change(search, { target: { value: 'ab' } }); fireEvent.change(search, { target: { value: 'abc' } });
    await waitFor(() => expect(questionService.getQuestions).toHaveBeenCalledTimes(2));
    expect(vi.mocked(questionService.getQuestions).mock.calls[1][0]).toMatchObject({ query: 'abc' });
    await act(async () => old.resolve([{ id: 'old', content: 'Old filtered question', difficultyLevel: 'EASY' } as QuestionDto]));
    expect(screen.queryByText('Old filtered question')).toBeNull();
  });
  it('shows course-source failures instead of silently presenting no courses', async () => {
    vi.mocked(getCourses).mockRejectedValue(new Error('Courses unavailable')); mount();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Courses unavailable'));
  });
  it('AI generation failure never creates approved questions', async () => {
    vi.mocked(generateQuestionsFromMaterials).mockRejectedValue(new Error('AI unavailable')); mount();
    await waitFor(() => expect(screen.queryByText('Đang tải danh sách câu hỏi…')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý bằng AI' }));
    fireEvent.change(screen.getByRole('dialog').querySelector('select')!, { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sinh 5 câu hỏi gợi ý' }));
    await screen.findByText('AI unavailable'); expect(questionService.createBatchQuestions).not.toHaveBeenCalled();
  });
  it('sends empty strings when clearing an existing topic and expected answer', async () => {
    vi.mocked(questionService.getQuestions).mockResolvedValue([{ id: 'q1', courseId: 'c1', courseCode: 'C1', courseName: 'Course', content: 'Existing question', difficultyLevel: 'MEDIUM', topic: 'Old topic', expectedAnswer: 'Old answer' }]);
    vi.mocked(questionService.updateQuestion).mockResolvedValue({} as QuestionDto);
    mount();
    await screen.findByText('Existing question');
    fireEvent.click(screen.getByTitle('Chỉnh sửa'));
    fireEvent.change(screen.getByDisplayValue('Old topic'), { target: { value: '   ' } });
    fireEvent.change(screen.getByDisplayValue('Old answer'), { target: { value: '' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() => expect(questionService.updateQuestion).toHaveBeenCalledWith('q1', { content: 'Existing question', difficultyLevel: 'MEDIUM', topic: '', expectedAnswer: '' }));
    expect(JSON.stringify(vi.mocked(questionService.updateQuestion).mock.calls[0][1])).toContain('"expectedAnswer":""');
  });
});
