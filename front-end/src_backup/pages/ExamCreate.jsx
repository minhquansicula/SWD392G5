// ============================================================
// AIVES — Exam Create Page (Multi-Step Form)
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Users, Clock, FileText } from 'lucide-react';
import { apiCreateExam, apiCreateSchedules, getMockCourses, getMockStudents } from '../mocks/mockApi';
const steps = [
    { label: 'Exam Details', icon: FileText },
    { label: 'Student Roster', icon: Users },
    { label: 'Time Slots', icon: Clock },
    { label: 'Review', icon: Check },
];
export default function ExamCreate() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    // Form state
    const [courseId, setCourseId] = useState('');
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [maxMain, setMaxMain] = useState(3);
    const [maxFollowup, setMaxFollowup] = useState(2);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [slotDuration, setSlotDuration] = useState(30);
    const courses = getMockCourses();
    const students = getMockStudents();
    const toggleStudent = (id) => {
        setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
    };
    const handleSubmit = async () => {
        setSubmitting(true);
        const exam = await apiCreateExam({
            courseId,
            title,
            startDate,
            endDate,
            maxMainQuestions: maxMain,
            maxFollowupQuestions: maxFollowup,
        });
        // Generate timeslots
        const start = new Date(startDate);
        const schedules = selectedStudents.map((studentId, i) => ({
            studentId,
            startTime: new Date(start.getTime() + i * slotDuration * 60000).toISOString(),
            endTime: new Date(start.getTime() + (i + 1) * slotDuration * 60000).toISOString(),
        }));
        await apiCreateSchedules(exam.id, { schedules });
        setSubmitting(false);
        navigate(`/exams/${exam.id}`);
    };
    const inputCls = 'w-full px-4 py-3 rounded-xl bg-surface-900/50 border border-surface-800 text-surface-100 text-sm placeholder-surface-200/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-all';
    const labelCls = 'block text-sm font-medium text-surface-200/70 mb-2';
    return (<div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <button onClick={() => navigate('/exams')} className="flex items-center gap-2 text-sm text-surface-200/60 hover:text-surface-100 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4"/>
        Back to Exams
      </button>

      <h1 className="text-2xl font-bold text-surface-100 mb-8">Create New Exam</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10">
        {steps.map((s, i) => (<div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step
                ? 'bg-primary-600 text-white'
                : 'bg-surface-800 text-surface-200/40'}`}>
                {i < step ? <Check className="w-4 h-4"/> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-primary-300' : 'text-surface-200/40'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (<div className={`flex-1 h-px mx-3 ${i < step ? 'bg-primary-500' : 'bg-surface-800'}`}/>)}
          </div>))}
      </div>

      {/* Step Content */}
      <div className="glass rounded-2xl p-8">
        {/* Step 1: Exam Details */}
        {step === 0 && (<div className="space-y-6 animate-fade-in">
            <div>
              <label className={labelCls}>Course</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
                <option value="">Select a course...</option>
                {courses.map((c) => (<option key={c.id} value={c.id}>
                    {c.courseCode} — {c.courseName}
                  </option>))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Exam Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Viva Exam — Midterm" className={inputCls}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date & Time</label>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>End Date & Time</label>
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Max Main Questions</label>
                <input type="number" min={1} max={10} value={maxMain} onChange={(e) => setMaxMain(+e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Max Follow-up Questions</label>
                <input type="number" min={0} max={5} value={maxFollowup} onChange={(e) => setMaxFollowup(+e.target.value)} className={inputCls}/>
              </div>
            </div>
          </div>)}

        {/* Step 2: Student Roster */}
        {step === 1 && (<div className="animate-fade-in">
            <p className="text-sm text-surface-200/60 mb-4">
              Select students for this exam ({selectedStudents.length} selected)
            </p>
            <div className="space-y-2">
              {students.map((student) => (<label key={student.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedStudents.includes(student.id)
                    ? 'bg-primary-600/15 border border-primary-500/30'
                    : 'bg-surface-800/30 border border-transparent hover:bg-surface-800/50'}`}>
                  <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} className="w-4 h-4 rounded border-surface-200/30 text-primary-600 focus:ring-primary-500/25"/>
                  <span className="text-sm text-surface-100">{student.fullName}</span>
                  <span className="text-xs text-surface-200/40 ml-auto">@{student.username}</span>
                </label>))}
            </div>
          </div>)}

        {/* Step 3: Time Slots */}
        {step === 2 && (<div className="animate-fade-in">
            <div className="mb-6">
              <label className={labelCls}>Slot Duration (minutes)</label>
              <input type="number" min={10} max={60} value={slotDuration} onChange={(e) => setSlotDuration(+e.target.value)} className={`${inputCls} max-w-xs`}/>
            </div>
            <p className="text-sm text-surface-200/60 mb-4">Preview — auto-generated timeslots:</p>
            <div className="space-y-2">
              {selectedStudents.map((id, i) => {
                const student = students.find((s) => s.id === id);
                const start = startDate ? new Date(new Date(startDate).getTime() + i * slotDuration * 60000) : null;
                const end = start ? new Date(start.getTime() + slotDuration * 60000) : null;
                return (<div key={id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/30">
                    <span className="text-sm text-surface-100">{student?.fullName}</span>
                    <span className="text-xs text-surface-200/50 font-mono">
                      {start?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} —{' '}
                      {end?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>);
            })}
            </div>
          </div>)}

        {/* Step 4: Review */}
        {step === 3 && (<div className="animate-fade-in space-y-4">
            <h3 className="text-lg font-semibold text-surface-100">Review & Submit</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-surface-800/30">
                <p className="text-surface-200/50 text-xs mb-1">Course</p>
                <p className="text-surface-100">{courses.find((c) => c.id === courseId)?.courseName ?? '—'}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/30">
                <p className="text-surface-200/50 text-xs mb-1">Title</p>
                <p className="text-surface-100">{title || '—'}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/30">
                <p className="text-surface-200/50 text-xs mb-1">Questions</p>
                <p className="text-surface-100">{maxMain} main + {maxFollowup} follow-ups</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/30">
                <p className="text-surface-200/50 text-xs mb-1">Students</p>
                <p className="text-surface-100">{selectedStudents.length} enrolled</p>
              </div>
            </div>
          </div>)}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-surface-200/70 hover:bg-surface-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ArrowLeft className="w-4 h-4"/>
          Previous
        </button>
        {step < 3 ? (<button onClick={() => setStep((s) => s + 1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-all">
            Next
            <ArrowRight className="w-4 h-4"/>
          </button>) : (<button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 text-white text-sm font-medium hover:from-accent-500 hover:to-accent-400 transition-all disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Exam'}
            <Check className="w-4 h-4"/>
          </button>)}
      </div>
    </div>);
}
