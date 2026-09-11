// ============================================================
// AIVES — Grading Queue Page (Lecturer)
// ============================================================
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiGetPendingReview } from '../mocks/mockApi';
import { LoadingSpinner, EmptyState, ScoreBadge } from '../components/ui';
export default function GradingQueue() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (examId) {
            apiGetPendingReview(examId).then((data) => {
                setSchedules(data);
                setLoading(false);
            });
        }
    }, [examId]);
    if (loading)
        return <LoadingSpinner text="Loading grading queue..."/>;
    return (<div className="max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => navigate(`/exams/${examId}`)} className="flex items-center gap-2 text-sm text-surface-200/60 hover:text-surface-100 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4"/>
        Back to Exam Detail
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Grading Queue</h1>
          <p className="text-sm text-surface-200/60 mt-1">Review AI evaluations and finalize official grades.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-surface-800/50 border border-surface-700">
          <span className="text-2xl font-bold text-accent-400">{schedules.length}</span>
          <span className="text-xs text-surface-200/50 uppercase ml-2">Pending</span>
        </div>
      </div>

      {schedules.length === 0 ? (<EmptyState title="Queue is empty" description="All completed exams have been graded or there are no submissions yet."/>) : (<div className="space-y-4">
          {schedules.map((schedule) => (<div key={schedule.id} className="glass-light rounded-2xl p-6 flex items-center justify-between group hover:border-primary-500/30 transition-all">
              <div>
                <h3 className="text-lg font-semibold text-surface-100">{schedule.studentName}</h3>
                <p className="text-sm text-surface-200/50 mt-1">ID: {schedule.studentId} • Finished at {new Date(schedule.scheduledEndTime).toLocaleTimeString('vi-VN')}</p>
              </div>
              
              <div className="flex items-center gap-6">
                <ScoreBadge score={schedule.aiSuggestedScore} label="AI Suggested"/>
                <Link to={`/exams/${examId}/grading/${schedule.id}`} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors shadow-lg shadow-primary-600/20">
                  Review
                  <CheckCircle2 className="w-4 h-4"/>
                </Link>
              </div>
            </div>))}
        </div>)}
    </div>);
}
