// ============================================================
// AIVES — Grading Review Page (Lecturer)
// ============================================================
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { TranscriptRole } from '../types';
import { apiGetScheduleResults, apiSubmitGrade } from '../mocks/mockApi';
import { LoadingSpinner, ScoreBadge, TranscriptBubble } from '../components/ui';
export default function GradingReview() {
    const { examId, scheduleId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [expandedQ, setExpandedQ] = useState(null);
    useEffect(() => {
        if (scheduleId) {
            apiGetScheduleResults(scheduleId).then((res) => {
                setData(res);
                setFinalScore(res.schedule.aiSuggestedScore ?? 0);
                if (res.results.length > 0)
                    setExpandedQ(res.results[0].questionId);
                setLoading(false);
            });
        }
    }, [scheduleId]);
    if (loading)
        return <LoadingSpinner text="Loading transcript & results..."/>;
    if (!data)
        return <div>Not found</div>;
    const handleSubmit = async () => {
        setSubmitting(true);
        await apiSubmitGrade(scheduleId, { finalScore });
        setSubmitting(false);
        navigate(`/exams/${examId}/grading`);
    };
    return (<div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <button onClick={() => navigate(`/exams/${examId}/grading`)} className="flex items-center gap-2 text-sm text-surface-200/60 hover:text-surface-100 transition-colors">
          <ArrowLeft className="w-4 h-4"/>
          Back to Queue
        </button>
        <div className="text-right">
          <p className="text-sm font-medium text-surface-100">{data.schedule.studentName}</p>
          <p className="text-xs text-surface-200/50">{data.schedule.studentId}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Transcript & AI Feedback */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <h2 className="text-lg font-semibold text-surface-100 mb-4 sticky top-0 bg-surface-950 py-2 z-10">
            Interview Evaluation
          </h2>
          
          {data.results.map((result, idx) => {
            const isExpanded = expandedQ === result.questionId;
            const qTranscripts = data.transcripts.filter(t => t.questionId === result.questionId);
            return (<div key={result.id} className="glass rounded-2xl overflow-hidden border border-surface-800">
                <button onClick={() => setExpandedQ(isExpanded ? null : result.questionId)} className="w-full flex items-center justify-between p-4 bg-surface-900/50 hover:bg-surface-800/50 transition-colors text-left">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-200">
                      Q{idx + 1}
                    </div>
                    <p className="font-medium text-surface-100 flex-1 truncate">{result.questionContent}</p>
                    <ScoreBadge score={result.aiScore}/>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-surface-200/50 ml-4"/> : <ChevronDown className="w-5 h-5 text-surface-200/50 ml-4"/>}
                </button>
                
                {isExpanded && (<div className="p-6 border-t border-surface-800 bg-surface-900/20">
                    <div className="mb-6 p-4 rounded-xl bg-primary-600/10 border border-primary-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary-400"/>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400">AI Feedback</h4>
                      </div>
                      <p className="text-sm text-primary-100/80 leading-relaxed">{result.aiFeedback}</p>
                    </div>
                    
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-200/50 mb-4">Transcript</h4>
                    <div className="space-y-4">
                      {qTranscripts.map((t) => (<TranscriptBubble key={t.id} role={t.role} text={t.textContent} isFollowup={t.role === TranscriptRole.AI && t.parentTranscriptId !== null}/>))}
                    </div>
                  </div>)}
              </div>);
        })}
        </div>

        {/* Right: Grading Panel */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-6">
          <div className="glass rounded-2xl p-6 border-t-4 border-t-accent-500">
            <h3 className="font-semibold text-surface-100 mb-6">Finalize Grade</h3>
            
            <div className="flex justify-between items-end mb-8 p-4 rounded-xl bg-surface-800/30">
              <div>
                <p className="text-xs text-surface-200/50 uppercase font-medium mb-1">AI Suggestion</p>
                <p className="text-3xl font-bold text-surface-100">{data.schedule.aiSuggestedScore?.toFixed(1) ?? '—'}</p>
              </div>
              <Bot className="w-8 h-8 text-surface-200/20"/>
            </div>

            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-surface-100">Official Grade</label>
                <span className="text-xl font-bold text-accent-400">{finalScore.toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="10" step="0.1" value={finalScore} onChange={(e) => setFinalScore(parseFloat(e.target.value))} className="w-full accent-accent-500"/>
              <div className="flex justify-between mt-1 text-[10px] text-surface-200/40">
                <span>0.0</span>
                <span>5.0</span>
                <span>10.0</span>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 text-white font-bold shadow-lg shadow-accent-600/25 hover:from-accent-500 hover:to-accent-400 transition-all disabled:opacity-50">
              {submitting ? 'Saving...' : 'Approve & Finalize'}
              <CheckCircle2 className="w-4 h-4"/>
            </button>
            <p className="text-[10px] text-center text-surface-200/40 mt-3">
              This action will publish the final grade to the student.
            </p>
          </div>
        </div>
      </div>
    </div>);
}
