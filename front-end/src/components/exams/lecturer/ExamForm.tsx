import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { getCourses } from '../../../services/courseService';
import type { Course } from '../../../services/courseService';
import { lecturerExamService } from '../../../services/lecturerExamService';
import type { CreateExamRequest, ExamDetailDto, ExamDto, UpdateExamRequest } from '../../../types/examApi';
import { fromVietnamInput, isValidDateRange, questionSettingsLocked, toVietnamInput } from '../../../utils/lecturerExam';
import { ExamButton, ExamDialog, ExamError, ExamField, ExamLoading, inputClass } from './ExamUi';

const settings = [
  { key: 'maxMainQuestions', vi: 'Số câu hỏi chính', en: 'Main questions', min: 1, max: 50, defaultValue: 5 },
  { key: 'maxFollowupQuestions', vi: 'Tổng câu follow-up tối đa', en: 'Total follow-up limit', min: 0, max: 20, defaultValue: 3 },
  { key: 'maxFollowupsPerMain', vi: 'Follow-up tối đa mỗi câu chính', en: 'Follow-ups per main question', min: 0, max: 2147483647, defaultValue: 2 },
  { key: 'mainAnswerTimeLimitSeconds', vi: 'Thời gian mỗi câu chính (giây)', en: 'Time per main answer (seconds)', min: 1, max: 2147483647, defaultValue: 120 },
  { key: 'followupAnswerTimeLimitSeconds', vi: 'Thời gian mỗi follow-up (giây)', en: 'Time per follow-up answer (seconds)', min: 1, max: 2147483647, defaultValue: 60 },
] as const;
type SettingKey = typeof settings[number]['key'];

interface Props {
  userId: string;
  userRole?: string;
  detail?: ExamDetailDto;
  language: 'vi' | 'en';
  onClose: () => void;
  onSaved: (exam: ExamDto) => void;
}

export function LecturerExamForm({ userId, userRole, detail, language, onClose, onSaved }: Props) {
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  const exam = detail?.exam;
  const locked = detail ? questionSettingsLocked(detail) : false;
  const [title, setTitle] = useState(exam?.title ?? '');
  const [courseId, setCourseId] = useState(exam?.courseId ?? '');
  const [start, setStart] = useState(toVietnamInput(exam?.startDate ?? null));
  const [end, setEnd] = useState(toVietnamInput(exam?.endDate ?? null));
  const [values, setValues] = useState(() => Object.fromEntries(settings.map(s => [s.key, String(exam ? exam[s.key] ?? '' : s.defaultValue)])) as Record<SettingKey, string>);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(!exam);
  const [courseError, setCourseError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const uncertain = axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (exam) return;
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect -- Reset request state when reloading the remote course options.
    setLoadingCourses(true);
    setCourseError(null);
    getCourses().then(result => {
      if (active) {
        setCourses(userRole === 'ADMIN' ? result : result.filter(c => c.lecturers?.some(l => l.id === userId)));
      }
    }).catch(e => { if (active) setCourseError(e); })
      .finally(() => { if (active) setLoadingCourses(false); });
    return () => { active = false; };
  }, [exam, userId, userRole, retry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uncertain) return;
    setError(null);
    try {
      if (!title.trim() || title.length > 255) throw new Error(t('Tiêu đề không được trống và tối đa 255 ký tự.', 'Title is required and must not exceed 255 characters.'));
      // Omit untouched dates on update: preserve backend sub-millisecond precision.
      const startDate = exam && start === toVietnamInput(exam.startDate) ? exam.startDate : fromVietnamInput(start);
      const endDate = exam && end === toVietnamInput(exam.endDate) ? exam.endDate : fromVietnamInput(end);
      if (!isValidDateRange(startDate, endDate)) throw new Error(t('Ngày kết thúc phải sau ngày bắt đầu.', 'End date must be after start date.'));
      if (!exam && Date.parse(startDate) <= Date.now()) throw new Error(t('Ngày bắt đầu phải ở tương lai.', 'Start date must be in the future.'));
      if (detail?.schedules.some(s => (s.scheduledStartTime && Date.parse(s.scheduledStartTime) < Date.parse(startDate)) || (s.scheduledEndTime && Date.parse(s.scheduledEndTime) > Date.parse(endDate)))) {
        throw new Error(t('Khoảng thời gian mới phải chứa tất cả lịch thi đã xếp.', 'The new date range must contain all existing schedules.'));
      }
      const numbers = {} as Record<SettingKey, number>;
      if (!locked) {
        for (const setting of settings) {
          const value = Number(values[setting.key]);
          if (!values[setting.key].trim() || !Number.isInteger(value) || value < setting.min || value > setting.max) {
            throw new Error(`${t(setting.vi, setting.en)}: ${setting.min}–${setting.max}.`);
          }
          numbers[setting.key] = value;
        }
      }
      if (!exam && !courses.some(c => c.id === courseId)) throw new Error(t('Chọn môn học được phân công.', 'Select an assigned course.'));
      submitting.current = true;
      setBusy(true);
      let result: ExamDto;
      if (exam) {
        const body: UpdateExamRequest = {};
        if (title.trim() !== exam.title) body.title = title.trim();
        if (startDate !== exam.startDate) body.startDate = startDate;
        if (endDate !== exam.endDate) body.endDate = endDate;
        if (!locked) for (const setting of settings) {
          if (numbers[setting.key] !== exam[setting.key]) body[setting.key] = numbers[setting.key];
        }
        if (!Object.keys(body).length) { onClose(); return; }
        result = await lecturerExamService.update(exam.id, body);
      } else {
        const body: CreateExamRequest = { courseId, title: title.trim(), startDate, endDate, ...numbers };
        result = await lecturerExamService.create(body);
      }
      onSaved(result);
    } catch (e) { setError(e); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <ExamDialog title={exam ? t('Cập nhật kỳ thi', 'Edit examination') : t('Tạo kỳ thi vấn đáp', 'Create examination')} onClose={onClose} busy={busy} language={language}>
    <form onSubmit={submit} className="space-y-5">
      <ExamError error={error} language={language} />
      <fieldset disabled={busy} className="space-y-4">
        {exam ? <p className="text-sm text-slate-600 dark:text-slate-300">{exam.courseCode} · {exam.courseName}</p> : <>
          <ExamError error={courseError} language={language} />
          {loadingCourses ? <ExamLoading language={language} /> : courseError ? <ExamButton onClick={() => setRetry(r => r + 1)}>{t('Tải lại môn học', 'Reload courses')}</ExamButton> : <ExamField label={t('Môn học được phân công *', 'Assigned course *')}>
            <select required className={inputClass} value={courseId} onChange={e => setCourseId(e.target.value)}>
              <option value="">{t('Chọn môn học', 'Select a course')}</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
            </select>
          </ExamField>}
          {!loadingCourses && !courseError && !courses.length && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{t('Bạn chưa được phân công môn học. Liên hệ quản trị viên để được phân công trước khi tạo kỳ thi.', 'No courses are assigned to you. Contact an administrator before creating an exam.')}</p>}
        </>}
        <ExamField label={t('Tiêu đề kỳ thi *', 'Examination title *')}><input required maxLength={255} className={inputClass} value={title} onChange={e => setTitle(e.target.value)} /></ExamField>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('Tất cả thời gian bên dưới theo giờ Việt Nam (UTC+07:00).', 'All times below use Vietnam time (UTC+07:00).')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ExamField label={t('Bắt đầu kỳ thi *', 'Exam starts *')}><input required type="datetime-local" step="any" className={inputClass} value={start} onChange={e => setStart(e.target.value)} /></ExamField>
          <ExamField label={t('Kết thúc kỳ thi *', 'Exam ends *')}><input required type="datetime-local" step="any" className={inputClass} value={end} onChange={e => setEnd(e.target.value)} /></ExamField>
        </div>
        {locked && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{t('Cấu hình câu hỏi và thời gian trả lời đã khóa vì có câu hỏi được gán hoặc lịch thi đang/đã hoàn thành.', 'Question and answer-time settings are locked because questions are assigned or schedules are active/completed.')}</p>}
        <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-semibold">{t('Cấu hình câu hỏi', 'Question settings')}</legend>
          {settings.map(s => <ExamField key={s.key} label={t(s.vi, s.en)}><input required type="number" min={s.min} max={s.max} step={1} className={inputClass} value={values[s.key]} onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))} /></ExamField>)}
        </fieldset>
      </fieldset>
      <div className="flex justify-end gap-2"><ExamButton disabled={busy} onClick={onClose}>{t('Hủy', 'Cancel')}</ExamButton><ExamButton primary type="submit" disabled={busy || uncertain || (!exam && (loadingCourses || !!courseError || !courses.length))}>{busy ? t('Đang lưu…', 'Saving…') : t('Lưu kỳ thi', 'Save examination')}</ExamButton></div>
    </form>
  </ExamDialog>;
}
