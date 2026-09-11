import { Navigate } from 'react-router-dom';
import { Loader2, Inbox } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ScheduleStatus, TranscriptRole } from '../types';
// ---------- ProtectedRoute ----------
export function ProtectedRoute({ children, roles }) {
    const { currentUser } = useAuthStore();
    if (roles && !roles.includes(currentUser.role)) {
        return <Navigate to="/exams" replace/>;
    }
    return <>{children}</>;
}
// ---------- StatusBadge ----------
const statusStyles = {
    [ScheduleStatus.PENDING]: 'bg-surface-700/50 text-surface-200 border-surface-200/20',
    [ScheduleStatus.IN_PROGRESS]: 'bg-warning-500/15 text-warning-400 border-warning-400/30',
    [ScheduleStatus.COMPLETED]: 'bg-primary-500/15 text-primary-300 border-primary-400/30',
    [ScheduleStatus.GRADED]: 'bg-accent-500/15 text-accent-400 border-accent-400/30',
};
const statusLabels = {
    [ScheduleStatus.PENDING]: 'Pending',
    [ScheduleStatus.IN_PROGRESS]: 'In Progress',
    [ScheduleStatus.COMPLETED]: 'AI Scored',
    [ScheduleStatus.GRADED]: 'Graded',
};
export function StatusBadge({ status }) {
    return (<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === ScheduleStatus.GRADED
            ? 'bg-accent-400'
            : status === ScheduleStatus.IN_PROGRESS
                ? 'bg-warning-400 animate-pulse'
                : status === ScheduleStatus.COMPLETED
                    ? 'bg-primary-400'
                    : 'bg-surface-200/50'}`}/>
      {statusLabels[status]}
    </span>);
}
// ---------- ScoreBadge ----------
export function ScoreBadge({ score, label }) {
    if (score === null) {
        return (<span className="text-xs text-surface-200/40 italic">
        {label ?? 'Pending'}
      </span>);
    }
    const color = score >= 8
        ? 'text-accent-400 bg-accent-500/15 border-accent-400/30'
        : score >= 5
            ? 'text-warning-400 bg-warning-500/15 border-warning-400/30'
            : 'text-danger-400 bg-danger-500/15 border-danger-400/30';
    return (<div className="flex flex-col items-center">
      {label && <span className="text-[10px] text-surface-200/40 mb-0.5">{label}</span>}
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold border ${color}`}>
        {score.toFixed(1)}
      </span>
    </div>);
}
// ---------- Timer Bar ----------
export function TimerBar({ remaining, total }) {
    const pct = Math.max(0, (remaining / total) * 100);
    const isLow = pct < 25;
    return (<div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className={isLow ? 'text-danger-400 font-medium' : 'text-surface-200/60'}>
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </span>
        <span className="text-surface-200/40">Time Remaining</span>
      </div>
      <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-danger-500' : pct < 50 ? 'bg-warning-500' : 'bg-accent-500'}`} style={{ width: `${pct}%` }}/>
      </div>
    </div>);
}
// ---------- Transcript Bubble ----------
export function TranscriptBubble({ role, text, isFollowup, }) {
    const isAI = role === TranscriptRole.AI;
    return (<div className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in`}>
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isAI
            ? 'bg-primary-600/15 text-primary-100 rounded-tl-md border border-primary-500/20'
            : 'bg-surface-700/50 text-surface-100 rounded-tr-md border border-surface-200/10'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isAI ? 'text-primary-400' : 'text-accent-400'}`}>
            {isAI ? (isFollowup ? '🔄 Follow-up' : '🤖 AI Examiner') : '🎤 You'}
          </span>
        </div>
        <p>{text}</p>
      </div>
    </div>);
}
// ---------- LoadingSpinner ----------
export function LoadingSpinner({ size = 'md', text }) {
    const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
    return (<div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className={`${sizes[size]} text-primary-400 animate-spin`}/>
      {text && <p className="text-sm text-surface-200/60">{text}</p>}
    </div>);
}
// ---------- EmptyState ----------
export function EmptyState({ title, description }) {
    return (<div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-surface-200/30"/>
      </div>
      <h3 className="text-lg font-medium text-surface-200/70">{title}</h3>
      {description && <p className="text-sm text-surface-200/40 mt-1 max-w-md">{description}</p>}
    </div>);
}
// ---------- ConfirmDialog ----------
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, }) {
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative glass rounded-2xl p-6 max-w-md w-full mx-4 animate-fade-in">
        <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
        <p className="mt-2 text-sm text-surface-200/70">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-surface-200/70 hover:bg-surface-800/50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 transition-colors">
            {confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>);
}
