// ============================================================
// AIVES — Exam Analytics & Performance Dashboard (Lecturer)
// ============================================================
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    Download, Printer, Users, CheckCircle2, TrendingUp, Trophy, 
    AlertCircle, Sparkles, ChevronRight, Search, 
    BarChart3, Layers, TableProperties, X, ArrowUpRight 
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGetExamAnalytics, apiGetExamById, apiExportReport } from '../mocks/mockApi';
import { LoadingSpinner, StatusBadge } from '../components/ui';
import { ScheduleStatus } from '../types';
import { cn } from '../lib/utils';

// Custom Tooltip for Recharts
function CustomChartTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        const pData = payload[0].payload;
        return (
            <div className="bg-surface-900/95 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl max-w-xs">
                <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-1">
                    {pData.tierLabel || `Thang điểm: ${label}`}
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-black text-white">{payload[0].value}</span>
                    <span className="text-xs text-surface-400 font-medium">thí sinh</span>
                </div>
                {pData.students && pData.students.length > 0 && (
                    <div className="border-t border-white/5 pt-2 mt-2">
                        <p className="text-[10px] uppercase font-semibold text-surface-500 tracking-wider mb-1.5">Danh sách thí sinh:</p>
                        <div className="space-y-1">
                            {pData.students.map((st, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-surface-300 truncate max-w-[140px]">
                                        {typeof st === 'string' ? st : st.name}
                                    </span>
                                    {st.score !== undefined && (
                                        <span className="font-mono font-bold text-primary-400 ml-2">
                                            {st.score.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
}

export default function Analytics() {
    const { examId } = useParams();
    const [exam, setExam] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    
    // UI View states
    const [chartMode, setChartMode] = useState('tiers'); // 'tiers' | 'intervals'
    const [questionView, setQuestionView] = useState('cards'); // 'cards' | 'table'
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [studentFilter, setStudentFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (examId) {
            Promise.all([apiGetExamById(examId), apiGetExamAnalytics(examId)]).then(([e, a]) => {
                setExam(e || null);
                setData(a);
                setLoading(false);
            });
        }
    }, [examId]);

    const handleExport = async () => {
        if (!examId) return;
        setExporting(true);
        try {
            const blob = await apiExportReport(examId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AIVES_GradeReport_${exam?.title?.replace(/\s+/g, '_') || examId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Filtered students
    const filteredStudents = useMemo(() => {
        if (!data?.studentsList) return [];
        return data.studentsList.filter((s) => {
            const matchesFilter = 
                studentFilter === 'ALL' ? true :
                studentFilter === 'GRADED' ? s.status === ScheduleStatus.GRADED :
                studentFilter === 'COMPLETED' ? s.status === ScheduleStatus.COMPLETED :
                studentFilter === 'PENDING' ? s.status === ScheduleStatus.PENDING : true;
            
            const matchesQuery = 
                s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchesFilter && matchesQuery;
        });
    }, [data, studentFilter, searchQuery]);

    if (loading) return <LoadingSpinner text="Đang tải dữ liệu phân tích kỳ thi..." />;
    if (!data || !exam) {
        return (
            <div className="max-w-4xl mx-auto py-16 text-center">
                <AlertCircle className="w-12 h-12 text-surface-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy dữ liệu kỳ thi</h2>
                <p className="text-surface-400 mb-6">Kỳ thi này không tồn tại hoặc chưa có dữ liệu thống kê.</p>
                <Link to="/exams" className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 transition-colors inline-block">
                    Quay lại danh sách kỳ thi
                </Link>
            </div>
        );
    }

    const { overallStats, academicTiers, scoreDistribution, questionDifficulty } = data;

    return (
        <div className="max-w-6xl mx-auto py-2 pb-24 print:py-0 print:pb-0">
            {/* Navigation & Header */}
            <div className="mb-8 print:hidden">
                <div className="flex items-center gap-2 text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4">
                    <Link to="/exams" className="hover:text-white transition-colors">Kỳ thi</Link>
                    <span>/</span>
                    <Link to={`/exams/${examId}`} className="hover:text-white transition-colors truncate max-w-xs">
                        {exam.title}
                    </Link>
                    <span>/</span>
                    <span className="text-primary-400">Báo cáo phân tích</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                Báo cáo & Phân tích Kỳ thi Vấn đáp
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                                {exam.courseName}
                            </span>
                        </div>
                        <p className="text-sm text-surface-400">
                            {exam.title} • Giảng viên phụ trách: <span className="text-surface-300 font-medium">{exam.createdByName}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {overallStats.pendingReviewCount > 0 && (
                            <Link 
                                to={`/exams/${examId}/grading`}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20 text-xs font-bold hover:bg-accent-500/20 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Chấm điểm ({overallStats.pendingReviewCount})</span>
                            </Link>
                        )}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-900 border border-white/10 text-surface-300 hover:text-white hover:bg-surface-800 text-xs font-semibold transition-colors cursor-pointer"
                            title="In báo cáo hoặc lưu định dạng PDF"
                        >
                            <Printer className="w-4 h-4" />
                            <span>In / PDF</span>
                        </button>
                        <button 
                            onClick={handleExport} 
                            disabled={exporting} 
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                            <span>{exporting ? 'Đang xuất file...' : 'Xuất CSV'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Print-only title */}
            <div className="hidden print:block mb-6 border-b border-surface-700 pb-4">
                <h1 className="text-2xl font-bold text-black">{exam.title} — BÁO CÁO PHÂN TÍCH</h1>
                <p className="text-sm text-surface-600 mt-1">Môn học: {exam.courseName} | Giảng viên: {exam.createdByName}</p>
                <p className="text-xs text-surface-500 mt-1">Ngày xuất báo cáo: {new Date().toLocaleString('vi-VN')}</p>
            </div>

            {/* Human-in-the-Loop Governance Alert */}
            {overallStats.pendingReviewCount > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-warning-500/10 via-surface-900 to-surface-900 border border-warning-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
                >
                    <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-warning-500/20 border border-warning-500/30 flex items-center justify-center shrink-0 text-warning-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">Yêu cầu Giảng viên thẩm định kết quả</h4>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-warning-500/20 text-warning-400 border border-warning-500/30">
                                    Human-in-the-Loop
                                </span>
                            </div>
                            <p className="text-xs text-surface-300 mt-0.5">
                                Đã có <strong className="text-white">{overallStats.pendingReviewCount} bài thi</strong> được AI chấm sơ bộ và đang chờ bạn phê duyệt điểm số chính thức vào hệ thống.
                            </p>
                        </div>
                    </div>
                    <Link
                        to={`/exams/${examId}/grading`}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-warning-500 text-black text-xs font-bold hover:bg-warning-400 transition-colors shadow-lg shrink-0"
                    >
                        <span>Duyệt điểm ngay</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            )}

            {/* Academic KPIs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Completion & Evaluation Rate */}
                <div className="glass-light rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 text-surface-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Tiến độ thi & chấm</span>
                        <Users className="w-4 h-4 text-primary-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white font-mono leading-none">
                            {Math.round((overallStats.completedCount / Math.max(1, overallStats.totalStudents)) * 100)}%
                        </p>
                        <span className="text-xs text-surface-400 font-medium">
                            ({overallStats.completedCount}/{overallStats.totalStudents})
                        </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-surface-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                        <span>{overallStats.gradedCount} đã duyệt chính thức</span>
                    </div>
                </div>

                {/* 2. Average Score */}
                <div className="glass-light rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 text-surface-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Điểm trung bình</span>
                        <TrendingUp className="w-4 h-4 text-primary-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-3xl font-black text-white font-mono leading-none">
                            {overallStats.avgScore.toFixed(1)}
                        </p>
                        <span className="text-sm font-semibold text-surface-500">/ 10.0</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-surface-400">
                        <span className={cn(
                            "font-bold font-mono",
                            overallStats.avgScore >= 5.0 ? "text-accent-400" : "text-danger-400"
                        )}>
                            {overallStats.avgScore >= 5.0 ? `+${(overallStats.avgScore - 5.0).toFixed(1)}` : `-${(5.0 - overallStats.avgScore).toFixed(1)}`}
                        </span>
                        <span>so với chuẩn đạt (5.0)</span>
                    </div>
                </div>

                {/* 3. Passing Rate */}
                <div className="glass-light rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 text-surface-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Tỷ lệ đạt chuẩn</span>
                        <CheckCircle2 className="w-4 h-4 text-accent-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-accent-400 font-mono leading-none">
                            {overallStats.passRate}%
                        </p>
                        <span className="text-xs text-surface-400 font-medium">
                            ({overallStats.passCount}/{overallStats.completedCount})
                        </span>
                    </div>
                    <p className="mt-3 text-[11px] text-surface-400">
                        Thí sinh đạt điểm số từ 5.0 trở lên
                    </p>
                </div>

                {/* 4. Score Spread & Range */}
                <div className="glass-light rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 text-surface-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Biên độ điểm số</span>
                        <Trophy className="w-4 h-4 text-warning-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-white font-mono leading-none">
                            {overallStats.lowestScore.toFixed(1)} – {overallStats.highestScore.toFixed(1)}
                        </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-surface-400">
                        <span>Trung vị (Median):</span>
                        <span className="font-mono font-bold text-white">{overallStats.medianScore.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* Score Distribution Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Histogram */}
                <div className="lg:col-span-2 glass rounded-3xl p-6 md:p-7 border border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-bold text-white">Phân phối điểm số (Score Distribution)</h3>
                            <p className="text-xs text-surface-400 mt-0.5">
                                Thống kê mật độ điểm của các thí sinh đã hoàn thành kỳ thi
                            </p>
                        </div>

                        {/* Switch Chart Mode */}
                        <div className="flex items-center bg-surface-900/90 border border-white/10 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                            <button
                                onClick={() => setChartMode('tiers')}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                                    chartMode === 'tiers' 
                                        ? "bg-primary-600 text-white shadow" 
                                        : "text-surface-400 hover:text-surface-200"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Thang xếp loại
                            </button>
                            <button
                                onClick={() => setChartMode('intervals')}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                                    chartMode === 'intervals' 
                                        ? "bg-primary-600 text-white shadow" 
                                        : "text-surface-400 hover:text-surface-200"
                                )}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Thang 10 điểm
                            </button>
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={chartMode === 'tiers' ? academicTiers : scoreDistribution} 
                                margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis 
                                    dataKey="range" 
                                    stroke="#71717a" 
                                    tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }} 
                                    tickLine={false} 
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                                />
                                <YAxis 
                                    stroke="#71717a" 
                                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    allowDecimals={false} 
                                    domain={[0, 'dataMax + 1']}
                                />
                                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                
                                {chartMode === 'tiers' ? (
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                                        {academicTiers.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                ) : (
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                                        {scoreDistribution.map((_, index) => (
                                            <Cell 
                                                key={`cell-dist-${index}`} 
                                                fill={
                                                    index < 2 ? '#ef4444' : 
                                                    index < 4 ? '#f59e0b' : 
                                                    index < 6 ? '#3b82f6' : '#10b981'
                                                } 
                                            />
                                        ))}
                                    </Bar>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart Legend / Benchmarks */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-surface-400">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                                <span>Giỏi (8.0 - 10)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                                <span>Khá (6.5 - 7.9)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
                                <span>Trung bình (5.0 - 6.4)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
                                <span>Chưa đạt (&lt; 5.0)</span>
                            </div>
                        </div>
                        <span className="text-[11px] text-surface-500 font-mono">
                            Ngưỡng đạt tối thiểu: 5.0 điểm
                        </span>
                    </div>
                </div>

                {/* Score Breakdown Summary Card */}
                <div className="glass rounded-3xl p-6 md:p-7 border border-white/5 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white mb-1">Tổng hợp xếp loại học lực</h3>
                        <p className="text-xs text-surface-400 mb-5">
                            Căn cứ theo thang điểm đại học hệ 10
                        </p>

                        <div className="space-y-4">
                            {academicTiers.map((tier, idx) => {
                                const pct = overallStats.completedCount > 0 
                                    ? Math.round((tier.count / overallStats.completedCount) * 100) 
                                    : 0;
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-surface-200">{tier.tierLabel}</span>
                                            <span className="font-mono font-bold text-white">
                                                {tier.count} SV <span className="text-surface-500 font-normal">({pct}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden border border-white/5">
                                            <div 
                                                className="h-full rounded-full transition-all duration-700" 
                                                style={{ width: `${pct}%`, backgroundColor: tier.color }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-surface-900/60 border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary-400 mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Đánh giá từ AI Examiner</span>
                        </div>
                        <p className="text-xs text-surface-300 leading-relaxed">
                            Mặt bằng sinh viên nắm vững các khái niệm nền tảng về kiến trúc phần mềm (SOLID, Modular Monolith). Các câu hỏi thiết kế hệ thống phân tán nâng cao cần cải thiện thêm về tính thực tiễn.
                        </p>
                    </div>
                </div>
            </div>

            {/* Question Analytics Section */}
            <div className="glass rounded-3xl p-6 md:p-7 border border-white/5 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-base font-bold text-white">Phân tích chuyên sâu Ngân hàng câu hỏi</h3>
                        <p className="text-xs text-surface-400 mt-0.5">
                            Đo lường độ khó, tỷ lệ hoàn thành và điểm số trung bình qua các ca vấn đáp
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-surface-900/90 border border-white/10 p-1 rounded-xl">
                            <button
                                onClick={() => setQuestionView('cards')}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                                    questionView === 'cards' 
                                        ? "bg-primary-600 text-white" 
                                        : "text-surface-400 hover:text-surface-200"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Thẻ
                            </button>
                            <button
                                onClick={() => setQuestionView('table')}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                                    questionView === 'table' 
                                        ? "bg-primary-600 text-white" 
                                        : "text-surface-400 hover:text-surface-200"
                                )}
                            >
                                <TableProperties className="w-3.5 h-3.5" />
                                Bảng
                            </button>
                        </div>
                    </div>
                </div>

                {questionView === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {questionDifficulty.map((q) => {
                            const isAssessed = q.timesAsked > 0;
                            return (
                                <div 
                                    key={q.questionId}
                                    onClick={() => setSelectedQuestion(q)}
                                    className="p-5 rounded-2xl bg-surface-900/50 border border-white/5 hover:border-primary-500/30 hover:bg-surface-800/30 transition-all cursor-pointer flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                                q.difficulty === 'HARD' ? 'text-danger-400 bg-danger-500/10 border-danger-500/20' :
                                                q.difficulty === 'MEDIUM' ? 'text-warning-400 bg-warning-500/10 border-warning-500/20' :
                                                'text-accent-400 bg-accent-500/10 border-accent-500/20'
                                            )}>
                                                {q.difficulty}
                                            </span>
                                            {isAssessed ? (
                                                <span className="text-xs font-mono font-bold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full border border-accent-500/20">
                                                    Đạt {q.successRate}%
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-surface-500 italic">Chưa hỏi trong ca</span>
                                            )}
                                        </div>

                                        <p className="text-sm font-medium text-surface-200 line-clamp-3 leading-relaxed mb-4 group-hover:text-white transition-colors">
                                            {q.questionContent}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="text-surface-400">
                                                Điểm TB: <strong className="text-white font-mono">{isAssessed ? q.avgScore.toFixed(1) : '—'}</strong>
                                            </span>
                                            <span className="text-surface-500">•</span>
                                            <span className="text-surface-400">
                                                {q.timesAsked} lượt hỏi
                                            </span>
                                        </div>
                                        <span className="text-primary-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold text-[11px]">
                                            Xem chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-white/5 rounded-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface-900 text-surface-400 text-[11px] font-semibold uppercase tracking-wider border-b border-white/5">
                                <tr>
                                    <th className="px-5 py-3.5">Nội dung câu hỏi</th>
                                    <th className="px-4 py-3.5 text-center">Độ khó</th>
                                    <th className="px-4 py-3.5 text-center">Điểm TB</th>
                                    <th className="px-4 py-3.5 text-center">Tỷ lệ Đạt</th>
                                    <th className="px-4 py-3.5 text-center">Số lượt hỏi</th>
                                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-surface-900/30">
                                {questionDifficulty.map((q) => (
                                    <tr key={q.questionId} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4 max-w-md">
                                            <p className="font-medium text-surface-200 line-clamp-2">{q.questionContent}</p>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                                q.difficulty === 'HARD' ? 'text-danger-400 bg-danger-500/10 border-danger-500/20' :
                                                q.difficulty === 'MEDIUM' ? 'text-warning-400 bg-warning-500/10 border-warning-500/20' :
                                                'text-accent-400 bg-accent-500/10 border-accent-500/20'
                                            )}>
                                                {q.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center font-mono font-bold text-white">
                                            {q.timesAsked > 0 ? q.avgScore.toFixed(1) : '—'}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {q.timesAsked > 0 ? (
                                                <span className="text-xs font-mono font-semibold text-accent-400">
                                                    {q.successRate}%
                                                </span>
                                            ) : (
                                                <span className="text-surface-500 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center text-surface-300 font-mono">
                                            {q.timesAsked}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedQuestion(q)}
                                                className="text-primary-400 hover:text-primary-300 text-xs font-semibold cursor-pointer"
                                            >
                                                Xem mẫu AI
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Student Grade Sheet Roster Table */}
            <div className="glass rounded-3xl p-6 md:p-7 border border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-base font-bold text-white">Bảng điểm danh sách thí sinh (Student Grade Sheet)</h3>
                        <p className="text-xs text-surface-400 mt-0.5">
                            Chi tiết điểm AI đề xuất, điểm chính thức đã được giảng viên phê duyệt
                        </p>
                    </div>

                    {/* Filter & Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Tìm theo tên hoặc MSSV..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500 w-full sm:w-48"
                            />
                        </div>

                        <div className="flex items-center bg-surface-900 p-1 rounded-xl border border-white/10 text-xs">
                            <button
                                onClick={() => setStudentFilter('ALL')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                                    studentFilter === 'ALL' ? "bg-primary-600 text-white font-semibold" : "text-surface-400 hover:text-white"
                                )}
                            >
                                Tất cả ({data.studentsList.length})
                            </button>
                            <button
                                onClick={() => setStudentFilter('GRADED')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                                    studentFilter === 'GRADED' ? "bg-primary-600 text-white font-semibold" : "text-surface-400 hover:text-white"
                                )}
                            >
                                Đã duyệt ({overallStats.gradedCount})
                            </button>
                            <button
                                onClick={() => setStudentFilter('COMPLETED')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                                    studentFilter === 'COMPLETED' ? "bg-primary-600 text-white font-semibold" : "text-surface-400 hover:text-white"
                                )}
                            >
                                Chờ duyệt ({overallStats.pendingReviewCount})
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface-900 text-surface-400 text-[11px] font-semibold uppercase tracking-wider border-b border-white/5">
                            <tr>
                                <th className="px-5 py-3.5">Thí sinh</th>
                                <th className="px-4 py-3.5">Ca thi</th>
                                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                                <th className="px-4 py-3.5 text-center">Điểm AI gợi ý</th>
                                <th className="px-4 py-3.5 text-center">Điểm chính thức</th>
                                <th className="px-4 py-3.5">Phê duyệt bởi</th>
                                <th className="px-5 py-3.5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-surface-900/30">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-surface-500 text-xs">
                                        Không tìm thấy thí sinh phù hợp với bộ lọc hiện tại.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((s) => {
                                    const isGraded = s.status === ScheduleStatus.GRADED;
                                    const isCompleted = s.status === ScheduleStatus.COMPLETED;
                                    return (
                                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-white">{s.studentName}</p>
                                                <p className="text-xs text-surface-500 font-mono">{s.studentId}</p>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-surface-300">
                                                <p>{new Date(s.scheduledStartTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – {new Date(s.scheduledEndTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-surface-500 text-[11px]">{new Date(s.scheduledStartTime).toLocaleDateString('vi-VN')}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <StatusBadge status={s.status} />
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {s.aiSuggestedScore !== null ? (
                                                    <span className="font-mono font-bold text-primary-400 text-sm">
                                                        {s.aiSuggestedScore.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-surface-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {isGraded && s.finalScore !== null ? (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-400 border border-accent-500/30 font-mono font-bold text-sm">
                                                        {s.finalScore.toFixed(1)}
                                                    </span>
                                                ) : isCompleted ? (
                                                    <span className="text-[11px] font-semibold text-warning-400 bg-warning-500/10 px-2 py-0.5 rounded-md border border-warning-500/20">
                                                        Đang chờ duyệt
                                                    </span>
                                                ) : (
                                                    <span className="text-surface-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-surface-400">
                                                {s.gradedBy ? (
                                                    <div>
                                                        <p className="text-surface-200 font-medium">{exam.createdByName}</p>
                                                        <p className="text-surface-500 text-[10px]">
                                                            {s.gradedAt ? new Date(s.gradedAt).toLocaleDateString('vi-VN') : ''}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-surface-600 italic">Chưa duyệt</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {isCompleted ? (
                                                    <Link 
                                                        to={`/exams/${examId}/grading/${s.id}`}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-warning-500/20 hover:bg-warning-500/30 text-warning-300 text-xs font-bold transition-colors border border-warning-500/30"
                                                    >
                                                        Chấm điểm
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                ) : isGraded ? (
                                                    <Link 
                                                        to={`/results/${s.id}`}
                                                        className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 text-xs font-semibold transition-colors"
                                                    >
                                                        Xem kết quả
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                ) : (
                                                    <span className="text-surface-600 text-xs">Chưa thi</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Question Detail Modal */}
            <AnimatePresence>
                {selectedQuestion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-surface-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
                        >
                            <button
                                onClick={() => setSelectedQuestion(null)}
                                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-2 mb-4">
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border",
                                    selectedQuestion.difficulty === 'HARD' ? 'text-danger-400 bg-danger-500/10 border-danger-500/20' :
                                    selectedQuestion.difficulty === 'MEDIUM' ? 'text-warning-400 bg-warning-500/10 border-warning-500/20' :
                                    'text-accent-400 bg-accent-500/10 border-accent-500/20'
                                )}>
                                    {selectedQuestion.difficulty}
                                </span>
                                <span className="text-xs text-surface-400 font-mono">ID: {selectedQuestion.questionId}</span>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-6 leading-relaxed">
                                {selectedQuestion.questionContent}
                            </h3>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-black/30 border border-white/5">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-surface-500">Điểm trung bình</p>
                                    <p className="text-xl font-bold font-mono text-white mt-1">
                                        {selectedQuestion.timesAsked > 0 ? `${selectedQuestion.avgScore.toFixed(1)}/10` : 'Chưa có'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-surface-500">Tỷ lệ trả lời đạt</p>
                                    <p className="text-xl font-bold font-mono text-accent-400 mt-1">
                                        {selectedQuestion.timesAsked > 0 ? `${selectedQuestion.successRate}%` : 'Chưa có'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-surface-500">Số lượt vấn đáp</p>
                                    <p className="text-xl font-bold font-mono text-primary-400 mt-1">
                                        {selectedQuestion.timesAsked}
                                    </p>
                                </div>
                            </div>

                            {/* Qualitative Feedback from AI */}
                            <div className="p-4 rounded-2xl bg-primary-500/5 border border-primary-500/20 mb-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-primary-300 mb-2">
                                    <Sparkles className="w-4 h-4 text-primary-400" />
                                    <span>Ghi chú đánh giá từ AI Examiner</span>
                                </div>
                                <p className="text-xs text-surface-300 leading-relaxed italic">
                                    "{selectedQuestion.latestFeedback}"
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setSelectedQuestion(null)}
                                    className="px-5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-white text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
