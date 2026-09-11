// ============================================================
// AIVES — My Schedules Page (Student)
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Video } from 'lucide-react';
import { ScheduleStatus } from '../types';
import { apiGetMySchedules } from '../mocks/mockApi';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner, EmptyState, StatusBadge, ScoreBadge } from '../components/ui';
export default function MySchedules() {
    const { currentUser } = useAuthStore();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        apiGetMySchedules(currentUser.id).then((data) => {
            // Sort: PENDING/IN_PROGRESS first, then by date
            setSchedules(data.sort((a, b) => {
                const aActive = a.status === ScheduleStatus.PENDING || a.status === ScheduleStatus.IN_PROGRESS;
                const bActive = b.status === ScheduleStatus.PENDING || b.status === ScheduleStatus.IN_PROGRESS;
                if (aActive && !bActive)
                    return -1;
                if (!aActive && bActive)
                    return 1;
                return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime();
            }));
            setLoading(false);
        });
    }, [currentUser.id]);
    if (loading)
        return <LoadingSpinner text="Loading your schedules..."/>;
    const now = new Date().getTime();
    return (<div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-100">My Viva Exams</h1>
        <p className="text-sm text-surface-200/60 mt-1">View your upcoming and past examination schedules.</p>
      </div>

      {schedules.length === 0 ? (<EmptyState title="No schedules found" description="You have not been scheduled for any exams yet."/>) : (<div className="space-y-4">
          {schedules.map((schedule) => {
                const startTime = new Date(schedule.scheduledStartTime).getTime();
                const endTime = new Date(schedule.scheduledEndTime).getTime();
                // Allow joining 5 mins before and up to the end time
                const canJoin = now >= startTime - 5 * 60000 && now <= endTime;
                const isCompleted = schedule.status === ScheduleStatus.COMPLETED || schedule.status === ScheduleStatus.GRADED;
                return (<div key={schedule.id} className={`glass-light rounded-2xl p-6 transition-all ${canJoin && !isCompleted ? 'ring-2 ring-primary-500/50 shadow-lg shadow-primary-500/10' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={schedule.status}/>
                      {canJoin && !isCompleted && (<span className="text-xs font-bold text-primary-400 uppercase tracking-wider animate-pulse">
                          Starting Soon
                        </span>)}
                    </div>
                    <h3 className="text-xl font-bold text-surface-100">{schedule.examTitle}</h3>
                    
                    <div className="flex flex-wrap items-center gap-6 mt-4">
                      <div className="flex items-center gap-2 text-sm text-surface-200/70">
                        <Calendar className="w-4 h-4 text-primary-400"/>
                        {new Date(schedule.scheduledStartTime).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-mono text-surface-200/70">
                        <Clock className="w-4 h-4 text-accent-400"/>
                        {new Date(schedule.scheduledStartTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} —{' '}
                        {new Date(schedule.scheduledEndTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Actions / Results */}
                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-surface-800 pt-4 md:pt-0 md:pl-6">
                    {isCompleted ? (<div className="flex items-center gap-4 text-center">
                        <ScoreBadge score={schedule.aiSuggestedScore} label="AI Suggestion"/>
                        <div className="w-px h-8 bg-surface-800"/>
                        <ScoreBadge score={schedule.finalScore} label="Official Grade"/>
                        <Link to={`/results/${schedule.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 text-surface-100 text-sm font-medium hover:bg-surface-700 transition-colors ml-2">
                          View Results
                        </Link>
                      </div>) : (<Link to={`/viva/${schedule.id}`} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all w-full md:w-auto ${canJoin
                            ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-600/25'
                            : 'bg-surface-800/50 text-surface-200/40 cursor-not-allowed'}`} onClick={(e) => {
                            if (!canJoin)
                                e.preventDefault();
                        }}>
                        <Video className="w-4 h-4"/>
                        {canJoin ? 'Join Viva Room' : 'Not Time Yet'}
                      </Link>)}
                  </div>
                </div>
              </div>);
            })}
        </div>)}
    </div>);
}
