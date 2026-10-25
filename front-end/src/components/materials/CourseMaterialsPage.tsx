import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileText,
  UploadCloud,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  Award,
  RefreshCw,
  Plus,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { Language } from '../../utils/i18n';
import { UserAccount } from '../../types';
import { getCourses, Course } from '../../services/courseService';
import {
  getCourseDocuments,
  uploadCourseDocument,
  deleteCourseDocument,
  getCourseRubrics,
  previewRubricFile,
  saveCourseRubric,
  deleteCourseRubric,
  getAiCourses,
  AiCourse,
  CourseDocument,
  RubricData,
  RubricCriterion,
} from '../../services/aiService';

interface CourseMaterialsPageProps {
  currentUser?: UserAccount | null;
  language?: Language;
}

export const CourseMaterialsPage: React.FC<CourseMaterialsPageProps> = ({
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  // 1. Course Selection State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);

  // 2. Tab Navigation ('documents' | 'rubrics')
  const [activeTab, setActiveTab] = useState<'documents' | 'rubrics'>('documents');

  // 3. Document Management State
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [uploadDocProgress, setUploadDocProgress] = useState<number>(0);
  const [docDeletingId, setDocDeletingId] = useState<string | null>(null);

  // 4. Rubric Management State
  const [rubrics, setRubrics] = useState<RubricData[]>([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(false);
  const [isParsingRubric, setIsParsingRubric] = useState<boolean>(false);
  const [isSavingRubric, setIsSavingRubric] = useState<boolean>(false);
  const [rubricDeletingId, setRubricDeletingId] = useState<string | null>(null);

  // Form for New / Draft Rubric
  const [draftRubricTitle, setDraftRubricTitle] = useState<string>('');
  const [draftCriteria, setDraftCriteria] = useState<RubricCriterion[]>([]);
  const [showRubricForm, setShowRubricForm] = useState<boolean>(false);

  // Feedback Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const rubricInputRef = useRef<HTMLInputElement>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch courses on mount (kết nối trực tiếp Python AI, fallback Spring Boot)
  useEffect(() => {
    async function loadCourses() {
      setIsLoadingCourses(true);
      try {
        // Ưu tiên tải trực tiếp từ Python AI API theo thiết kế
        const aiList = await getAiCourses();
        if (aiList && aiList.length > 0) {
          setCourses(aiList);
          setSelectedCourseId(aiList[0].id);
          setIsLoadingCourses(false);
          return;
        }
      } catch (aiErr) {
        console.warn('Python AI getAiCourses chưa sẵn sàng, thử tải qua Spring Boot:', aiErr);
      }

      try {
        const list = await getCourses();
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourseId(list[0].id);
        }
      } catch (err: any) {
        showNotify('error', err.message || 'Không thể tải danh sách môn học.');
      } finally {
        setIsLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  // Fetch documents and rubrics when course changes
  useEffect(() => {
    if (!selectedCourseId) return;

    loadDocuments(selectedCourseId);
    loadRubrics(selectedCourseId);
  }, [selectedCourseId]);

  async function loadDocuments(courseId: string) {
    setIsLoadingDocs(true);
    try {
      const docs = await getCourseDocuments(courseId);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      // Không chặn UI nếu server AI chưa mở
    } finally {
      setIsLoadingDocs(false);
    }
  }

  async function loadRubrics(courseId: string) {
    setIsLoadingRubrics(true);
    try {
      const list = await getCourseRubrics(courseId);
      setRubrics(list);
    } catch (err: any) {
      console.error('Error fetching rubrics:', err);
    } finally {
      setIsLoadingRubrics(false);
    }
  }

  // Handle Document Upload
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourseId) return;

    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      showNotify('error', isVi ? 'Chỉ hỗ trợ file .pdf, .docx, .txt, .md' : 'Supported formats: .pdf, .docx, .txt, .md');
      return;
    }

    setIsUploadingDoc(true);
    setUploadDocProgress(10);
    try {
      await uploadCourseDocument(selectedCourseId, file, (percent) => {
        setUploadDocProgress(percent);
      });
      showNotify('success', isVi ? `Đã nạp và nhúng vector file "${file.name}" thành công!` : `Document "${file.name}" embedded successfully!`);
      await loadDocuments(selectedCourseId);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi tải tài liệu lên AI Service.';
      showNotify('error', msg);
    } finally {
      setIsUploadingDoc(false);
      setUploadDocProgress(0);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // Handle Document Delete
  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!window.confirm(isVi ? `Bạn có chắc muốn xóa tài liệu "${filename}" và các vector chunks liên quan?` : `Delete document "${filename}" and its vector embeddings?`)) {
      return;
    }

    setDocDeletingId(docId);
    try {
      await deleteCourseDocument(selectedCourseId, docId);
      showNotify('success', isVi ? `Đã xóa tài liệu "${filename}" thành công.` : `Deleted "${filename}" successfully.`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      showNotify('error', err.response?.data?.detail || err.message || 'Lỗi khi xóa tài liệu.');
    } finally {
      setDocDeletingId(null);
    }
  };

  // Handle Rubric File Preview (Gemini Parse)
  const handleRubricFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingRubric(true);
    try {
      const parsed = await previewRubricFile(file);
      setDraftRubricTitle(parsed.title || `Rubric môn học ${selectedCourse?.courseCode || ''}`);
      setDraftCriteria(parsed.criteria || []);
      setShowRubricForm(true);
      showNotify('success', isVi ? 'Gemini AI đã phân tích cấu trúc Rubric thành công. Bạn có thể kiểm tra và lưu.' : 'Gemini parsed rubric successfully. You can review and save.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi phân tích file rubric.';
      showNotify('error', msg);
    } finally {
      setIsParsingRubric(false);
      if (rubricInputRef.current) rubricInputRef.current.value = '';
    }
  };

  // Handle Manual Add Criterion
  const handleAddCriterion = () => {
    const newId = `crit_${Date.now()}`;
    setDraftCriteria((prev) => [
      ...prev,
      {
        id: newId,
        name: isVi ? 'Tiêu chí mới' : 'New Criterion',
        weight: 20,
        description: isVi ? 'Mô tả yêu cầu đạt điểm...' : 'Detailed criteria description...',
      },
    ]);
  };

  // Handle Remove Criterion
  const handleRemoveCriterion = (index: number) => {
    setDraftCriteria((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Handle Save Rubric
  const handleSaveRubric = async () => {
    if (!draftRubricTitle.trim()) {
      showNotify('error', isVi ? 'Vui lòng nhập tên Rubric.' : 'Please enter a Rubric title.');
      return;
    }
    if (draftCriteria.length === 0) {
      showNotify('error', isVi ? 'Rubric phải có ít nhất 1 tiêu chí.' : 'Rubric must contain at least 1 criterion.');
      return;
    }

    const totalWeight = draftCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      showNotify('error', isVi ? `Tổng trọng số các tiêu chí phải bằng 100% (Hiện tại là ${totalWeight}%).` : `Total criteria weight must equal 100% (Currently ${totalWeight}%).`);
      return;
    }

    setIsSavingRubric(true);
    try {
      const payload: RubricData = {
        title: draftRubricTitle.trim(),
        criteria: draftCriteria,
      };
      await saveCourseRubric(selectedCourseId, payload);
      showNotify('success', isVi ? 'Đã lưu Rubric cho môn học thành công!' : 'Saved rubric for course successfully!');
      setShowRubricForm(false);
      setDraftCriteria([]);
      setDraftRubricTitle('');
      await loadRubrics(selectedCourseId);
    } catch (err: any) {
      showNotify('error', err.response?.data?.detail || err.message || 'Lỗi khi lưu Rubric.');
    } finally {
      setIsSavingRubric(false);
    }
  };

  // Handle Rubric Delete
  const handleDeleteRubric = async (rubricId: string, title: string) => {
    if (!window.confirm(isVi ? `Bạn có chắc muốn xóa rubric "${title}"?` : `Are you sure you want to delete rubric "${title}"?`)) {
      return;
    }

    setRubricDeletingId(rubricId);
    try {
      await deleteCourseRubric(selectedCourseId, rubricId);
      showNotify('success', isVi ? `Đã xóa rubric "${title}" thành công.` : `Deleted rubric "${title}" successfully.`);
      setRubrics((prev) => prev.filter((r) => r.id !== rubricId));
    } catch (err: any) {
      showNotify('error', err.response?.data?.detail || err.message || 'Lỗi khi xóa rubric.');
    } finally {
      setRubricDeletingId(null);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const totalWeight = draftCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & COURSE SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                {isVi ? 'Quản lý Học liệu & Rubric AI' : 'Course Materials & AI Rubrics'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi
                  ? 'Nạp giáo trình vào Vector Database (Gemini pgvector) và cấu hình tiêu chí chấm điểm tự động.'
                  : 'Embed course documents into Vector DB and configure AI evaluation rubrics.'}
              </p>
            </div>
          </div>
        </div>

        {/* Course Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="course-select" className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {isVi ? 'Chọn môn học:' : 'Select Course:'}
          </label>
          <div className="relative min-w-56">
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={isLoadingCourses}
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoadingCourses ? (
                <option value="">{isVi ? 'Đang tải môn học...' : 'Loading courses...'}</option>
              ) : courses.length === 0 ? (
                <option value="">{isVi ? 'Chưa có môn học nào' : 'No courses found'}</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.courseCode}] {c.courseName}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. SUB-TAB SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isVi ? 'Tài liệu học tập (RAG Vector DB)' : 'Course Documents (RAG)'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'documents'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rubrics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'rubrics'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isVi ? 'Tiêu chí chấm điểm (Rubrics)' : 'Scoring Rubrics'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'rubrics'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {rubrics.length}
          </span>
        </button>
      </div>

      {/* 3. TAB 1: RAG DOCUMENTS CONTENT */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-600" />
                {isVi ? 'Tải lên tài liệu giáo trình mới' : 'Upload Course Learning Material'}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isVi ? 'Hỗ trợ PDF, DOCX, TXT, MD (Tối đa 20MB)' : 'Supports PDF, DOCX, TXT, MD (Max 20MB)'}
              </span>
            </div>

            <div
              onClick={() => docInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20"
            >
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleUploadDocument}
                disabled={isUploadingDoc || !selectedCourseId}
                className="hidden"
              />

              {isUploadingDoc ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isVi
                      ? 'Đang đọc nội dung, phân đoạn và tạo vector embedding qua Gemini...'
                      : 'Parsing chunks & generating 768-dim embeddings with Gemini...'}
                  </p>
                  <div className="w-48 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 transition-all duration-300"
                      style={{ width: `${uploadDocProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {isVi ? 'Kéo thả file tài liệu vào đây hoặc ' : 'Drag and drop course material here, or '}
                    <span className="text-indigo-600 dark:text-indigo-400 underline">
                      {isVi ? 'chọn từ máy tính' : 'browse computer'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isVi
                      ? 'AI sẽ tự động đọc hiểu và lưu vào Vector Database để làm tài liệu đối chiếu khi hỏi thi vấn đáp'
                      : 'AI will chunk and index this into Vector DB as knowledge ground truth for oral examinations'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Documents Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                {isVi ? 'Danh sách tài liệu đã nhúng Vector của môn' : 'Indexed Course Documents'}
                {selectedCourse && (
                  <span className="text-xs font-normal text-slate-500">
                    ({selectedCourse.courseCode} - {selectedCourse.courseName})
                  </span>
                )}
              </h2>
              <button
                onClick={() => loadDocuments(selectedCourseId)}
                disabled={isLoadingDocs}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDocs ? 'animate-spin' : ''}`} />
                {isVi ? 'Làm mới' : 'Refresh'}
              </button>
            </div>

            {isLoadingDocs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>{isVi ? 'Đang tải danh sách tài liệu...' : 'Loading indexed documents...'}</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center px-4">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isVi ? 'Chưa có tài liệu nào được nạp cho môn học này.' : 'No materials indexed for this course yet.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isVi ? 'Hãy tải lên file bài giảng hoặc giáo trình ở trên.' : 'Upload textbook or syllabus above to enable AI RAG context.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Tên tài liệu' : 'Document Name'}</th>
                      <th className="py-3 px-3 font-semibold text-center">{isVi ? 'Số đoạn Vector' : 'Vector Chunks'}</th>
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Mô hình Embedding' : 'Embedding Model'}</th>
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Ngày tải lên' : 'Uploaded At'}</th>
                      <th className="py-3 px-3 font-semibold text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.filename}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                            {doc.chunk_count} {isVi ? 'chunks' : 'chunks'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {doc.embedding_model || 'text-embedding-004'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {doc.created_at ? new Date(doc.created_at).toLocaleString(isVi ? 'vi-VN' : 'en-US') : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                            disabled={docDeletingId === doc.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-medium text-[11px]"
                            title={isVi ? 'Xóa tài liệu' : 'Delete document'}
                          >
                            {docDeletingId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>{isVi ? 'Xóa' : 'Delete'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: RUBRICS CONTENT */}
      {activeTab === 'rubrics' && (
        <div className="space-y-6">
          {/* Rubric Actions Header */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {isVi ? 'Nạp & Phân tích Rubric Chấm điểm' : 'Import & AI Parse Assessment Rubric'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isVi
                    ? 'Tải file Rubric bất kỳ (JSON, Word, PDF, Markdown) để Gemini tự động trích xuất các tiêu chí chấm điểm.'
                    : 'Upload any rubric file and Gemini will extract criteria, weights, and descriptions.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={rubricInputRef}
                  type="file"
                  accept=".json,.md,.txt,.docx,.pdf"
                  onChange={handleRubricFileSelect}
                  disabled={isParsingRubric}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => rubricInputRef.current?.click()}
                  disabled={isParsingRubric}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  {isParsingRubric ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  <span>{isVi ? 'Upload file Rubric' : 'Upload Rubric File'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDraftRubricTitle(`Rubric ${selectedCourse?.courseName || ''}`);
                    setDraftCriteria([
                      {
                        id: 'crit_knowledge',
                        name: isVi ? 'Kiến thức chuyên môn' : 'Core Knowledge',
                        weight: 40,
                        description: isVi ? 'Nắm vững lý thuyết cơ bản và giải thích đúng cơ chế cốt lõi.' : 'Demonstrates firm grasp of concepts.',
                      },
                      {
                        id: 'crit_reasoning',
                        name: isVi ? 'Tư duy phản biện' : 'Critical Reasoning',
                        weight: 30,
                        description: isVi ? 'Khả năng phân tích tình huống và ứng biến câu hỏi phụ.' : 'Applies analytical thinking and answers follow-up probes.',
                      },
                      {
                        id: 'crit_presentation',
                        name: isVi ? 'Kỹ năng trình bày' : 'Communication & Clarity',
                        weight: 30,
                        description: isVi ? 'Giao tiếp rõ ràng, mạch lạc và tự tin khi trả lời vấn đáp.' : 'Clear and confident delivery.',
                      },
                    ]);
                    setShowRubricForm(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isVi ? 'Tạo mẫu chuẩn' : 'Create Standard Template'}</span>
                </button>
              </div>
            </div>

            {/* AI Parsing Rubric Progress Indicator */}
            {isParsingRubric && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {isVi ? 'Gemini AI đang đọc hiểu và trích xuất cấu trúc Rubric...' : 'Gemini AI is reading and extracting rubric structure...'}
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    {isVi ? 'Quá trình thường mất khoảng 10-15 giây. Bảng tiêu chí và trọng số sẽ tự động xuất hiện bên dưới ngay sau khi hoàn tất.' : 'This usually takes around 10-15 seconds. Criteria and weights will appear below once completed.'}
                  </p>
                </div>
              </div>
            )}

            {/* Rubric Edit / Preview Form Modal / Section */}
            {showRubricForm && (
              <div className="mt-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {isVi ? 'Cấu hình Tiêu chí Rubric' : 'Rubric Configuration'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        Math.abs(totalWeight - 100) < 0.01
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {isVi ? `Tổng trọng số: ${totalWeight}% / 100%` : `Total Weight: ${totalWeight}% / 100%`}
                    </span>
                  </div>
                </div>

                {/* Rubric Title Input */}
                <div>
                  <label htmlFor="draft-rubric-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Tên bộ Rubric:' : 'Rubric Title:'}
                  </label>
                  <input
                    id="draft-rubric-title"
                    type="text"
                    value={draftRubricTitle}
                    onChange={(e) => setDraftRubricTitle(e.target.value)}
                    placeholder={isVi ? 'Ví dụ: Rubric thi vấn đáp cuối kỳ CS101' : 'e.g., Final Oral Exam Rubric'}
                    className="w-full text-xs px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                  />
                </div>

                {/* Criteria Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isVi ? 'Danh sách các tiêu chí đánh giá:' : 'Evaluation Criteria List:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCriterion}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isVi ? 'Thêm tiêu chí' : 'Add Criterion'}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {draftCriteria.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-3"
                      >
                        <div className="w-full md:w-1/3">
                          <label className="text-[11px] text-slate-400 block mb-0.5">{isVi ? 'Tên tiêu chí' : 'Criterion Name'}</label>
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const updated = [...draftCriteria];
                              updated[idx].name = e.target.value;
                              setDraftCriteria(updated);
                            }}
                            className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div className="w-24 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">{isVi ? 'Trọng số (%)' : 'Weight (%)'}</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={c.weight}
                            onChange={(e) => {
                              const updated = [...draftCriteria];
                              updated[idx].weight = Number(e.target.value);
                              setDraftCriteria(updated);
                            }}
                            className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div className="flex-1 w-full">
                          <label className="text-[11px] text-slate-400 block mb-0.5">{isVi ? 'Mô tả yêu cầu' : 'Description'}</label>
                          <input
                            type="text"
                            value={c.description}
                            onChange={(e) => {
                              const updated = [...draftCriteria];
                              updated[idx].description = e.target.value;
                              setDraftCriteria(updated);
                            }}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 self-center cursor-pointer"
                          title={isVi ? 'Xóa tiêu chí' : 'Remove criterion'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRubricForm(false);
                      setDraftCriteria([]);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {isVi ? 'Hủy bỏ' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRubric}
                    disabled={isSavingRubric}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingRubric ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    <span>{isVi ? 'Lưu Rubric vào môn học' : 'Save Rubric to Course'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Rubrics List */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                {isVi ? 'Các bản Rubric hiện có của môn học' : 'Active Course Rubrics'}
                {selectedCourse && (
                  <span className="text-xs font-normal text-slate-500">
                    ({selectedCourse.courseCode} - {selectedCourse.courseName})
                  </span>
                )}
              </h2>
              <button
                onClick={() => loadRubrics(selectedCourseId)}
                disabled={isLoadingRubrics}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRubrics ? 'animate-spin' : ''}`} />
                {isVi ? 'Làm mới' : 'Refresh'}
              </button>
            </div>

            {isLoadingRubrics ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>{isVi ? 'Đang tải danh sách rubric...' : 'Loading rubrics...'}</span>
              </div>
            ) : rubrics.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center px-4">
                <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isVi ? 'Chưa có bản Rubric nào được lưu cho môn học này.' : 'No rubrics saved for this course yet.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isVi ? 'Bấm "Upload file Rubric" hoặc "Tạo mẫu chuẩn" ở trên để thiết lập tiêu chí chấm.' : 'Click upload or create standard template above to define criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rubrics.map((r, rIdx) => (
                  <div
                    key={r.id || rIdx}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">{r.title}</h3>
                      </div>
                      {r.id && (
                        <button
                          onClick={() => handleDeleteRubric(r.id!, r.title)}
                          disabled={rubricDeletingId === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-medium text-[11px]"
                          title={isVi ? 'Xóa Rubric' : 'Delete Rubric'}
                        >
                          {rubricDeletingId === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isVi ? 'Xóa Rubric' : 'Delete'}</span>
                        </button>
                      )}
                    </div>

                    {/* Criteria Badges & Table */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {r.criteria?.map((crit, cIdx) => (
                        <div
                          key={crit.id || cIdx}
                          className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{crit.name}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] shrink-0">
                              {crit.weight}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{crit.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
