// ============================================================
// AIVES — Exam List Page (Lecturer)
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, BookOpen, Users } from 'lucide-react';
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
    if (loading)
        return <LoadingSpinner text="Loading exams..."/>;
    return (<div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Exam Management</h1>
          <p className="text-sm text-surface-200/60 mt-1">Create and manage viva examination sessions</p>
        </div>
        <Link to="/exams/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-600/25">
          <Plus className="w-4 h-4"/>
          Create Exam
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40"/>
        <input type="text" placeholder="Search exams by title or course..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-900/50 border border-surface-800 text-surface-100 text-sm placeholder-surface-200/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-all"/>
      </div>

      {/* Exam Cards */}
      {filtered.length === 0 ? (<EmptyState title="No exams found" description="Create your first viva exam to get started."/>) : (<div className="grid gap-4">
          {filtered.map((exam) => (<Link key={exam.id} to={`/exams/${exam.id}`} className="glass-light rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-300 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-surface-100 group-hover:text-primary-300 transition-colors">
                    {exam.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-3 text-sm text-surface-200/60">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5"/>
                      {exam.courseName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5"/>
                      {new Date(exam.startDate).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5"/>
                      {exam.createdByName}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  <div className="px-4 py-2 rounded-xl bg-surface-800/30">
                    <p className="text-lg font-bold text-primary-400">{exam.maxMainQuestions}</p>
                    <p className="text-[10px] text-surface-200/40 uppercase">Questions</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-surface-800/30">
                    <p className="text-lg font-bold text-accent-400">{exam.maxFollowupQuestions}</p>
                    <p className="text-[10px] text-surface-200/40 uppercase">Follow-ups</p>
                  </div>
                </div>
              </div>
            </Link>))}
        </div>)}
    </div>);
}
