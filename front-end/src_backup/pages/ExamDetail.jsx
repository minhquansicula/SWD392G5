// ============================================================
// AIVES — Exam Detail Page (Lecturer)
// ============================================================
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Clock, BarChart3, CheckCircle2 } from 'lucide-react';
import { ScheduleStatus } from '../types';
import { apiGetExamById, apiGetSchedules } from '../mocks/mockApi';
import { LoadingSpinner, StatusBadge, ScoreBadge } from '../components/ui';
export default function ExamDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!id)
            return;
        Promise.all([apiGetExamById(id), apiGetSchedules(id)]).then(([e, s]) => {
            setExam(e || null);
            setSchedules(s);
            setLoading(false);
        });
    }, [id]);
    if (loading)
        return <LoadingSpinner text="Loading exam details..."/>;
    if (!exam)
        return <div className="text-center py-10">Exam not found.</div>;
    const pendingGradingCount = schedules.filter((s) => s.status === ScheduleStatus.COMPLETED).length;
    return (<div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <button onClick={() => navigate('/exams')} className="flex items-center gap-2 text-sm text-surface-200/60 hover:text-surface-100 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4"/>
        Back to Exams
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">{exam.title}</h1>
          <p className="text-sm text-surface-200/60 mt-1">{exam.courseName} ({exam.courseId})</p>
        </div>
        <div className="flex gap-3">
          <Link to={`/analytics/${exam.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 text-surface-100 text-sm font-medium hover:bg-surface-700 transition-colors">
            <BarChart3 className="w-4 h-4 text-primary-400"/>
            Analytics
          </Link>
          <Link to={`/exams/${exam.id}/grading`} className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600/20 text-primary-300 text-sm font-medium hover:bg-primary-600/30 transition-colors border border-primary-500/30">
            <CheckCircle2 className="w-4 h-4"/>
            Grading Queue
            {pendingGradingCount > 0 && (<span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {pendingGradingCount}
              </span>)}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-light rounded-2xl p-4">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <Users className="w-4 h-4 text-primary-400"/>
            <span className="text-xs uppercase font-medium">Students</span>
          </div>
          <p className="text-2xl font-bold text-surface-100">{schedules.length}</p>
        </div>
        <div className="glass-light rounded-2xl p-4">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <Calendar className="w-4 h-4 text-accent-400"/>
            <span className="text-xs uppercase font-medium">Date</span>
          </div>
          <p className="text-sm font-medium text-surface-100 mt-1">
            {new Date(exam.startDate).toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div className="glass-light rounded-2xl p-4">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <Clock className="w-4 h-4 text-warning-400"/>
            <span className="text-xs uppercase font-medium">Questions</span>
          </div>
          <p className="text-lg font-bold text-surface-100">
            {exam.maxMainQuestions} <span className="text-sm font-normal text-surface-200/60">+ {exam.maxFollowupQuestions} follow-ups</span>
          </p>
        </div>
        <div className="glass-light rounded-2xl p-4">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <CheckCircle2 className="w-4 h-4 text-primary-400"/>
            <span className="text-xs uppercase font-medium">Graded</span>
          </div>
          <p className="text-2xl font-bold text-surface-100">
            {schedules.filter(s => s.status === ScheduleStatus.GRADED).length}
            <span className="text-sm font-normal text-surface-200/60 ml-1">/ {schedules.length}</span>
          </p>
        </div>
      </div>

      {/* Roster Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-800">
          <h2 className="text-lg font-semibold text-surface-100">Student Roster</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-900/50 text-surface-200/60 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Time Slot</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">AI Score</th>
                <th className="px-6 py-4 text-center">Final Grade</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {schedules.map((schedule) => {
            const isPendingReview = schedule.status === ScheduleStatus.COMPLETED;
            return (<tr key={schedule.id} className="hover:bg-surface-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-medium text-surface-100">{schedule.studentName}</p>
                      <p className="text-xs text-surface-200/40">{schedule.studentId}</p>
                    </td>
                    <td className="px-6 py-4 text-surface-200/70 font-mono text-xs">
                      {new Date(schedule.scheduledStartTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} —{' '}
                      {new Date(schedule.scheduledEndTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={schedule.status}/>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ScoreBadge score={schedule.aiSuggestedScore}/>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ScoreBadge score={schedule.finalScore}/>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isPendingReview ? (<Link to={`/exams/${exam.id}/grading`} className="text-primary-400 hover:text-primary-300 font-medium text-xs uppercase tracking-wider">
                          Review
                        </Link>) : schedule.status === ScheduleStatus.GRADED ? (<Link to={`/results/${schedule.id}`} className="text-surface-200/60 hover:text-surface-100 font-medium text-xs uppercase tracking-wider">
                          View Result
                        </Link>) : null}
                    </td>
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
