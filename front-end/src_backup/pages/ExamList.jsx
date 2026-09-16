// ============================================================
// AIVES — Exam List Page (Lecturer)
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, BookOpen, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGetExams } from '../mocks/mockApi';
import { LoadingSpinner, EmptyState } from '../components/ui';

export default function ExamList() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        apiGetExams().then((data) => {
            setExams(data);
            setLoading(false);
        });
    }, []);

    const filtered = exams.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.courseName?.toLowerCase().includes(search.toLowerCase()));

    if (loading) return <LoadingSpinner text="Loading exams..." />;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="max-w-6xl mx-auto py-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Exam Management</h1>
                    <p className="text-sm font-medium text-surface-400 mt-2">Create and manage viva examination sessions</p>
                </div>
                <Link 
                    to="/exams/new" 
                    className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-surface-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    Create Exam
                </Link>
            </div>

            {/* Search */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
                <div className="relative flex items-center bg-surface-900 border border-white/10 rounded-2xl overflow-hidden shadow-sm focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/50 transition-all">
                    <div className="pl-5 pr-2">
                        <Search className="w-5 h-5 text-surface-500 group-focus-within:text-primary-400 transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search exams by title or course..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="w-full py-4 bg-transparent text-white text-sm font-medium placeholder-surface-600 focus:outline-none"
                    />
                </div>
            </div>

            {/* Exam Grid */}
            {filtered.length === 0 ? (
                <EmptyState title="No exams found" description="Create your first viva exam to get started." />
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                    <AnimatePresence>
                        {filtered.map((exam) => (
                            <motion.div key={exam.id} variants={itemVariants} layoutId={exam.id}>
                                <Link 
                                    to={`/exams/${exam.id}`} 
                                    className="group block relative bg-surface-900 border border-white/5 hover:border-primary-500/30 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden h-full flex flex-col justify-between"
                                >
                                    {/* Hover Glow Effect */}
                                    <div className="absolute -inset-px bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />
                                    
                                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                        <div>
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <h3 className="text-xl font-bold text-white group-hover:text-primary-300 transition-colors tracking-tight line-clamp-2">
                                                    {exam.title}
                                                </h3>
                                                <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-primary-500 group-hover:border-primary-400 group-hover:text-white transition-all text-surface-400">
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-surface-400">
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800/50 border border-white/5">
                                                    <BookOpen className="w-3.5 h-3.5 text-primary-400" />
                                                    {exam.courseName}
                                                </span>
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800/50 border border-white/5">
                                                    <Calendar className="w-3.5 h-3.5 text-accent-400" />
                                                    {new Date(exam.startDate).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-surface-500 mb-1">Main Q's</span>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-2xl font-black text-white leading-none">{exam.maxMainQuestions}</span>
                                                    <span className="text-xs text-surface-600 font-semibold mb-0.5">items</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-surface-500 mb-1">Follow-ups</span>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-2xl font-black text-white leading-none">{exam.maxFollowupQuestions}</span>
                                                    <span className="text-xs text-surface-600 font-semibold mb-0.5">max</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
