import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  X,
  Pencil,
  RefreshCw,
  Loader2,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Layers,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Check,
} from 'lucide-react';
import {
  Course,
  CourseLecturer,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseLecturers,
  assignLecturersToCourse,
  removeLecturerFromCourse,
} from '../../services/courseService';
import { getRegisteredUsers } from '../../services/authService';
import { UserAccount } from '../../types';
import { Language } from '../../utils/i18n';

interface CourseManagementPageProps {
  language: Language;
  onNavigateToUsers?: () => void;
}

export const CourseManagementPage: React.FC<CourseManagementPageProps> = ({
  language,
  onNavigateToUsers,
}) => {
  const isVi = language === 'vi';

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Modal Delete Alert
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Assign Lecturers
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCourseForLecturers, setSelectedCourseForLecturers] = useState<Course | null>(null);
  const [assignedLecturers, setAssignedLecturers] = useState<CourseLecturer[]>([]);
  const [allLecturers, setAllLecturers] = useState<UserAccount[]>([]);
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState('');
  const [assignModalTab, setAssignModalTab] = useState<'assign' | 'assigned'>('assign');
  const [isAssignLoading, setIsAssignLoading] = useState(false);
  const [isAssignActionLoading, setIsAssignActionLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Show Toast
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch Courses
  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const list = await getCourses();
      setCourses(list);
    } catch (err: any) {
      showToast(err.message || (isVi ? 'Lỗi tải danh sách môn học' : 'Failed to load courses'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Filter Courses
  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.courseCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  // Available & Filtered Lecturers for Assignment Modal
  const availableLecturers = useMemo(() => {
    return allLecturers.filter(
      (l) => !assignedLecturers.some((al) => al.id === l.id)
    );
  }, [allLecturers, assignedLecturers]);

  const filteredAvailableLecturers = useMemo(() => {
    const q = lecturerSearchQuery.trim().toLowerCase();
    if (!q) return availableLecturers;
    return availableLecturers.filter(
      (l) =>
        l.fullName?.toLowerCase().includes(q) ||
        l.username?.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q))
    );
  }, [availableLecturers, lecturerSearchQuery]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newCourseCode.trim() || !newCourseName.trim()) {
      setCreateError(isVi ? 'Vui lòng điền đầy đủ mã và tên môn học' : 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCourse({
        courseCode: newCourseCode.trim(),
        courseName: newCourseName.trim(),
      });

      setCourses((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewCourseCode('');
      setNewCourseName('');
      showToast(
        isVi
          ? `Đã tạo môn học [${created.courseCode}] thành công`
          : `Course [${created.courseCode}] created successfully`
      );
    } catch (err: any) {
      setCreateError(err.message || (isVi ? 'Tạo môn học thất bại' : 'Failed to create course'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setEditCourseCode(course.courseCode);
    setEditCourseName(course.courseName);
    setEditError('');
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setEditError('');

    if (!editCourseCode.trim() || !editCourseName.trim()) {
      setEditError(isVi ? 'Vui lòng điền đầy đủ thông tin' : 'Please fill all required fields');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updated = await updateCourse(editingCourse.id, {
        courseCode: editCourseCode.trim(),
        courseName: editCourseName.trim(),
      });

      setCourses((prev) =>
        prev.map((c) => (c.id === editingCourse.id ? updated : c))
      );
      setIsEditModalOpen(false);
      showToast(
        isVi
          ? `Đã cập nhật môn học [${updated.courseCode}] thành công`
          : `Course [${updated.courseCode}] updated successfully`
      );
    } catch (err: any) {
      setEditError(err.message || (isVi ? 'Cập nhật môn học thất bại' : 'Failed to update course'));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Request Delete
  const handleRequestDelete = (course: Course) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCourse(courseToDelete.id);
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      showToast(
        isVi
          ? `Đã xóa môn học [${courseToDelete.courseCode}]`
          : `Deleted course [${courseToDelete.courseCode}]`
      );
      setIsDeleteModalOpen(false);
      setCourseToDelete(null);
    } catch (err: any) {
      showToast(err.message || (isVi ? 'Lỗi xóa môn học' : 'Failed to delete course'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Assign Lecturers Modal
  const handleOpenAssignModal = async (course: Course) => {
    setSelectedCourseForLecturers(course);
    setAssignError('');
    setSelectedLecturerIds([]);
    setLecturerSearchQuery('');
    setAssignModalTab('assign');
    setIsAssignModalOpen(true);
    setIsAssignLoading(true);
    try {
      const [lecturers, users] = await Promise.all([
        getCourseLecturers(course.id),
        getRegisteredUsers('LECTURER'),
      ]);
      setAssignedLecturers(lecturers);
      setAllLecturers(users);
    } catch (err: any) {
      setAssignError(
        err.message ||
          (isVi ? 'Không thể tải danh sách giảng viên' : 'Failed to load lecturers')
      );
    } finally {
      setIsAssignLoading(false);
    }
  };

  // Toggle Lecturer Selection for Assignment
  const handleToggleLecturerSelection = (lecturerId: string) => {
    setSelectedLecturerIds((prev) =>
      prev.includes(lecturerId)
        ? prev.filter((id) => id !== lecturerId)
        : [...prev, lecturerId]
    );
  };

  // Select/Deselect All Filtered Available Lecturers
  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredAvailableLecturers.map((l) => l.id);
    const areAllFilteredSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedLecturerIds.includes(id));

    if (areAllFilteredSelected) {
      setSelectedLecturerIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      setSelectedLecturerIds((prev) =>
        Array.from(new Set([...prev, ...filteredIds]))
      );
    }
  };

  // Assign Selected Lecturers to Course
  const handleAssignSelectedLecturers = async () => {
    if (!selectedCourseForLecturers || selectedLecturerIds.length === 0) return;

    setIsAssignActionLoading(true);
    setAssignError('');
    try {
      const updatedCourse = await assignLecturersToCourse(
        selectedCourseForLecturers.id,
        selectedLecturerIds
      );
      // Update local assignedLecturers list
      const refreshedLecturers = await getCourseLecturers(selectedCourseForLecturers.id);
      setAssignedLecturers(refreshedLecturers);

      // Update courses in state
      setCourses((prev) =>
        prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
      );
      setSelectedCourseForLecturers(updatedCourse);
      const count = selectedLecturerIds.length;
      setSelectedLecturerIds([]);

      showToast(
        isVi
          ? `Đã phân công ${count} giảng viên cho môn ${updatedCourse.courseCode}`
          : `Assigned ${count} lecturer(s) to course ${updatedCourse.courseCode}`
      );
    } catch (err: any) {
      setAssignError(
        err.message ||
          (isVi ? 'Lỗi khi phân công giảng viên' : 'Failed to assign lecturers')
      );
    } finally {
      setIsAssignActionLoading(false);
    }
  };

  // Remove Lecturer from Course
  const handleRemoveLecturer = async (lecturerId: string) => {
    if (!selectedCourseForLecturers) return;

    setIsAssignActionLoading(true);
    setAssignError('');
    try {
      await removeLecturerFromCourse(
        selectedCourseForLecturers.id,
        lecturerId
      );
      const refreshedLecturers = await getCourseLecturers(selectedCourseForLecturers.id);
      setAssignedLecturers(refreshedLecturers);

      // Update courses in state
      setCourses((prev) =>
        prev.map((c) =>
          c.id === selectedCourseForLecturers.id
            ? { ...c, lecturers: refreshedLecturers, lecturerCount: refreshedLecturers.length }
            : c
        )
      );
      setSelectedCourseForLecturers((prev) =>
        prev ? { ...prev, lecturers: refreshedLecturers, lecturerCount: refreshedLecturers.length } : null
      );

      showToast(
        isVi
          ? `Đã gỡ phân công giảng viên khỏi môn ${selectedCourseForLecturers.courseCode}`
          : `Removed lecturer from course ${selectedCourseForLecturers.courseCode}`
      );
    } catch (err: any) {
      setAssignError(
        err.message ||
          (isVi ? 'Lỗi khi xóa phân công giảng viên' : 'Failed to remove lecturer')
      );
    } finally {
      setIsAssignActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
              : 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
          }`}
        >
          {notification.type === 'success' ? (
            <GraduationCap className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header & Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              {isVi ? 'Hệ thống AIVES' : 'AIVES System'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isVi ? 'Dữ liệu CSDL thời gian thực' : 'Real-time Database'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isVi ? 'Quản Lý Môn Học & Học Phần' : 'Course & Subject Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVi
              ? 'Định cấu hình danh mục môn thi, mã học phần và phân bố ngân hàng câu hỏi vấn đáp'
              : 'Configure examination course catalog, subject codes, and oral viva syllabus'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setCreateError('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isVi ? 'Thêm môn học mới' : 'Add New Course'}</span>
          </button>

          <button
            onClick={loadCourses}
            title={isVi ? 'Tải lại danh sách' : 'Refresh list'}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isVi ? 'Tổng số môn học' : 'Total Courses'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {courses.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Đang hoạt động trong CSDL' : 'Active courses in DB'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {isVi ? 'Hệ thống khảo thí' : 'Exam System'}
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            AIVES Core
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Tích hợp đề thi tự động' : 'Auto question generation'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {isVi ? 'Trạng thái đồng bộ' : 'Sync Status'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            100%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Đã kết nối PostgreSQL' : 'Connected to PostgreSQL'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isVi
                ? 'Tìm kiếm theo mã môn học (SWD392...) hoặc tên môn...'
                : 'Search by course code or course name...'
            }
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6 w-16">#</th>
                <th className="py-3 px-4">{isVi ? 'Mã môn học' : 'Course Code'}</th>
                <th className="py-3 px-4">{isVi ? 'Tên môn học' : 'Course Name'}</th>
                <th className="py-3 px-4">{isVi ? 'Giảng viên phụ trách' : 'Assigned Lecturers'}</th>
                <th className="py-3 px-4 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>{isVi ? 'Đang tải danh sách môn học từ máy chủ...' : 'Loading courses from server...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      {isVi ? 'Không tìm thấy môn học nào' : 'No courses found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isVi
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm Thêm môn học mới.'
                        : 'Try searching with a different term or add a new course.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course, idx) => (
                  <tr
                    key={course.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-400 font-medium">
                      {idx + 1}
                    </td>

                    {/* Course Code */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {course.courseCode}
                      </span>
                    </td>

                    {/* Course Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {course.courseName}
                    </td>

                    {/* Assigned Lecturers */}
                    <td className="py-3.5 px-4">
                      {course.lecturers && course.lecturers.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                          {course.lecturers.slice(0, 2).map((lecturer) => (
                            <span
                              key={lecturer.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              <span className="truncate max-w-[120px]">{lecturer.fullName}</span>
                            </span>
                          ))}
                          {course.lecturers.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              +{course.lecturers.length - 2}
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenAssignModal(course)}
                            title={isVi ? 'Quản lý phân công' : 'Manage assignment'}
                            className="p-1 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenAssignModal(course)}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Chưa phân công' : 'Unassigned'}</span>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenAssignModal(course)}
                          title={isVi ? 'Phân công giảng viên' : 'Assign lecturers'}
                          className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(course)}
                          title={isVi ? 'Chỉnh sửa môn học' : 'Edit course'}
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRequestDelete(course)}
                          title={isVi ? 'Xóa môn học' : 'Delete course'}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CREATE COURSE */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isVi ? 'Thêm Môn Học Mới' : 'Add New Course'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isVi
                ? 'Nhập mã môn và tên môn học để tạo danh mục thi trong hệ thống.'
                : 'Enter course code and title to register in the exam catalog.'}
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mã môn học (Course Code)' : 'Course Code'} *
                </label>
                <input
                  type="text"
                  required
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                  placeholder="SWD392"
                  className="w-full px-3 py-2 text-sm uppercase font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên môn học (Course Name)' : 'Course Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder={isVi ? 'Kiến trúc phần mềm' : 'Software Architecture and Design'}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isVi ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? isVi
                      ? 'Đang tạo...'
                      : 'Creating...'
                    : isVi
                    ? 'Tạo môn học'
                    : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT COURSE */}
      {/* ============================================================ */}
      {isEditModalOpen && editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isVi ? 'Chỉnh Sửa Môn Học' : 'Edit Course'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isVi
                ? `Cập nhật mã môn hoặc tên môn học [${editingCourse.courseCode}]`
                : `Update course details for [${editingCourse.courseCode}]`}
            </p>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mã môn học (Course Code)' : 'Course Code'} *
                </label>
                <input
                  type="text"
                  required
                  value={editCourseCode}
                  onChange={(e) => setEditCourseCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm uppercase font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên môn học (Course Name)' : 'Course Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isVi ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isEditSubmitting
                    ? isVi
                      ? 'Đang lưu...'
                      : 'Saving...'
                    : isVi
                    ? 'Lưu thay đổi'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ALERT CONFIRM DELETE COURSE */}
      {/* ============================================================ */}
      {isDeleteModalOpen && courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden text-left">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

            {/* Close Button */}
            <button
              onClick={() => {
                if (!isDeleting) {
                  setIsDeleteModalOpen(false);
                  setCourseToDelete(null);
                }
              }}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon & Header */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="pt-0.5">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  {isVi ? 'Cảnh báo xóa' : 'Delete Warning'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                  {isVi ? 'Xác nhận xóa môn học' : 'Confirm Course Deletion'}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {isVi
                ? 'Bạn có chắc chắn muốn xóa môn học sau khỏi hệ thống? Nếu môn học đang có đề thi hoặc câu hỏi liên kết, hệ thống sẽ ngăn chặn việc xóa để đảm bảo toàn vẹn dữ liệu.'
                : 'Are you sure you want to permanently delete this course? If there are linked exams or questions, deletion will be blocked.'}
            </p>

            {/* Target Course Card Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 font-mono">
                  {courseToDelete.courseCode.slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {courseToDelete.courseName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                    Mã môn: {courseToDelete.courseCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCourseToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVi ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isVi ? 'Đang xóa...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Xóa vĩnh viễn' : 'Delete Permanently'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ASSIGN LECTURERS TO COURSE (MULTI-SELECT) */}
      {/* ============================================================ */}
      {isAssignModalOpen && selectedCourseForLecturers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            {/* Top accent gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="pt-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        {isVi ? 'Phân công học phần' : 'Course Assignment'}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {selectedCourseForLecturers.courseCode}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight mt-1 truncate">
                      {selectedCourseForLecturers.courseName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isVi
                        ? 'Tick chọn một hoặc nhiều giảng viên để phân công phụ trách môn học này'
                        : 'Tick to select one or multiple lecturers to assign to this course'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedCourseForLecturers(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message */}
              {assignError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{assignError}</span>
                </div>
              )}

              {/* Tabs Switcher */}
              <div className="flex items-center gap-2 mt-4 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70">
                <button
                  type="button"
                  onClick={() => setAssignModalTab('assign')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignModalTab === 'assign'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isVi ? 'Tick chọn giảng viên' : 'Select Lecturers to Assign'}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      assignModalTab === 'assign'
                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {availableLecturers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignModalTab('assigned')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignModalTab === 'assigned'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isVi ? 'Đang phụ trách' : 'Currently Assigned'}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      assignModalTab === 'assigned'
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {assignedLecturers.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isAssignLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
                  <span className="text-sm font-medium">
                    {isVi ? 'Đang tải dữ liệu giảng viên...' : 'Loading lecturer data...'}
                  </span>
                </div>
              ) : assignModalTab === 'assign' ? (
                /* TAB 1: TICK CHỌN GIẢNG VIÊN */
                <div className="space-y-3">
                  {/* Search & Bulk Selection Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={lecturerSearchQuery}
                        onChange={(e) => setLecturerSearchQuery(e.target.value)}
                        placeholder={
                          isVi
                            ? 'Tìm kiếm theo tên, email, tài khoản...'
                            : 'Search by name, email, username...'
                        }
                        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                      {lecturerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLecturerSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {filteredAvailableLecturers.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        {(() => {
                          const filteredIds = filteredAvailableLecturers.map((l) => l.id);
                          const areAllFilteredSelected =
                            filteredIds.length > 0 &&
                            filteredIds.every((id) => selectedLecturerIds.includes(id));

                          return (
                            <button
                              type="button"
                              onClick={handleToggleSelectAllFiltered}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                  areAllFilteredSelected
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {areAllFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>
                                {areAllFilteredSelected
                                  ? isVi
                                    ? 'Bỏ chọn tất cả'
                                    : 'Deselect all'
                                  : isVi
                                  ? `Chọn tất cả (${filteredAvailableLecturers.length})`
                                  : `Select all (${filteredAvailableLecturers.length})`}
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* List of Lecturers with Checkboxes */}
                  {availableLecturers.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
                      <UserCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {allLecturers.length === 0
                          ? isVi
                            ? 'Chưa có tài khoản Giảng viên nào trong hệ thống'
                            : 'No lecturer accounts found in the system'
                          : isVi
                          ? 'Tất cả giảng viên đã được phân công cho môn học này!'
                          : 'All available lecturers are already assigned to this course!'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isVi
                          ? 'Bạn có thể xem hoặc gỡ phân công tại tab "Đang phụ trách".'
                          : 'You can view or remove assigned lecturers in the "Currently Assigned" tab.'}
                      </p>
                    </div>
                  ) : filteredAvailableLecturers.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-medium">
                        {isVi
                          ? 'Không tìm thấy giảng viên nào phù hợp với từ khóa'
                          : 'No lecturers matched your search query'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {filteredAvailableLecturers.map((lec) => {
                        const isSelected = selectedLecturerIds.includes(lec.id);

                        return (
                          <div
                            key={lec.id}
                            onClick={() => handleToggleLecturerSelection(lec.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                              isSelected
                                ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs ring-1 ring-purple-400/30'
                                : 'bg-slate-50/40 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Custom Styled Checkbox */}
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                                  isSelected
                                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              {/* Avatar */}
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                                {lec.fullName?.charAt(0)?.toUpperCase() || 'L'}
                              </div>

                              {/* Lecturer details */}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {lec.fullName}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                                  <span className="font-mono">@{lec.username}</span>
                                  {lec.email && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{lec.email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                isSelected
                                  ? 'bg-purple-200/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isVi ? 'Giảng viên' : 'Lecturer'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: ĐANG PHỤ TRÁCH */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {isVi
                        ? `Danh sách giảng viên phụ trách môn (${assignedLecturers.length})`
                        : `Assigned Lecturers List (${assignedLecturers.length})`}
                    </p>
                    {isAssignActionLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    )}
                  </div>

                  {assignedLecturers.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-3">
                      <Users className="w-9 h-9 mx-auto opacity-40 text-slate-400" />
                      <p className="text-xs">
                        {isVi
                          ? 'Chưa có giảng viên nào được phân công cho môn học này.'
                          : 'No lecturers assigned to this course yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setAssignModalTab('assign')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Chuyển sang tab Tick chọn giảng viên' : 'Switch to Select Tab'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {assignedLecturers.map((lecturer) => (
                        <div
                          key={lecturer.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {lecturer.fullName?.charAt(0)?.toUpperCase() || 'L'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {lecturer.fullName}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono truncate">
                                @{lecturer.username}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLecturer(lecturer.id)}
                            disabled={isAssignActionLoading}
                            title={isVi ? 'Gỡ phân công môn học này' : 'Remove from course'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>{isVi ? 'Gỡ phân công' : 'Remove'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
              <div>
                {assignModalTab === 'assign' && selectedLecturerIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                      {isVi
                        ? `Đã chọn: ${selectedLecturerIds.length} giảng viên`
                        : `Selected: ${selectedLecturerIds.length} lecturer(s)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLecturerIds([])}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      {isVi ? 'Bỏ chọn' : 'Clear'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedCourseForLecturers(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Close'}
                </button>

                {assignModalTab === 'assign' && (
                  <button
                    type="button"
                    onClick={handleAssignSelectedLecturers}
                    disabled={selectedLecturerIds.length === 0 || isAssignActionLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isAssignActionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isVi ? 'Đang phân công...' : 'Assigning...'}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {isVi
                            ? `Phân công ${
                                selectedLecturerIds.length > 0
                                  ? `(${selectedLecturerIds.length})`
                                  : ''
                              } giảng viên`
                            : `Assign ${
                                selectedLecturerIds.length > 0
                                  ? `(${selectedLecturerIds.length})`
                                  : ''
                              } Lecturer(s)`}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
