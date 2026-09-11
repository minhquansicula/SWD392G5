// ============================================================
// AIVES — Student Results Page
// ============================================================
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Bot, Volume2 } from 'lucide-react';
import { ScheduleStatus } from '../types';
import { apiGetScheduleResults } from '../mocks/mockApi';
import { LoadingSpinner, ScoreBadge } from '../components/ui';
export default function StudentResults() {
    const { scheduleId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedQ, setExpandedQ] = useState(null);
    useEffect(() => {
        if (scheduleId) {
            apiGetScheduleResults(scheduleId).then((res) => {
                setData(res);
                if (res.results.length > 0)
                    setExpandedQ(res.results[0].questionId);
                setLoading(false);
            });
        }
    }, [scheduleId]);
    if (loading)
        return <LoadingSpinner text="Loading your results..."/>;
    if (!data)
        return <div>Not found</div>;
    const isGraded = data.schedule.status === ScheduleStatus.GRADED;
    return (<div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <button onClick={() => navigate('/my-schedules')} className="flex items-center gap-2 text-sm text-surface-200/60 hover:text-surface-100 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4"/>
        Back to My Schedules
      </button>

      <h1 className="text-2xl font-bold text-surface-100 mb-8">Examination Results</h1>

      {/* Score Summary Card */}
      <div className="glass rounded-3xl p-8 mb-8 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"/>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-semibold text-surface-100 mb-2">Overall Performance</h2>
            <p className="text-surface-200/70 text-sm max-w-sm">
              {isGraded
            ? "Your official grade has been finalized by the lecturer. Review the per-question feedback below."
            : "Your exam has been scored by the AI and is currently pending lecturer review. The official grade may change."}
            </p>
          </div>
          
          <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-surface-800 pt-8 md:pt-0 md:pl-12">
            <div className="text-center">
              <p className="text-xs text-surface-200/50 uppercase font-medium mb-2">AI Suggestion</p>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-800/50 border border-surface-700">
                <span className="text-2xl font-bold text-surface-100">{data.schedule.aiSuggestedScore?.toFixed(1) ?? '—'}</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-surface-200/50 uppercase font-medium mb-2 flex items-center justify-center gap-1">
                Official Grade
                {!isGraded && <span className="w-2 h-2 rounded-full bg-warning-500 animate-pulse ml-1" title="Pending"/>}
              </p>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border ${isGraded ? 'bg-accent-500/20 border-accent-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-surface-800/30 border-surface-800 border-dashed'}`}>
                <span className={`text-2xl font-bold ${isGraded ? 'text-accent-400' : 'text-surface-200/40'}`}>
                  {isGraded ? data.schedule.finalScore?.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Question Results */}
      <h3 className="text-lg font-semibold text-surface-100 mb-4">Detailed Feedback</h3>
      <div className="space-y-4">
        {data.results.map((result, idx) => {
            const isExpanded = expandedQ === result.questionId;
            const qTranscripts = data.transcripts.filter(t => t.questionId === result.questionId);
            const studentAns = qTranscripts.find(t => t.role === 'STUDENT');
            return (<div key={result.id} className="glass rounded-2xl overflow-hidden border border-surface-800 transition-all">
              <button onClick={() => setExpandedQ(isExpanded ? null : result.questionId)} className="w-full flex items-center justify-between p-4 md:p-6 bg-surface-900/50 hover:bg-surface-800/50 transition-colors text-left">
                <div className="flex items-center gap-4 md:gap-6 flex-1">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-surface-800 flex items-center justify-center text-sm font-bold text-surface-200">
                    Q{idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-100 line-clamp-2 md:line-clamp-1">{result.questionContent}</p>
                  </div>
                  <ScoreBadge score={result.aiScore}/>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-surface-200/50 ml-4 shrink-0"/> : <ChevronDown className="w-5 h-5 text-surface-200/50 ml-4 shrink-0"/>}
              </button>
              
              {isExpanded && (<div className="p-4 md:p-6 border-t border-surface-800 bg-surface-900/20">
                  {/* AI Feedback Box */}
                  <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-primary-600/10 to-primary-500/5 border border-primary-500/20 relative overflow-hidden">
                    <Bot className="absolute -right-4 -bottom-4 w-24 h-24 text-primary-500/5"/>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-4 h-4 text-primary-400"/>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400">AI Evaluation</h4>
                      </div>
                      <p className="text-sm text-primary-100/90 leading-relaxed">{result.aiFeedback}</p>
                    </div>
                  </div>
                  
                  {/* Your Answer */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-200/50 mb-3">Your Answer Transcript</h4>
                    <div className="p-4 rounded-xl bg-surface-800/30 text-sm text-surface-100 leading-relaxed border border-surface-700/50">
                      {studentAns ? studentAns.textContent : '(No response recorded)'}
                    </div>
                    {studentAns?.audioUrl && (<button className="flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-surface-800 text-surface-200/70 text-xs font-medium hover:bg-surface-700 hover:text-surface-100 transition-colors">
                        <Volume2 className="w-3.5 h-3.5"/>
                        Play Recording
                      </button>)}
                  </div>
                </div>)}
            </div>);
        })}
      </div>
    </div>);
}
