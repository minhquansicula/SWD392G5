import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import { buildGradebookWorkbook, passStatus, semesterOf, studentSheetRows } from '../src/utils/gradeSheet.ts';

const meta = { courseCode: 'OJT202', courseName: 'On-The-Job Training', examTitle: 'Final', startDate: '2026-06-10T03:00:00Z' };
const graded = {
  scheduleId: 's1', studentCode: 'SE1', fullName: 'An', email: 'an@fpt.edu.vn', status: 'COMPLETED', finalScore: 8.7,
  criteria: [
    { name: 'Attitude', weight: 30, score: 10, assessed: true, comment: null },
    { name: 'Soft Skills', weight: 70, score: 0, assessed: false, comment: 'Chưa đủ dữ liệu.' },
  ],
};
const pending = { scheduleId: 's2', studentCode: 'SE1', fullName: 'Binh', email: null, status: 'PENDING', finalScore: null, criteria: [] };

test('semester and pass status follow the school sheet', () => {
  assert.deepEqual(semesterOf('2026-06-10T03:00:00Z'), { label: 'Summer2026', code: 'SU26' });
  assert.equal(semesterOf('2026-01-05').label, 'Spring2026');
  assert.equal(semesterOf('2026-09-01').code, 'FA26');
  assert.equal(passStatus(5), 'Passed');
  assert.equal(passStatus(4.99), 'Not passed');
  assert.equal(passStatus(null), 'Not graded');
});

test('student sheet uses mark group, total rows and never shows an unassessed score', () => {
  const { rows, merges } = studentSheetRows(meta, graded);
  assert.deepEqual(rows[1], ['OJT202_SU26', 'Summer2026', 'Final']);
  assert.deepEqual(rows[4], ['Mark group', 'Mark name', 'Weight (%)', 'Final mark', 'Comment']);
  assert.deepEqual(rows[5], ['Attitude', 'Attitude', 30, 10, '-']);
  assert.deepEqual(rows[6], ['', 'Total', '30%', 10, '']);
  assert.deepEqual(rows[7], ['Soft Skills', 'Soft Skills', 70, '-', 'Chưa đủ dữ liệu.']);
  assert.deepEqual(rows.at(-1), ['', 'Course total', 'Average', 8.7, 'Status: Passed']);
  assert.deepEqual(merges[0], { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } });
});

test('workbook has a summary row per student and sheets only for graded students', () => {
  const workbook = buildGradebookWorkbook(meta, [graded, pending]);
  assert.deepEqual(workbook.SheetNames, ['Summary', 'SE1']);
  const summary = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets.Summary, { header: 1 });
  assert.deepEqual(summary[0], ['No', 'Student code', 'Full name', 'Email', 'Attitude (30%)', 'Soft Skills (70%)', 'Course total', 'Status']);
  assert.deepEqual(summary[2], [2, 'SE1', 'Binh', '', '-', '-', '-', 'Not graded']);
});
