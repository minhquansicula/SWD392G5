import type { ExamDetailDto, ExamDto, ExamScheduleDto, StudentScheduleEntry } from '../types/examApi';

export function isExamOwner(exam: ExamDto, userId: string, role?: string) {
  return role === 'ADMIN' || exam.createdBy?.id === userId;
}

export function questionSettingsLocked(detail: ExamDetailDto) {
  return detail.exam.inProgressStudents > 0 || detail.exam.completedStudents > 0
    || detail.schedules.some(s => s.assignedQuestionCount > 0 || s.status === 'IN_PROGRESS' || s.status === 'COMPLETED');
}

export function canDeleteExam(exam: ExamDto, userId: string, role?: string) {
  return isExamOwner(exam, userId, role) && exam.inProgressStudents === 0 && exam.completedStudents === 0;
}

export function canStartSchedule(schedule: ExamScheduleDto, now = Date.now()) {
  return schedule.status === 'PENDING' && !!schedule.scheduledStartTime && !!schedule.scheduledEndTime
    && now >= Date.parse(schedule.scheduledStartTime) && now < Date.parse(schedule.scheduledEndTime);
}

// Form dates always represent Asia/Ho_Chi_Minh, regardless of the browser timezone.
export function toVietnamInput(iso: string | null) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '';
  return new Date(Date.parse(iso) + 7 * 60 * 60 * 1000).toISOString().slice(0, 23);
}

export function fromVietnamInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) return '';
  const iso = `${value}+07:00`;
  return Number.isFinite(Date.parse(iso)) ? iso : '';
}

export function formatExamTime(value: string | null, language: 'vi' | 'en' = 'vi') {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export function isValidDateRange(start: string, end: string) {
  return Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(end) > Date.parse(start);
}

export function isWithinExam(start: string, end: string, exam: ExamDto) {
  return isValidDateRange(start, end) && Date.parse(start) >= Date.parse(exam.startDate)
    && Date.parse(end) <= Date.parse(exam.endDate);
}

export function validateEnrollment(students: StudentScheduleEntry[], exam: ExamDto, schedules: ExamScheduleDto[]) {
  if (!students.length) return 'EMPTY';
  const ids = new Set<string>();
  const enrolled = new Set(schedules.map(s => s.student?.id.toLowerCase()));
  for (const entry of students) {
    const id = entry.studentId.toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return 'UUID';
    if (ids.has(id) || enrolled.has(id)) return 'DUPLICATE';
    ids.add(id);
    if (!isValidDateRange(entry.scheduledStartTime, entry.scheduledEndTime)) return 'TIME';
    if (!isWithinExam(entry.scheduledStartTime, entry.scheduledEndTime, exam)) return 'RANGE';
  }
  return null;
}
