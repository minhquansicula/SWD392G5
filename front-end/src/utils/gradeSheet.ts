import * as XLSX from 'xlsx';
import type { CriterionMarkDto, GradebookRowDto } from '../services/reportService';

/** Course total needed for "Passed" on the school grade sheet. */
export const PASS_MARK = 5;

export interface GradeSheetMeta {
  courseCode: string | null;
  courseName: string | null;
  examTitle: string;
  startDate: string;
}

// School terms: Spring Jan–Apr, Summer May–Aug, Fall Sep–Dec.
export function semesterOf(startDate: string) {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return { label: '—', code: '' };
  const year = date.getFullYear();
  const [name, short] = date.getMonth() < 4 ? ['Spring', 'SP'] : date.getMonth() < 8 ? ['Summer', 'SU'] : ['Fall', 'FA'];
  return { label: `${name}${year}`, code: `${short}${String(year).slice(-2)}` };
}

export function passStatus(total: number | null | undefined) {
  return total == null ? 'Not graded' : total >= PASS_MARK ? 'Passed' : 'Not passed';
}

const HEADER = ['Mark group', 'Mark name', 'Weight (%)', 'Final mark', 'Comment'];

/** One student's sheet in the school layout; each mark group is a criterion row plus its Total row. */
export function studentSheetRows(meta: GradeSheetMeta, row: GradebookRowDto) {
  const semester = semesterOf(meta.startDate);
  const rows: (string | number)[][] = [
    [`${meta.courseName || meta.examTitle} (${meta.courseCode || '—'})`],
    [`${meta.courseCode || ''}_${semester.code}`, semester.label, meta.examTitle],
    [`${row.studentCode || '—'} - ${row.fullName || row.email || '—'}`],
    [],
    HEADER,
  ];
  const merges: XLSX.Range[] = [];
  row.criteria.forEach((criterion: CriterionMarkDto) => {
    merges.push({ s: { r: rows.length, c: 0 }, e: { r: rows.length + 1, c: 0 } });
    rows.push([criterion.name, criterion.name, criterion.weight, markOf(criterion), criterion.comment || '-']);
    rows.push(['', 'Total', `${criterion.weight}%`, markOf(criterion), '']);
  });
  rows.push(['', 'Late penalty (%)', '0%', '', '']);
  rows.push(['', 'Mark bonus', '-', '', '']);
  rows.push(['', 'Course total', 'Average', row.finalScore ?? '-', `Status: ${passStatus(row.finalScore)}`]);
  return { rows, merges };
}

/** A criterion the AI could not assess shows "-", never a score. */
export function markOf(criterion: CriterionMarkDto) {
  return criterion.assessed && criterion.score != null ? Number(criterion.score) : '-';
}

export function downloadGradebook(meta: GradeSheetMeta, gradebook: GradebookRowDto[]) {
  XLSX.writeFile(buildGradebookWorkbook(meta, gradebook), `Bang_diem_${meta.courseCode || 'exam'}_${semesterOf(meta.startDate).code}.xlsx`);
}

/** Summary sheet first, then one sheet per graded student in the school template. */
export function buildGradebookWorkbook(meta: GradeSheetMeta, gradebook: GradebookRowDto[]) {
  const workbook = XLSX.utils.book_new();
  const names = [...new Set(gradebook.flatMap(row => row.criteria.map(c => c.name)))];
  const weights = new Map(gradebook.flatMap(row => row.criteria.map(c => [c.name, c.weight] as const)));
  const summary = [
    ['No', 'Student code', 'Full name', 'Email', ...names.map(name => `${name} (${weights.get(name)}%)`), 'Course total', 'Status'],
    ...gradebook.map((row, index) => [
      index + 1, row.studentCode || '', row.fullName || '', row.email || '',
      ...names.map(name => { const c = row.criteria.find(item => item.name === name); return c ? markOf(c) : '-'; }),
      row.finalScore ?? '-', passStatus(row.finalScore),
    ]),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Summary');
  const used = new Set(['Summary']);
  gradebook.filter(row => row.criteria.length).forEach(row => {
    const { rows, merges } = studentSheetRows(meta, row);
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!merges'] = merges;
    sheet['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName(row.studentCode || row.fullName || row.scheduleId, used));
  });
  return workbook;
}

// Excel sheet names: max 31 chars, unique, none of : \ / ? * [ ]
function sheetName(raw: string, used: Set<string>) {
  const base = raw.replace(/[:\\/?*[\]]/g, '_').slice(0, 28) || 'Student';
  let name = base;
  for (let i = 2; used.has(name); i += 1) name = `${base}_${i}`;
  used.add(name);
  return name;
}
