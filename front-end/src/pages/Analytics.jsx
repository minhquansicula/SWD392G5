// ============================================================
// AIVES — Analytics Dashboard (Lecturer)
// ============================================================
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Users, CheckCircle2, TrendingUp, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, } from 'recharts';
import { apiGetExamAnalytics, apiGetExamById, apiExportReport } from '../mocks/mockApi';
import { LoadingSpinner } from '../components/ui';
export default function Analytics() {
    const { examId } = useParams();
    const [exam, setExam] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
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
        if (!examId)
            return;
        setExporting(true);
        try {
            const blob = await apiExportReport(examId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AIVES_Report_${examId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        }
        finally {
            setExporting(false);
        }
    };
    if (loading)
        return <LoadingSpinner text="Loading analytics data..."/>;
    if (!data || !exam)
        return <div>Not found</div>;
    const { overallStats, scoreDistribution, questionDifficulty } = data;
    // Custom Tooltip for Recharts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (<div className="glass rounded-lg p-3 text-sm shadow-xl border border-surface-800">
          <p className="font-semibold text-surface-200 mb-1">Score Range: {label}</p>
          <p className="text-primary-400 font-bold">{payload[0].value} students</p>
        </div>);
        }
        return null;
    };
    return (<div className="max-w-6xl mx-auto animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button className="flex items-center gap-2 text-sm text-surface-200/60 hover:text-surface-100 mb-4 transition-colors">
            <Link to={`/exams/${examId}`} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4"/>
              Back to Exam
            </Link>
          </button>
          <h1 className="text-2xl font-bold text-surface-100">Exam Analytics</h1>
          <p className="text-sm text-surface-200/60 mt-1">{exam.title}</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-800 text-surface-100 text-sm font-medium hover:bg-surface-700 transition-colors border border-surface-700 disabled:opacity-50">
          <Download className="w-4 h-4"/>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-light rounded-2xl p-5 border-t-2 border-t-surface-700">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <Users className="w-4 h-4"/>
            <span className="text-xs uppercase font-medium">Completion Rate</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-surface-100">
              {Math.round((overallStats.completedCount / Math.max(1, overallStats.totalStudents)) * 100)}%
            </p>
            <p className="text-sm text-surface-200/50 mb-1">
              ({overallStats.completedCount}/{overallStats.totalStudents})
            </p>
          </div>
        </div>
        
        <div className="glass-light rounded-2xl p-5 border-t-2 border-t-primary-500">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <TrendingUp className="w-4 h-4 text-primary-400"/>
            <span className="text-xs uppercase font-medium">Average Score</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">{overallStats.avgScore.toFixed(1)}</p>
        </div>
        
        <div className="glass-light rounded-2xl p-5 border-t-2 border-t-accent-500">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <Trophy className="w-4 h-4 text-accent-400"/>
            <span className="text-xs uppercase font-medium">Highest Score</span>
          </div>
          <p className="text-3xl font-bold text-accent-400">{overallStats.highestScore.toFixed(1)}</p>
        </div>
        
        <div className="glass-light rounded-2xl p-5 border-t-2 border-t-danger-500">
          <div className="flex items-center gap-3 text-surface-200/60 mb-2">
            <CheckCircle2 className="w-4 h-4 text-danger-400"/>
            <span className="text-xs uppercase font-medium">Lowest Score</span>
          </div>
          <p className="text-3xl font-bold text-danger-400">{overallStats.lowestScore.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <div className="md:col-span-2 glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-6">Score Distribution</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="range" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false}/>
                <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }}/>
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {scoreDistribution.map((_, index) => (<Cell key={`cell-${index}`} fill={index < 2 ? '#ef4444' : // 0-4: Red
                index < 4 ? '#f59e0b' : // 4-6: Yellow
                    index < 6 ? '#6366f1' : // 6-8: Indigo
                        '#10b981' // 8-10: Green
            }/>))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Insights */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-6">Question Success Rates</h3>
          <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
            {questionDifficulty
            .sort((a, b) => b.successRate - a.successRate)
            .map((q) => (<div key={q.questionId} className="bg-surface-900/50 p-3 rounded-xl border border-surface-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-surface-200/60">
                      {q.difficulty}
                    </span>
                    <span className={`text-xs font-bold ${q.successRate >= 70 ? 'text-accent-400' : q.successRate >= 40 ? 'text-warning-400' : 'text-danger-400'}`}>
                      {q.successRate}%
                    </span>
                  </div>
                  <p className="text-xs text-surface-100 line-clamp-2" title={q.questionContent}>
                    {q.questionContent}
                  </p>
                  <div className="w-full h-1 bg-surface-800 rounded-full mt-2">
                    <div className={`h-full rounded-full ${q.successRate >= 70 ? 'bg-accent-500' : q.successRate >= 40 ? 'bg-warning-500' : 'bg-danger-500'}`} style={{ width: `${q.successRate}%` }}/>
                  </div>
                </div>))}
          </div>
        </div>
      </div>
    </div>);
}
