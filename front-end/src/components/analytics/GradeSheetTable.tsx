import { Fragment } from 'react';
import type { CriterionMarkDto } from '../../services/reportService';
import { markOf, passStatus } from '../../utils/gradeSheet';

interface GradeSheetTableProps {
  criteria: CriterionMarkDto[];
  total: number | null;
  caption: string;
}

const cell = 'border border-[var(--line)] px-4 py-3';

/** Grade sheet in the school's layout: Mark group | Mark name | Weight (%) | Final mark | Comment. */
export function GradeSheetTable({ criteria, total, caption }: GradeSheetTableProps) {
  const status = passStatus(total);
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead><tr className="bg-[var(--surface-muted)]">{['Mark group', 'Mark name', 'Weight (%)', 'Final mark', 'Comment'].map(header => <th key={header} scope="col" className={`${cell} text-center font-semibold`}>{header}</th>)}</tr></thead>
      <tbody>
        {criteria.map((criterion, index) => <Fragment key={`${criterion.name}-${index}`}>
          <tr>
            <th scope="rowgroup" rowSpan={2} className={`${cell} text-center font-semibold text-[var(--primary)]`}>{criterion.name}</th>
            <td className={cell}>{criterion.name}</td>
            <td className={`${cell} text-center font-semibold tabular-nums`}>{criterion.weight}</td>
            <td className={`${cell} text-center font-semibold tabular-nums`}>{markOf(criterion)}</td>
            <td className={`${cell} whitespace-pre-wrap leading-6 text-[var(--muted)]`}>{criterion.comment || '-'}</td>
          </tr>
          <tr className="bg-[var(--surface-muted)]">
            <td className={`${cell} text-center font-semibold`}>Total</td>
            <td className={`${cell} text-center font-semibold tabular-nums`}>{criterion.weight}%</td>
            <td className={`${cell} text-center font-semibold tabular-nums`}>{markOf(criterion)}</td>
            <td className={cell} />
          </tr>
        </Fragment>)}
        <tr className="bg-[var(--primary-soft)]"><td className={cell} /><td className={`${cell} text-right font-semibold`}>Late penalty (%)</td><td colSpan={2} className={`${cell} text-center font-semibold`}>0%</td><td className={cell} /></tr>
        <tr className="bg-[var(--primary-soft)]"><td className={cell} /><td className={`${cell} text-right font-semibold`}>Mark bonus</td><td colSpan={2} className={`${cell} text-center font-semibold`}>-</td><td className={cell} /></tr>
        <tr className="bg-[var(--primary-soft)]">
          <td className={cell} />
          <td className={`${cell} text-right font-semibold`}>Course total</td>
          <td className={`${cell} text-center font-semibold`}>Average</td>
          <td className={`${cell} text-center text-lg font-bold tabular-nums`}>{total ?? '-'}</td>
          <td className={cell}><span className={`ui-tag ${status === 'Passed' ? 'text-emerald-700 dark:text-emerald-300' : status === 'Not passed' ? 'text-rose-700 dark:text-rose-300' : ''}`}>Status: {status}</span></td>
        </tr>
      </tbody>
    </table>
  </div>;
}
