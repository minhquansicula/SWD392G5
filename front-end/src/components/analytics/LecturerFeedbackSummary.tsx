import type { SessionDetail } from '../../services/aiService';

export function LecturerFeedbackSummary({ detail }: { detail: SessionDetail }) {
  const comments = detail.assigned_questions.flatMap((question, index) => {
    const result = detail.results.find(item => item.question_id === question.question_id);
    return result?.lecturer_feedback?.trim() ? [{ question, index, feedback: result.lecturer_feedback }] : [];
  });
  return <section className="ui-panel p-5 sm:p-7">
    <h2 className="text-lg font-semibold">Nhận xét của giảng viên</h2>
    {comments.length ? <div className="mt-4 space-y-3">{comments.map(({ question, index, feedback }) => <article key={question.id} className="rounded-lg bg-[var(--surface-muted)] p-4 text-sm">
      <h3 className="font-semibold">Câu {question.order || index + 1}</h3>
      <p className="mt-2 whitespace-pre-wrap">{feedback}</p>
    </article>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">Giảng viên chưa có nhận xét cho ca thi này.</p>}
  </section>;
}
