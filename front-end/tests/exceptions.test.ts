import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canStartSchedule, formatExamTime, fromVietnamInput, isValidDateRange, validateEnrollment } from '../src/utils/lecturerExam.ts';
import type { ExamDto, ExamScheduleDto, StudentScheduleEntry } from '../src/types/examApi.ts';

for (const value of ['2026-02-30T08:00', '2025-02-29T08:00', '2026-04-31T08:00', '2026-10-15T24:00', '2026-13-01T08:00', '2026-01-00T08:00']) {
  test(`calendar-invalid local datetime is rejected: ${value}`, () => assert.equal(fromVietnamInput(value), ''));
}
test('leap days and fractional seconds remain valid', () => {
  assert.equal(fromVietnamInput('2028-02-29T08:00'), '2028-02-29T08:00+07:00');
  assert.equal(fromVietnamInput('2026-10-15T08:00:00.1'), '2026-10-15T08:00:00.1+07:00');
});
test('missing/invalid display dates are not rendered as Invalid Date', () => {
  for (const value of [null, undefined, '', 'invalid']) assert.equal(formatExamTime(value), '—');
});
test('start fails closed on invalid timestamps and reversed ranges', () => {
  const s = { status: 'PENDING', scheduledStartTime: 'invalid', scheduledEndTime: 'invalid' } as ExamScheduleDto;
  assert.equal(canStartSchedule(s), false);
  assert.equal(isValidDateRange('2026-10-15T10:00Z', '2026-10-15T09:00Z'), false);
  assert.equal(isValidDateRange('invalid', '2026-10-15T09:00Z'), false);
});
test('malformed enrollment identifiers return a validation code instead of throwing', () => {
  const exam = { startDate: '2026-10-15T08:00+07:00', endDate: '2026-10-15T17:00+07:00' } as ExamDto;
  assert.equal(validateEnrollment([{ studentId: null } as unknown as StudentScheduleEntry], exam, []), 'UUID');
});
