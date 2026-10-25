import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Edit3,
  CheckCircle2,
  FileText,
  Upload,
  Bot,
  CheckSquare,
  Square,
  Wand2,
} from 'lucide-react';
import { questionService, QuestionDto, CreateQuestionRequest, QuestionBatchItem } from '../../services/questionService';
import { getCourses, Course } from '../../services/courseService';
import { generateQuestionsFromMaterials, QuestionItemAi } from '../../services/aiService';
import { UserAccount } from '../../types';
import { Language } from '../../utils/i18n';

interface QuestionBankPageProps {
  currentUser?: UserAccount | null;
  language: Language;
  initialCourseId?: string;
}

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({
  currentUser,
  language,
  initialCourseId,
}) => {
  const isVi = language === 'vi';
  const t = (vi: string, en: string) => (isVi ? vi : en);

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Expanded expected answer state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDto | null>(null);
  const [formCourseId, setFormCourseId] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<string>('MEDIUM');
  const [formTopic, setFormTopic] = useState<string>('');
  const [formExpectedAnswer, setFormExpectedAnswer] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal Batch Create
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchCourseId, setBatchCourseId] = useState<string>('');
  const [batchDefaultTopic, setBatchDefaultTopic] = useState<string>('');
  const [batchDefaultDifficulty, setBatchDefaultDifficulty] = useState<string>('MEDIUM');
  const [batchRawText, setBatchRawText] = useState<string>('');
  const [batchError, setBatchError] = useState<string>('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState<boolean>(false);

  // Modal AI Generate Questions
  const [isAiConfigOpen, setIsAiConfigOpen] = useState<boolean>(false);
  const [aiCourseId, setAiCourseId] = useState<string>('');
  const [aiGenCount, setAiGenCount] = useState<number>(5);
  const [aiGenDifficulty, setAiGenDifficulty] = useState<'BALANCED' | 'EASY' | 'MEDIUM' | 'HARD'>('BALANCED');
  const [aiGenTopicHint, setAiGenTopicHint] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiGenError, setAiGenError] = useState<string>('');

  // Modal AI Review & Approve
  const [isAiReviewOpen, setIsAiReviewOpen] = useState<boolean>(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuestionItemAi[]>([]);
  const [selectedAiIndices, setSelectedAiIndices] = useState<Set<number>>(new Set());
  const [aiReviewCourseId, setAiReviewCourseId] = useState<string>('');
  const [aiReviewCourseName, setAiReviewCourseName] = useState<string>('');
  const [isAiBatchSaving, setIsAiBatchSaving] = useState<boolean>(false);

  // Single Question AI Suggestion state in Create Modal
  const [isAiAutofillingSingle, setIsAiAutofillingSingle] = useState<boolean>(false);

  // Delete Confirm Modal
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionDto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: 'success' | 'error') => {
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    setNotification({ msg, type });
    notifyTimer.current = setTimeout(() => setNotification(null), 4000);
  };

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Load questions when filter changes
  useEffect(() => {
    loadQuestions();
  }, [selectedCourseId, selectedDifficulty, searchQuery]);

  async function loadCourses() {
    try {
      const data = await getCourses();
      setCourses(data);
      if (initialCourseId && data.some(c => c.id === initialCourseId)) {
        setSelectedCourseId(initialCourseId);
      }
    } catch (err: any) {
      console.error('Failed to load courses', err);
    }
  }

  async function loadQuestions() {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedCourseId) params.courseId = selectedCourseId;
      if (selectedDifficulty && selectedDifficulty !== 'ALL') params.difficulty = selectedDifficulty;
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const data = await questionService.getQuestions(params);
      setQuestions(data);
    } catch (err: any) {
      console.error('Failed to load questions', err);
      showToast(err.response?.data?.message || t('Không thể tải danh sách câu hỏi.', 'Failed to load questions.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Stats computation
  const stats = useMemo(() => {
    const total = questions.length;
    const easy = questions.filter(q => (q.difficultyLevel || '').toUpperCase() === 'EASY').length;
    const medium = questions.filter(q => (q.difficultyLevel || '').toUpperCase() === 'MEDIUM').length;
    const hard = questions.filter(q => (q.difficultyLevel || '').toUpperCase() === 'HARD').length;
    return { total, easy, medium, hard };
  }, [questions]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormCourseId(selectedCourseId || (courses[0]?.id ?? ''));
    setFormContent('');
    setFormDifficulty('MEDIUM');
    setFormTopic('');
    setFormExpectedAnswer('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (q: QuestionDto) => {
    setEditingQuestion(q);
    setFormCourseId(q.courseId);
    setFormContent(q.content);
    setFormDifficulty(q.difficultyLevel || 'MEDIUM');
    setFormTopic(q.topic || '');
    setFormExpectedAnswer(q.expectedAnswer || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Create or Edit Question
  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!formContent.trim()) {
      setFormError(t('Nội dung câu hỏi không được để trống.', 'Question content cannot be blank.'));
      return;
    }
    if (!formCourseId) {
      setFormError(t('Vui lòng chọn môn học cho câu hỏi.', 'Please select a course for the question.'));
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingQuestion) {
        await questionService.updateQuestion(editingQuestion.id, {
          content: formContent.trim(),
          difficultyLevel: formDifficulty,
          topic: formTopic.trim() || undefined,
          expectedAnswer: formExpectedAnswer.trim() || undefined,
        });
        showToast(t('Cập nhật câu hỏi thành công!', 'Question updated successfully!'), 'success');
      } else {
        await questionService.createQuestion({
          courseId: formCourseId,
          content: formContent.trim(),
          difficultyLevel: formDifficulty,
          topic: formTopic.trim() || undefined,
          expectedAnswer: formExpectedAnswer.trim() || undefined,
        });
        showToast(t('Tạo câu hỏi mới thành công!', 'Question created successfully!'), 'success');
      }
      setIsModalOpen(false);
      loadQuestions();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || t('Lưu câu hỏi thất bại.', 'Failed to save question.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Parse batch raw text into QuestionBatchItem array
  const parsedBatchQuestions = useMemo((): QuestionBatchItem[] => {
    if (!batchRawText.trim()) return [];
    // Split by empty lines or lines starting with numbers like "1.", "2."
    const lines = batchRawText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const items: QuestionBatchItem[] = [];

    for (const rawLine of lines) {
      // Remove leading bullet or numbering: "1. ", "1/ ", "- "
      const cleaned = rawLine.replace(/^(\d+[\.\/\)]\s*|[-*•]\s*)/, '').trim();
      if (cleaned.length > 3) {
        items.push({
          content: cleaned,
          difficultyLevel: batchDefaultDifficulty,
          topic: batchDefaultTopic.trim() || undefined,
        });
      }
    }
    return items;
  }, [batchRawText, batchDefaultDifficulty, batchDefaultTopic]);

  // Open Batch Create Modal
  const openBatchModal = () => {
    setBatchCourseId(selectedCourseId || (courses[0]?.id ?? ''));
    setBatchDefaultTopic('');
    setBatchDefaultDifficulty('MEDIUM');
    setBatchRawText('');
    setBatchError('');
    setIsBatchModalOpen(true);
  };

  // Submit Batch Create
  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batchCourseId) {
      setBatchError(t('Vui lòng chọn môn học.', 'Please select a course.'));
      return;
    }
    if (parsedBatchQuestions.length === 0) {
      setBatchError(t('Vui lòng nhập ít nhất một câu hỏi hợp lệ.', 'Please enter at least one valid question.'));
      return;
    }

    setIsBatchSubmitting(true);
    setBatchError('');
    try {
      const created = await questionService.createBatchQuestions({
        courseId: batchCourseId,
        questions: parsedBatchQuestions,
      });
      showToast(
        t(`Đã thêm thành công ${created.length} câu hỏi vào ngân hàng!`, `Successfully added ${created.length} questions!`),
        'success'
      );
      setIsBatchModalOpen(false);
      loadQuestions();
    } catch (err: any) {
      setBatchError(err.response?.data?.message || err.message || t('Thêm câu hỏi thất bại.', 'Failed to add questions.'));
    } finally {
      setIsBatchSubmitting(false);
    }
  }

  // Delete Question
  async function handleDeleteQuestion() {
    if (!deletingQuestion) return;
    setIsDeleting(true);
    try {
      await questionService.deleteQuestion(deletingQuestion.id);
      showToast(t('Đã xóa câu hỏi khỏi ngân hàng.', 'Question deleted from bank.'), 'success');
      setDeletingQuestion(null);
      loadQuestions();
    } catch (err: any) {
      showToast(err.response?.data?.message || t('Xóa câu hỏi thất bại.', 'Failed to delete question.'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  // Open AI Config modal
  const openAiConfigModal = () => {
    setAiCourseId(selectedCourseId || (courses[0]?.id ?? ''));
    setAiGenCount(5);
    setAiGenDifficulty('BALANCED');
    setAiGenTopicHint('');
    setAiGenError('');
    setIsAiConfigOpen(true);
  };

  // Run AI generation from materials
  async function handleRunAiGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!aiCourseId) {
      setAiGenError(t('Vui lòng chọn môn học để AI phân tích học liệu.', 'Please select a course for AI analysis.'));
      return;
    }
    setIsAiGenerating(true);
    setAiGenError('');

    try {
      const res = await generateQuestionsFromMaterials(aiCourseId, {
        count: aiGenCount,
        difficulty: aiGenDifficulty,
        topicHint: aiGenTopicHint,
      });

      if (!res.questions || res.questions.length === 0) {
        throw new Error(
          t(
            'AI không tạo được câu hỏi nào. Vui lòng kiểm tra tài liệu học liệu môn học đã được nạp chưa.',
            'No questions were generated. Please verify that course documents have been uploaded.'
          )
        );
      }

      setAiReviewCourseId(aiCourseId);
      setAiReviewCourseName(res.course_name || courses.find(c => c.id === aiCourseId)?.courseName || '');
      setAiGeneratedQuestions(res.questions);
      setSelectedAiIndices(new Set(res.questions.map((_, i) => i)));
      setIsAiConfigOpen(false);
      setIsAiReviewOpen(true);
    } catch (err: any) {
      console.error('AI generation failed', err);
      const msg =
        err.response?.data?.detail || err.message || t('Lỗi kết nối AI sinh câu hỏi.', 'Failed to generate questions with AI.');
      setAiGenError(msg);
    } finally {
      setIsAiGenerating(false);
    }
  }

  // Toggle selection for AI items
  const toggleAiSelect = (index: number) => {
    setSelectedAiIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAiSelectAll = () => {
    if (selectedAiIndices.size === aiGeneratedQuestions.length) {
      setSelectedAiIndices(new Set());
    } else {
      setSelectedAiIndices(new Set(aiGeneratedQuestions.map((_, i) => i)));
    }
  };

  const updateAiQuestionItem = (index: number, field: keyof QuestionItemAi, value: string) => {
    setAiGeneratedQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Save approved AI questions via Spring Boot batch create
  async function handleSaveApprovedAiQuestions() {
    const selectedQuestions = aiGeneratedQuestions.filter((_, idx) => selectedAiIndices.has(idx));
    if (selectedQuestions.length === 0) {
      showToast(t('Vui lòng chọn ít nhất 1 câu hỏi để thêm vào ngân hàng.', 'Please select at least 1 question to add.'), 'error');
      return;
    }

    setIsAiBatchSaving(true);
    try {
      const batchPayload: QuestionBatchItem[] = selectedQuestions.map(q => ({
        content: q.content.trim(),
        difficultyLevel: q.difficulty_level || 'MEDIUM',
        topic: q.topic?.trim() || undefined,
        expectedAnswer: q.expected_answer?.trim() || undefined,
      }));

      const created = await questionService.createBatchQuestions({
        courseId: aiReviewCourseId,
        questions: batchPayload,
      });

      showToast(
        t(
          `Đã thêm thành công ${created.length} câu hỏi AI gợi ý vào Ngân hàng!`,
          `Successfully added ${created.length} AI questions to Question Bank!`
        ),
        'success'
      );
      setIsAiReviewOpen(false);
      if (selectedCourseId !== aiReviewCourseId) {
        setSelectedCourseId(aiReviewCourseId);
      } else {
        loadQuestions();
      }
    } catch (err: any) {
      console.error('Failed to save approved questions', err);
      showToast(err.response?.data?.message || err.message || t('Lưu câu hỏi AI thất bại.', 'Failed to save AI questions.'), 'error');
    } finally {
      setIsAiBatchSaving(false);
    }
  }

  // Quick single question autofill inside Create Modal
  async function handleAiAutofillSingleQuestion() {
    if (!formCourseId) {
      setFormError(t('Vui lòng chọn môn học trước khi yêu cầu AI gợi ý câu hỏi.', 'Please select a course first before requesting AI suggestion.'));
      return;
    }
    setIsAiAutofillingSingle(true);
    setFormError('');
    try {
      const res = await generateQuestionsFromMaterials(formCourseId, {
        count: 1,
        difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(formDifficulty) ? formDifficulty : 'BALANCED') as any,
        topicHint: formTopic.trim() || undefined,
      });
      if (res.questions && res.questions.length > 0) {
        const q = res.questions[0];
        setFormContent(q.content);
        if (q.topic) setFormTopic(q.topic);
        if (q.difficulty_level) setFormDifficulty(q.difficulty_level);
        if (q.expected_answer) setFormExpectedAnswer(q.expected_answer);
        showToast(t('AI đã gợi ý thành công nội dung câu hỏi!', 'AI question suggested successfully!'), 'success');
      } else {
        throw new Error(t('Không nhận được câu hỏi từ AI.', 'No question returned from AI.'));
      }
    } catch (err: any) {
      setFormError(
        err.response?.data?.detail ||
          err.message ||
          t('Không thể gợi ý từ AI. Hãy đảm bảo môn học đã có tài liệu.', 'Failed to get AI suggestion. Ensure course has materials uploaded.')
      );
    } finally {
      setIsAiAutofillingSingle(false);
    }
  }

  const getDifficultyBadge = (level?: string) => {
    const norm = (level || '').toUpperCase();
    if (norm === 'EASY') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
          {t('Dễ', 'Easy')}
        </span>
      );
    }
    if (norm === 'HARD') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
          {t('Khó', 'Hard')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
        {t('Trung bình', 'Medium')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-sm font-medium">{notification.msg}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t('Ngân hàng Đề thi & Câu hỏi Vấn đáp', 'Question Bank & Viva Voce')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({currentUser?.role === 'ADMIN' ? t('Quyền Quản trị viên', 'Admin Role') : t('Quyền Giảng viên', 'Lecturer Role')})
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('Quản lý Ngân hàng Câu hỏi', 'Question Bank Management')}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t(
                'Quản lý kho câu hỏi theo môn học, gán chủ đề và đáp án gợi ý để Giám khảo AI đối chiếu và chấm điểm tự động.',
                'Manage course question bank, assign topics and expected answer rubrics for AI examiner evaluation.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={openAiConfigModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800/80 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/50 dark:hover:to-indigo-900/50 transition-all cursor-pointer shadow-2xs"
            >
              <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>{t('✨ AI Gợi ý câu hỏi từ Học liệu', '✨ AI Question Generator')}</span>
            </button>
            <button
              onClick={openBatchModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer shadow-2xs"
            >
              <Upload className="h-4 w-4" />
              {t('Thêm nhanh nhiều câu', 'Batch Import')}
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t('Tạo câu hỏi mới', 'Create Question')}
            </button>
            <button
              onClick={loadQuestions}
              disabled={isLoading}
              title={t('Tải lại', 'Refresh')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-100 dark:border-slate-800/60">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Tổng số câu hỏi', 'Total Questions')}</span>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t('Độ khó Dễ', 'Easy Level')}</span>
            <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.easy}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('Trung bình', 'Medium Level')}</span>
            <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">{stats.medium}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">{t('Độ khó Khó', 'Hard Level')}</span>
            <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">{stats.hard}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Course Dropdown */}
          <div className="relative min-w-[220px]">
            <BookOpen className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
            >
              <option value="">{t('-- Tất cả các môn học --', '-- All Courses --')}</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.courseName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('Tìm kiếm nội dung, chủ đề câu hỏi...', 'Search questions by content, topic...')}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-9 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Difficulty Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map(diff => {
            const active = selectedDifficulty === diff;
            const labels = {
              ALL: [t('Tất cả', 'All')],
              EASY: [t('Dễ', 'Easy')],
              MEDIUM: [t('Trung bình', 'Medium')],
              HARD: [t('Khó', 'Hard')],
            };
            return (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {labels[diff][0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('Đang tải danh sách câu hỏi…', 'Loading questions…')}</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
            <FileQuestion className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('Chưa có câu hỏi nào phù hợp', 'No questions found')}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {selectedCourseId
              ? t('Môn học này hiện chưa có câu hỏi nào. Hãy thêm câu hỏi mới để hệ thống gán vào kỳ thi.', 'This course does not have questions yet. Add questions so exams can pull them into schedules.')
              : t('Không tìm thấy câu hỏi phù hợp với bộ lọc tìm kiếm hiện tại.', 'No questions match the current filter criteria.')}
          </p>
          <div className="mt-4 flex gap-2 flex-wrap justify-center">
            <button
              onClick={openAiConfigModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs"
            >
              <Bot className="h-4 w-4" />
              {t('✨ AI Gợi ý câu hỏi từ tài liệu', '✨ AI Suggest from Materials')}
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {t('Tạo câu hỏi đầu tiên', 'Add First Question')}
            </button>
            <button
              onClick={openBatchModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              {t('Thêm nhanh nhiều câu', 'Batch Import')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = expandedIds.has(q.id);
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      <BookOpen className="h-3 w-3" />
                      {q.courseCode || 'Course'}
                    </span>
                    {q.topic && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Layers className="h-3 w-3" />
                        {q.topic}
                      </span>
                    )}
                    {getDifficultyBadge(q.difficultyLevel)}
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button
                      onClick={() => openEditModal(q)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      title={t('Chỉnh sửa', 'Edit')}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title={t('Xóa', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {q.content}
                  </p>
                </div>

                {/* Expected Answer / AI Rubric section */}
                {q.expectedAnswer && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => toggleExpand(q.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{t('Gợi ý đáp án & Tiêu chí Giám khảo AI', 'Expected Answer & AI Rubric')}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 leading-relaxed whitespace-pre-wrap border border-slate-200/60 dark:border-slate-700/60">
                        {q.expectedAnswer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Question */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingQuestion ? t('Chỉnh sửa câu hỏi', 'Edit Question') : t('Tạo câu hỏi mới', 'Create Question')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="mt-4 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Course select (disabled if editing) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Môn học *', 'Course *')}
                </label>
                <select
                  disabled={Boolean(editingQuestion)}
                  value={formCourseId}
                  onChange={e => setFormCourseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                >
                  <option value="">{t('-- Chọn môn học --', '-- Select Course --')}</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('Chủ đề / Chương (Topic)', 'Topic / Syllabus Section')}
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="VD: Microservices, Design Patterns..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('Độ khó *', 'Difficulty Level *')}
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="EASY">{t('Dễ (EASY)', 'Easy (EASY)')}</option>
                    <option value="MEDIUM">{t('Trung bình (MEDIUM)', 'Medium (MEDIUM)')}</option>
                    <option value="HARD">{t('Khó (HARD)', 'Hard (HARD)')}</option>
                  </select>
                </div>
              </div>

              {/* Content with AI Autofill Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('Nội dung câu hỏi vấn đáp *', 'Oral Examination Question Content *')}
                  </label>
                  {!editingQuestion && (
                    <button
                      type="button"
                      disabled={isAiAutofillingSingle || !formCourseId}
                      onClick={handleAiAutofillSingleQuestion}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 transition-colors cursor-pointer"
                      title={t('Dùng AI tạo gợi ý 1 câu hỏi từ tài liệu học liệu môn này', 'Use AI to suggest 1 question from course materials')}
                    >
                      {isAiAutofillingSingle ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      )}
                      <span>
                        {isAiAutofillingSingle
                          ? t('AI đang sinh…', 'AI generating…')
                          : t('✨ AI gợi ý 1 câu', '✨ AI suggest 1 question')}
                      </span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  required
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder={t(
                    'Nhập câu hỏi mà Giám khảo AI sẽ đọc cho thí sinh...',
                    'Enter the oral question that the AI Examiner will speak to candidates...'
                  )}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                />
              </div>

              {/* Expected Answer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Gợi ý đáp án / Tiêu chí chấm Giám khảo AI (Tùy chọn)', 'Expected Answer / AI Evaluation Rubric (Optional)')}
                </label>
                <textarea
                  rows={3}
                  value={formExpectedAnswer}
                  onChange={e => setFormExpectedAnswer(e.target.value)}
                  placeholder={t(
                    'Các ý chính, từ khóa hoặc khái niệm cốt lõi thí sinh cần nêu ra để đạt điểm tối đa...',
                    'Key concepts, keywords, or core ideas candidate should mention to achieve full marks...'
                  )}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {t(
                    'Giám khảo AI sẽ dựa vào tiêu chí này để phân tích câu trả lời và đặt câu hỏi đào sâu phù hợp.',
                    'The AI Examiner uses this rubric to analyze answers and generate relevant follow-up probes.'
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('Hủy', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmitting ? t('Đang lưu…', 'Saving…') : t('Lưu câu hỏi', 'Save Question')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Import Questions */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('Thêm nhanh nhiều câu hỏi vào môn học', 'Batch Import Questions to Course')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('Dán danh sách nhiều câu hỏi cùng lúc (mỗi dòng một câu).', 'Paste multiple questions at once (one question per line).')}
                </p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="mt-4 space-y-4">
              {batchError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              {/* Course select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Môn học tiếp nhận *', 'Target Course *')}
                </label>
                <select
                  value={batchCourseId}
                  onChange={e => setBatchCourseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                >
                  <option value="">{t('-- Chọn môn học --', '-- Select Course --')}</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default topic & difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('Chủ đề mặc định cho đợt này', 'Default Topic for Batch')}
                  </label>
                  <input
                    type="text"
                    value={batchDefaultTopic}
                    onChange={e => setBatchDefaultTopic(e.target.value)}
                    placeholder="VD: Core Architecture, OOP..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('Độ khó mặc định', 'Default Difficulty')}
                  </label>
                  <select
                    value={batchDefaultDifficulty}
                    onChange={e => setBatchDefaultDifficulty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="EASY">{t('Dễ (EASY)', 'Easy (EASY)')}</option>
                    <option value="MEDIUM">{t('Trung bình (MEDIUM)', 'Medium (MEDIUM)')}</option>
                    <option value="HARD">{t('Khó (HARD)', 'Hard (HARD)')}</option>
                  </select>
                </div>
              </div>

              {/* Raw Text Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('Danh sách câu hỏi (Mỗi dòng một câu) *', 'Questions List (One per line) *')}
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {t(`Nhận diện: ${parsedBatchQuestions.length} câu`, `Parsed: ${parsedBatchQuestions.length} questions`)}
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={batchRawText}
                  onChange={e => setBatchRawText(e.target.value)}
                  placeholder={`1. Trình bày sự khác biệt giữa Monolith và Microservices?\n2. Khi nào nên áp dụng cơ chế Event-driven Architecture?\n3. Giải thích nguyên lý SOLID trong thiết kế phần mềm?\n4. CAP Theorem phát biểu như thế nào và ý nghĩa trong CSDL phân tán?`}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                />
              </div>

              {/* Preview Box */}
              {parsedBatchQuestions.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/50 max-h-40 overflow-y-auto">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('Xem trước danh sách chuẩn bị thêm:', 'Preview questions to be added:')}
                  </span>
                  <ul className="space-y-1 list-decimal list-inside text-slate-600 dark:text-slate-300">
                    {parsedBatchQuestions.map((item, idx) => (
                      <li key={idx} className="truncate">
                        {item.content}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isBatchSubmitting}
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('Hủy', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isBatchSubmitting || parsedBatchQuestions.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isBatchSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {isBatchSubmitting
                      ? t('Đang nhập…', 'Importing…')
                      : t(`Thêm ${parsedBatchQuestions.length} câu hỏi`, `Import ${parsedBatchQuestions.length} Questions`)}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirm */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('Xóa câu hỏi khỏi ngân hàng?', 'Delete Question from Bank?')}
              </h2>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(
                'Bạn có chắc chắn muốn xóa câu hỏi này? Nếu câu hỏi đã được gán vào lịch thi trước đó, snapshot nội dung trong ca thi vẫn sẽ được lưu giữ.',
                'Are you sure you want to delete this question? Content snapshots of already assigned exam schedules will remain preserved.'
              )}
            </p>
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-medium italic border border-slate-200/60 dark:border-slate-700/60">
              "{deletingQuestion.content}"
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                {t('Hủy', 'Cancel')}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isDeleting ? t('Đang xóa…', 'Deleting…') : t('Xác nhận xóa', 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Generate Questions Config */}
      {isAiConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('AI Sinh Câu Hỏi Gợi Ý từ Học Liệu', 'AI Question Generator from Materials')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t(
                      'Phân tích giáo trình & rubric để sinh câu hỏi vấn đáp chuẩn hóa',
                      'Analyze course documents & rubrics to generate oral questions'
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiConfigOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRunAiGenerate} className="mt-4 space-y-4">
              {aiGenError && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{aiGenError}</span>
                  </div>
                </div>
              )}

              {/* Target Course */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Môn học cần phân tích học liệu *', 'Target Course for Analysis *')}
                </label>
                <select
                  value={aiCourseId}
                  onChange={e => setAiCourseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                >
                  <option value="">{t('-- Chọn môn học --', '-- Select Course --')}</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  {t(
                    'AI sẽ đọc các đoạn văn bản (chunks) từ tài liệu môn học và tiêu chí rubric đã được nạp.',
                    'AI reads document chunks and rubric criteria previously uploaded for this course.'
                  )}
                </p>
              </div>

              {/* Number of questions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Số lượng câu hỏi muốn sinh (1 - 20)', 'Number of questions to generate (1 - 20)')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={aiGenCount}
                    onChange={e => setAiGenCount(parseInt(e.target.value, 10))}
                    className="flex-1 accent-purple-600"
                  />
                  <span className="w-12 text-center py-1 px-2.5 rounded-lg border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {aiGenCount}
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[3, 5, 8, 10, 15].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setAiGenCount(cnt)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                        aiGenCount === cnt
                          ? 'border-purple-500 bg-purple-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {cnt} {t('câu', 'qs')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Strategy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Định hướng mức độ khó', 'Difficulty Distribution')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'BALANCED', label: t('Cân đối Bloom', 'Balanced Bloom'), desc: t('Tỉ lệ Dễ - Vừa - Khó', 'Ratio Easy - Med - Hard') },
                    { val: 'EASY', label: t('Ưu tiên Dễ', 'Focus Easy'), desc: t('Nhớ & Hiểu khái niệm', 'Remember & Understand') },
                    { val: 'MEDIUM', label: t('Ưu tiên Trung bình', 'Focus Medium'), desc: t('Vận dụng & Phân tích', 'Apply & Analyze') },
                    { val: 'HARD', label: t('Ưu tiên Khó', 'Focus Hard'), desc: t('Đánh giá & Xử lý tình huống', 'Evaluate & Scenario') },
                  ].map(d => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setAiGenDifficulty(d.val as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        aiGenDifficulty === d.val
                          ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{d.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Topic Hint */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Chủ đề hoặc Chương muốn tập trung (Tùy chọn)', 'Target Topic or Chapter Hint (Optional)')}
                </label>
                <input
                  type="text"
                  value={aiGenTopicHint}
                  onChange={e => setAiGenTopicHint(e.target.value)}
                  placeholder={t(
                    'VD: Microservices Architecture, Clean Architecture, Bảo mật API...',
                    'e.g. Microservices, Clean Architecture, API Security...'
                  )}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300">
                <span className="font-semibold block mb-1">
                  💡 {t('Quy trình duyệt trước khi lưu:', 'Approval workflow:')}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {t(
                    'Sau khi AI hoàn thành, danh sách câu hỏi sẽ hiển thị ở bảng duyệt để bạn kiểm tra, chỉnh sửa nội dung, hoặc bỏ chọn những câu không phù hợp trước khi chính thức đưa vào CSDL.',
                    'Once generated, questions will be presented in a review table for you to inspect, edit, or reject before saving to the database.'
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={() => setIsAiConfigOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('Hủy', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isAiGenerating || !aiCourseId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('AI đang phân tích & sinh câu hỏi…', 'AI analyzing & generating…')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{t(`Sinh ${aiGenCount} câu hỏi gợi ý`, `Generate ${aiGenCount} Questions`)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Review & Approval Table */}
      {isAiReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('Duyệt & Chấp Thuận Câu Hỏi AI Gợi Ý', 'Review & Approve AI Questions')}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {aiGeneratedQuestions.length} {t('câu hỏi', 'questions')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('Môn học:', 'Course:')} <span className="font-semibold text-slate-700 dark:text-slate-200">{aiReviewCourseName}</span>
                    {' • '}{t('Bạn có thể sửa nội dung trực tiếp trước khi nhấn Lưu.', 'You can edit fields inline before saving.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAiSelectAll}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {selectedAiIndices.size === aiGeneratedQuestions.length
                    ? t('Bỏ chọn tất cả', 'Deselect All')
                    : t('Chọn tất cả', 'Select All')}
                </button>
                <button
                  onClick={() => setIsAiReviewOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* List of Questions */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {aiGeneratedQuestions.map((q, idx) => {
                const isSelected = selectedAiIndices.has(idx);
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-purple-300 bg-purple-50/20 dark:border-purple-800/80 dark:bg-purple-950/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40 opacity-70'
                    }`}
                  >
                    {/* Item Toolbar */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleAiSelect(idx)}
                          className="text-purple-600 dark:text-purple-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}
                        </button>
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/60 text-xs font-bold text-purple-700 dark:text-purple-300">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {isSelected ? t('Đã chọn lưu', 'Approved to save') : t('Bỏ qua', 'Skipped')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Topic Input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-400">{t('Chủ đề:', 'Topic:')}</span>
                          <input
                            type="text"
                            value={q.topic || ''}
                            onChange={e => updateAiQuestionItem(idx, 'topic', e.target.value)}
                            placeholder={t('Chủ đề...', 'Topic...')}
                            className="w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        {/* Difficulty Select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-400">{t('Độ khó:', 'Diff:')}</span>
                          <select
                            value={(q.difficulty_level || 'MEDIUM').toUpperCase()}
                            onChange={e => updateAiQuestionItem(idx, 'difficulty_level', e.target.value)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            <option value="EASY">{t('Dễ', 'Easy')}</option>
                            <option value="MEDIUM">{t('Trung bình', 'Medium')}</option>
                            <option value="HARD">{t('Khó', 'Hard')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {t('Nội dung câu hỏi vấn đáp:', 'Oral Question Content:')}
                      </label>
                      <textarea
                        rows={2}
                        value={q.content}
                        onChange={e => updateAiQuestionItem(idx, 'content', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                      />
                    </div>

                    {/* Expected Answer */}
                    <div className="mt-2.5 space-y-1">
                      <label className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                        {t('Gợi ý đáp án & Tiêu chí Giám khảo AI chấm:', 'Expected Answer & AI Scoring Rubric:')}
                      </label>
                      <textarea
                        rows={2}
                        value={q.expected_answer || ''}
                        onChange={e => updateAiQuestionItem(idx, 'expected_answer', e.target.value)}
                        placeholder={t('Từ khóa, khái niệm thí sinh cần nêu ra...', 'Key concepts candidate should mention...')}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 leading-relaxed font-mono text-[11px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t('Đã chấp thuận:', 'Selected:')}{' '}
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {selectedAiIndices.size} / {aiGeneratedQuestions.length}
                </span>{' '}
                {t('câu hỏi', 'questions')}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isAiBatchSaving}
                  onClick={() => setIsAiReviewOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('Hủy bỏ', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={isAiBatchSaving || selectedAiIndices.size === 0}
                  onClick={handleSaveApprovedAiQuestions}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAiBatchSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('Đang lưu vào ngân hàng…', 'Saving to Question Bank…')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {t(
                          `Chấp thuận & Lưu ${selectedAiIndices.size} câu hỏi vào Ngân hàng`,
                          `Approve & Save ${selectedAiIndices.size} Questions to Bank`
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
