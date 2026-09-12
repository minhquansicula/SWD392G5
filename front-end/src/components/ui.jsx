import { Navigate } from 'react-router-dom';
import { Loader2, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Role, ScheduleStatus, TranscriptRole } from '../types';
import { cn } from '../lib/utils';

// ---------- ProtectedRoute ----------
export function ProtectedRoute({ children, roles }) {
    const { currentUser } = useAuthStore();
    if (roles && !roles.includes(currentUser.role)) {
        const fallback = currentUser.role === Role.STUDENT ? '/my-schedules' : '/exams';
        return <Navigate to={fallback} replace />;
    }
    return <>{children}</>;
}

// ---------- StatusBadge ----------
const statusStyles = {
    [ScheduleStatus.PENDING]: 'bg-surface-800/80 text-surface-300 border-white/5',
    [ScheduleStatus.IN_PROGRESS]: 'bg-warning-500/10 text-warning-400 border-warning-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    [ScheduleStatus.COMPLETED]: 'bg-primary-500/10 text-primary-300 border-primary-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
    [ScheduleStatus.GRADED]: 'bg-accent-500/10 text-accent-400 border-accent-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
};

const statusLabels = {
    [ScheduleStatus.PENDING]: 'Pending',
    [ScheduleStatus.IN_PROGRESS]: 'In Progress',
    [ScheduleStatus.COMPLETED]: 'AI Scored',
    [ScheduleStatus.GRADED]: 'Graded',
};

export function StatusBadge({ status }) {
    return (
        <span className={cn(`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border backdrop-blur-md`, statusStyles[status])}>
            <span className={cn(`w-1.5 h-1.5 rounded-full mr-2`, 
                status === ScheduleStatus.GRADED ? 'bg-accent-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 
                status === ScheduleStatus.IN_PROGRESS ? 'bg-warning-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 
                status === ScheduleStatus.COMPLETED ? 'bg-primary-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-surface-500')} 
            />
            {statusLabels[status]}
        </span>
    );
}

// ---------- ScoreBadge ----------
export function ScoreBadge({ score, label }) {
    if (score === null) {
        return (
            <span className="text-xs font-medium text-surface-500 italic px-3 py-1 rounded-full border border-white/5 bg-surface-900/50">
                {label ?? 'Pending'}
            </span>
        );
    }
    const isHigh = score >= 8;
    const isMid = score >= 5 && score < 8;
    const color = isHigh 
        ? 'text-accent-400 bg-accent-500/10 border-accent-400/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
        : isMid
            ? 'text-warning-400 bg-warning-500/10 border-warning-400/20'
            : 'text-danger-400 bg-danger-500/10 border-danger-400/20';

    return (
        <div className="flex flex-col items-center">
            {label && <span className="text-[10px] uppercase tracking-wider font-semibold text-surface-500 mb-1">{label}</span>}
            <div className={cn("inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg text-sm font-bold border backdrop-blur-md", color)}>
                {score.toFixed(1)}
            </div>
        </div>
    );
}

// ---------- Timer Bar ----------
export function TimerBar({ remaining, total }) {
    const pct = Math.max(0, (remaining / total) * 100);
    const isLow = pct < 25;
    
    return (
        <div className="w-full flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-semibold tracking-wider uppercase">
                <span className={cn(isLow ? 'text-danger-400 animate-pulse' : 'text-primary-300')}>
                    {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </span>
                <span className="text-surface-500">Remaining</span>
            </div>
            <div className="h-1 bg-surface-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ ease: "linear", duration: 1 }}
                    className={cn(
                        "h-full rounded-full shadow-[0_0_10px_currentColor]", 
                        isLow ? 'bg-danger-500 text-danger-500' : pct < 50 ? 'bg-warning-500 text-warning-500' : 'bg-primary-500 text-primary-500'
                    )} 
                />
            </div>
        </div>
    );
}

// ---------- Transcript Bubble ----------
export function TranscriptBubble({ role, text, isFollowup }) {
    const isAI = role === TranscriptRole.AI;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn("flex w-full", isAI ? 'justify-start' : 'justify-end')}
        >
            <div className={cn(
                "max-w-[85%] px-5 py-3.5 text-sm leading-relaxed relative",
                isAI 
                    ? 'bg-surface-800/80 text-surface-200 rounded-2xl rounded-tl-sm border border-white/5 backdrop-blur-md shadow-sm'
                    : 'bg-primary-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-primary-900/20'
            )}>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest", 
                        isAI ? 'text-primary-400' : 'text-primary-200'
                    )}>
                        {isAI ? (isFollowup ? 'Follow-up' : 'AI Examiner') : 'You'}
                    </span>
                </div>
                <p className={cn("font-medium", isAI ? "text-surface-200" : "text-white")}>{text}</p>
            </div>
        </motion.div>
    );
}

// ---------- LoadingSpinner ----------
export function LoadingSpinner({ size = 'md', text }) {
    const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className={cn(`${sizes[size]} text-primary-500 animate-spin`)} />
            {text && <p className="text-sm font-medium text-surface-400 animate-pulse">{text}</p>}
        </div>
    );
}

// ---------- EmptyState ----------
export function EmptyState({ title, description }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-900 border border-white/5 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50" />
                <Inbox className="w-8 h-8 text-surface-600 relative z-10" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
            {description && <p className="text-sm text-surface-400 mt-2 max-w-sm">{description}</p>}
        </div>
    );
}

// ---------- ConfirmDialog ----------
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }) {
    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                        onClick={onCancel} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-surface-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl shadow-black"
                    >
                        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                        <p className="mt-2 text-sm text-surface-400 leading-relaxed">{message}</p>
                        <div className="mt-8 flex justify-end gap-3">
                            <button 
                                onClick={onCancel} 
                                className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:bg-surface-800 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={onConfirm} 
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-surface-200 transition-colors shadow-lg shadow-white/10"
                            >
                                {confirmLabel ?? 'Confirm'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
