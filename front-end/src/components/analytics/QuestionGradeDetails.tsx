import type { SessionDetail } from '../../services/aiService';
import { LecturerGradeForm } from './LecturerGradeForm';

export function QuestionGradeDetails({ detail, questionId, student, onSaved }: { detail: SessionDetail; questionId: string; student: boolean; onSaved: () => Promise<void> }) {
  const result = detail.results.find(item => item.question_id === questionId);
  const answers = detail.transcripts.filter(item => item.role === 'STUDENT' && item.question_id === questionId);
  return <>
    <div className="mt-4"><strong>Câu trả lời của sinh viên</strong>{answers.length ? answers.map(item => <p key={item.id} className="mt-2 whitespace-pre-wrap">{item.text}</p>) : <p className="mt-2 text-sm">Chưa có câu trả lời được ghi nhận cho câu hỏi này.</p>}</div>
    {!student && detail.status === 'COMPLETED' && <LecturerGradeForm key={`${detail.schedule_id}-${questionId}`} scheduleId={detail.schedule_id} questionId={questionId} score={result?.lecturer_score ?? null} feedback={result?.lecturer_feedback} onSaved={onSaved} />}
  </>;
}
