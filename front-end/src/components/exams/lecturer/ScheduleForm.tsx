import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Plus, RotateCcw, Search, Trash2, User, X } from 'lucide-react';
import axios from 'axios';
import type { ExamDetailDto, ExamScheduleDto, ExamUserDto, UpdateScheduleRequest } from '../../../types/examApi';
import { lecturerExamService } from '../../../services/lecturerExamService';
import { formatExamTime, fromVietnamInput, isWithinExam, toVietnamInput, validateEnrollment } from '../../../utils/lecturerExam';
import { ExamButton, ExamDialog, ExamError, ExamField, inputClass } from './ExamUi';

interface Props {
  detail: ExamDetailDto;
  schedule?: ExamScheduleDto;
  language: 'vi' | 'en';
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  key: number;
  studentId: string;
  student?: ExamUserDto | null;
  start: string;
  end: string;
}

interface StudentSearchSelectProps {
  value: ExamUserDto | null;
  studentId: string;
  onSelect: (student: ExamUserDto | null) => void;
  disabled?: boolean;
  enrolledIds: Set<string>;
  batchIds: Set<string>;
  language: 'vi' | 'en';
}

function StudentSearchSelect({
  value,
  studentId,
  onSelect,
  disabled = false,
  enrolledIds,
  batchIds,
  language,
}: StudentSearchSelectProps) {
  const t = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExamUserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || value) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    const controller = new AbortController();

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await lecturerExamService.searchStudents(query.trim(), controller.signal);
        setResults(data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Failed to search students', err);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [query, open, value]);

  if (value || (disabled && studentId)) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-700/80 dark:bg-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            {value?.fullName
              ? value.fullName.split(' ').map(n => n[0]).slice(-2).join('').toUpperCase()
              : <User className="h-5 w-5" />}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {value?.fullName || t('Sinh viên', 'Student')}
              </span>
              {value?.studentCode && (
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950 dark:text-indigo-300">
                  {value.studentCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span>@{value?.username}</span>
              {value?.email && <span>• {value.email}</span>}
            </div>
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              UUID: {studentId}
            </div>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1.5 self-start sm:self-center text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            title={t('Chọn sinh viên khác', 'Choose different student')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t('Đổi sinh viên', 'Change')}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          disabled={disabled}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('Nhập MSSV, Họ tên, Email hoặc Username để tìm kiếm...', 'Type student code, full name, email or username to search...')}
          className={`${inputClass} pl-9 pr-9`}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('Đang tìm kiếm sinh viên…', 'Searching students…')}</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {t('Không tìm thấy sinh viên nào phù hợp', 'No matching students found')}
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map(st => {
                const lowerId = st.id.toLowerCase();
                const isEnrolled = enrolledIds.has(lowerId);
                const isInBatch = batchIds.has(lowerId);
                const disabledItem = isEnrolled || isInBatch;

                return (
                  <li key={st.id}>
                    <button
                      type="button"
                      disabled={disabledItem}
                      onClick={() => {
                        onSelect(st);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        disabledItem
                          ? 'cursor-not-allowed opacity-50 bg-slate-50 dark:bg-slate-800/40'
                          : 'hover:bg-indigo-50 hover:text-indigo-900 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {st.fullName}
                          </span>
                          {st.studentCode ? (
                            <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950 dark:text-indigo-300">
                              {st.studentCode}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          <span>@{st.username}</span>
                          {st.email && <span> • {st.email}</span>}
                        </div>
                      </div>
                      {isEnrolled && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {t('Đã có lịch', 'Enrolled')}
                        </span>
                      )}
                      {isInBatch && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          {t('Đã chọn', 'In batch')}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function LecturerScheduleForm({ detail, schedule, language, onClose, onSaved }: Props) {
  const t = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const nextKey = useRef(1);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const uncertain = axios.isAxiosError(error) && (!error.response || error.response.status >= 500);

  const [rows, setRows] = useState<Row[]>([
    {
      key: 0,
      studentId: schedule?.student?.id ?? '',
      student: schedule?.student ?? null,
      start: toVietnamInput(schedule?.scheduledStartTime ?? detail.exam.startDate),
      end: toVietnamInput(schedule?.scheduledEndTime ?? null),
    },
  ]);

  const enrolledIds = new Set(detail.schedules.map(s => s.student?.id.toLowerCase()).filter((id): id is string => Boolean(id)));

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows(items => items.map(r => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uncertain) return;
    setError(null);
    try {
      if (rows.some(r => !r.studentId.trim())) {
        throw new Error(t('Vui lòng chọn sinh viên cho tất cả các dòng.', 'Please select a student for each row.'));
      }

      const students = rows.map(r => ({
        studentId: r.studentId.trim().toLowerCase(),
        scheduledStartTime: fromVietnamInput(r.start),
        scheduledEndTime: fromVietnamInput(r.end),
      }));

      let update: UpdateScheduleRequest = students[0];
      if (schedule) {
        update = {
          scheduledStartTime:
            schedule.scheduledStartTime && rows[0].start === toVietnamInput(schedule.scheduledStartTime)
              ? schedule.scheduledStartTime
              : students[0].scheduledStartTime,
          scheduledEndTime:
            schedule.scheduledEndTime && rows[0].end === toVietnamInput(schedule.scheduledEndTime)
              ? schedule.scheduledEndTime
              : students[0].scheduledEndTime,
        };
        if (!isWithinExam(update.scheduledStartTime, update.scheduledEndTime, detail.exam)) {
          throw new Error(t('Giờ kết thúc phải sau giờ bắt đầu và slot phải nằm trong kỳ thi.', 'End must follow start and the slot must fit inside the exam window.'));
        }
      } else {
        const issue = validateEnrollment(students, detail.exam, detail.schedules);
        const messages = {
          EMPTY: t('Thêm ít nhất một sinh viên.', 'Add at least one student.'),
          UUID: t('Vui lòng chọn sinh viên hợp lệ từ danh sách gợi ý.', 'Please select a valid student from the suggestion list.'),
          DUPLICATE: t('Sinh viên bị lặp trong danh sách hoặc đã có lịch trong kỳ thi.', 'A student is duplicated in this batch or already enrolled.'),
          TIME: t('Mỗi slot cần đủ giờ bắt đầu/kết thúc; kết thúc phải sau bắt đầu.', 'Each slot needs valid start/end times, with end after start.'),
          RANGE: t('Tất cả slot phải nằm trong khoảng thời gian kỳ thi.', 'All slots must be inside the exam time window.'),
        };
        if (issue) throw new Error(messages[issue]);
      }

      submitting.current = true;
      setBusy(true);
      if (schedule) await lecturerExamService.updateSchedule(schedule.id, update);
      else await lecturerExamService.addStudents(detail.exam.id, { students });
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <ExamDialog
      title={schedule ? t('Đổi giờ thi sinh viên', 'Reschedule student') : t('Thêm sinh viên vào kỳ thi', 'Add students to examination')}
      onClose={onClose}
      busy={busy}
      language={language}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {detail.exam.title}
        <br />
        {formatExamTime(detail.exam.startDate, language)} — {formatExamTime(detail.exam.endDate, language)} (UTC+07:00)
      </p>

      {!schedule && (
        <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
          {t(
            'Tìm kiếm sinh viên theo Mã số sinh viên (MSSV), Họ tên hoặc Email để xếp lịch thi. Hệ thống sẽ tự động gán mã định danh tài khoản phù hợp.',
            'Search students by Student ID (MSSV), full name, or email to schedule examination slots. The system will automatically map the appropriate account identifier.',
          )}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <ExamError error={error} language={language} />
        <fieldset disabled={busy} className="space-y-4">
          {rows.map((row, index) => {
            const batchIdsForThisRow = new Set(
              rows.filter(r => r.key !== row.key && r.studentId).map(r => r.studentId.toLowerCase()),
            );

            return (
              <div key={row.key} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">
                    {schedule ? schedule.student?.fullName ?? '—' : `${t('Sinh viên', 'Student')} ${index + 1}`}
                  </h3>
                  {!schedule && rows.length > 1 && (
                    <ExamButton
                      danger
                      aria-label={`${t('Xóa dòng', 'Remove row')} ${index + 1}`}
                      onClick={() => setRows(items => items.filter(r => r.key !== row.key))}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </ExamButton>
                  )}
                </div>

                <ExamField label={t('Chọn sinh viên *', 'Select student *')}>
                  <StudentSearchSelect
                    value={row.student ?? null}
                    studentId={row.studentId}
                    disabled={Boolean(schedule)}
                    enrolledIds={enrolledIds}
                    batchIds={batchIdsForThisRow}
                    language={language}
                    onSelect={selected => {
                      updateRow(row.key, {
                        studentId: selected ? selected.id : '',
                        student: selected,
                      });
                    }}
                  />
                </ExamField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ExamField label={t('Bắt đầu (giờ Việt Nam) *', 'Start (Vietnam time) *')}>
                    <input
                      required
                      type="datetime-local"
                      step="any"
                      className={inputClass}
                      value={row.start}
                      onChange={e => updateRow(row.key, { start: e.target.value })}
                    />
                  </ExamField>
                  <ExamField label={t('Kết thúc (giờ Việt Nam) *', 'End (Vietnam time) *')}>
                    <input
                      required
                      type="datetime-local"
                      step="any"
                      className={inputClass}
                      value={row.end}
                      onChange={e => updateRow(row.key, { end: e.target.value })}
                    />
                  </ExamField>
                </div>
              </div>
            );
          })}

          {!schedule && (
            <ExamButton
              onClick={() =>
                setRows(items => [
                  ...items,
                  {
                    key: nextKey.current++,
                    studentId: '',
                    student: null,
                    start: items[items.length - 1]?.end || toVietnamInput(detail.exam.startDate),
                    end: '',
                  },
                ])
              }
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t('Thêm dòng sinh viên', 'Add student row')}
            </ExamButton>
          )}
        </fieldset>

        <div className="flex justify-end gap-2">
          <ExamButton disabled={busy} onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </ExamButton>
          <ExamButton primary type="submit" disabled={busy || uncertain}>
            {busy
              ? t('Đang lưu…', 'Saving…')
              : schedule
                ? t('Lưu lịch thi', 'Save schedule')
                : t(`Thêm ${rows.length} sinh viên`, `Add ${rows.length} students`)}
          </ExamButton>
        </div>
      </form>
    </ExamDialog>
  );
}
