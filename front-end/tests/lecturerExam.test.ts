import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  canDeleteExam, canStartSchedule, fromVietnamInput, isExamOwner,
  isWithinExam, questionSettingsLocked, toVietnamInput, validateEnrollment,
} from '../src/utils/lecturerExam.ts';
import type { ExamDto, ExamScheduleDto, ExamUserDto } from '../src/types/examApi.ts';

const owner: ExamUserDto = {
  id: '11111111-1111-4111-8111-111111111111', username: 'lecturer', fullName: 'Lecturer',
  role: 'LECTURER', studentCode: null, email: null, createdAt: null,
};
const exam: ExamDto = {
  id: '22222222-2222-4222-8222-222222222222', courseId: '33333333-3333-4333-8333-333333333333',
  courseCode: 'SWD392', courseName: 'Design', title: 'Viva',
  startDate: '2026-10-15T08:00:00+07:00', endDate: '2026-10-15T17:00:00+07:00',
  maxMainQuestions: 5, maxFollowupQuestions: 3, maxFollowupsPerMain: 2,
  mainAnswerTimeLimitSeconds: 120, followupAnswerTimeLimitSeconds: 60,
  createdBy: owner, totalStudents: 1, pendingStudents: 1, completedStudents: 0, inProgressStudents: 0,
};
const student: ExamUserDto = { ...owner, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: 'STUDENT' };
const schedule: ExamScheduleDto = {
  id: '44444444-4444-4444-8444-444444444444', examId: exam.id, examTitle: exam.title,
  courseCode: exam.courseCode, courseName: exam.courseName, student,
  scheduledStartTime: '2026-10-15T08:00:00+07:00', scheduledEndTime: '2026-10-15T08:30:00+07:00',
  status: 'PENDING', finalScore: null, assignedQuestionCount: 0, isConnected: false,
  fullRecordingUrl: null, gradedById: null, actualStartTime: null, actualEndTime: null,
};
const entry = { studentId: student.id, scheduledStartTime: schedule.scheduledStartTime!, scheduledEndTime: schedule.scheduledEndTime! };

test('Vietnam form times are independent of browser timezone and preserve milliseconds', () => {
  assert.equal(toVietnamInput('2026-10-15T01:15:30.123Z'), '2026-10-15T08:15:30.123');
  assert.equal(Date.parse(fromVietnamInput('2026-10-15T08:15:30.123')), Date.parse('2026-10-15T01:15:30.123Z'));
  assert.equal(toVietnamInput(null), '');
  assert.equal(fromVietnamInput(''), '');
  assert.equal(fromVietnamInput('2026-10-15T08:15Z'), '');
});

test('start allows the opening instant, excludes the ending instant, and cannot restart', () => {
  assert.equal(canStartSchedule(schedule, Date.parse('2026-10-15T01:00:00Z')), true);
  assert.equal(canStartSchedule(schedule, Date.parse('2026-10-15T00:59:59Z')), false);
  assert.equal(canStartSchedule(schedule, Date.parse('2026-10-15T01:30:00Z')), false);
  assert.equal(canStartSchedule({ ...schedule, status: 'IN_PROGRESS' }, Date.parse('2026-10-15T01:01:00Z')), false);
  assert.equal(canStartSchedule({ ...schedule, scheduledStartTime: null }), false);
});

test('course access does not grant ownership and deleted creators do not crash permission checks', () => {
  assert.equal(isExamOwner(exam, owner.id), true);
  assert.equal(isExamOwner(exam, 'another-lecturer'), false);
  assert.equal(isExamOwner({ ...exam, createdBy: null }, owner.id), false);
  assert.equal(canDeleteExam(exam, 'another-lecturer'), false);
});

test('pending assignments lock settings even when all status counters are still pending', () => {
  assert.equal(questionSettingsLocked({ exam, schedules: [schedule] }), false);
  assert.equal(questionSettingsLocked({ exam, schedules: [{ ...schedule, assignedQuestionCount: 5 }] }), true);
  assert.equal(questionSettingsLocked({ exam: { ...exam, completedStudents: 1 }, schedules: [] }), true);
  assert.equal(questionSettingsLocked({ exam, schedules: [{ ...schedule, status: 'IN_PROGRESS' }] }), true);
});

test('pending exams may be deleted but active or completed exams cannot', () => {
  assert.equal(canDeleteExam(exam, owner.id), true);
  assert.equal(canDeleteExam({ ...exam, inProgressStudents: 1 }, owner.id), false);
  assert.equal(canDeleteExam({ ...exam, completedStudents: 1 }, owner.id), false);
});

test('batch enrollment rejects duplicate UUIDs case-insensitively and existing students', () => {
  assert.equal(validateEnrollment([entry, { ...entry, studentId: student.id.toUpperCase() }], exam, []), 'DUPLICATE');
  assert.equal(validateEnrollment([{ ...entry, studentId: student.id.toUpperCase() }], exam, [schedule]), 'DUPLICATE');
  assert.equal(validateEnrollment([{ ...entry, studentId: 'SE123456' }], exam, []), 'UUID');
  assert.equal(validateEnrollment([], exam, []), 'EMPTY');
});

test('batch validation catches a later invalid row without treating the valid prefix as success', () => {
  const second = { ...entry, studentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', scheduledEndTime: '2026-10-15T18:00:00+07:00' };
  assert.equal(validateEnrollment([entry, second], exam, []), 'RANGE');
  assert.equal(validateEnrollment([{ ...entry, scheduledEndTime: entry.scheduledStartTime }], exam, []), 'TIME');
});

test('schedule containment uses instants and allows inclusive exam boundaries', () => {
  assert.equal(isWithinExam('2026-10-15T01:00:00Z', '2026-10-15T10:00:00Z', exam), true);
  assert.equal(isWithinExam('2026-10-15T00:59:59Z', '2026-10-15T10:00:00Z', exam), false);
  assert.equal(validateEnrollment([entry], exam, []), null);
});
