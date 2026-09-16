import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Sliders,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  BookOpen,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Exam, RubricCriterion, AiExaminerConfig } from '../../types';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateExam: (newExam: Exam) => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  isOpen,
  onClose,
  onCreateExam,
}) => {
  const [step, setStep] = useState<number>(1);

  // Form states
  const [code, setCode] = useState('AI-450');
  const [title, setTitle] = useState('Deep Learning & Neural Architectures');
  const [course, setCourse] = useState('M.Sc. Artificial Intelligence');
  const [department, setDepartment] = useState('Faculty of Computing & Data Science');
  const [term, setTerm] = useState('Fall 2026');
  const [vivaDurationMin, setVivaDurationMin] = useState(15);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [passingMarks, setPassingMarks] = useState(25);

  const [syllabusTopics, setSyllabusTopics] = useState<string[]>([
    'Attention Mechanism & Transformer Encoders/Decoders',
    'Gradient Vanishing & Residual Connections (ResNet)',
    'Backpropagation Through Time (BPTT) in Recurrent Models',
    'Optimization: AdamW vs SGD with Cosine Annealing',
  ]);
  const [newTopic, setNewTopic] = useState('');

  const [rubric, setRubric] = useState<RubricCriterion[]>([
    {
      id: 'r1',
      name: 'Mathematical Rigor & Loss Formulations',
      weight: 35,
      description: 'Ability to derive loss functions and explain optimization dynamics.',
      maxScore: 35,
    },
    {
      id: 'r2',
      name: 'Architectural Selection & Tradeoffs',
      weight: 35,
      description: 'Justifying model choices, latency vs parameter capacity.',
      maxScore: 35,
    },
    {
      id: 'r3',
      name: 'Verbal Articulation & Socratic Defense',
      weight: 30,
      description: 'Responding to adversarial constraints and edge cases.',
      maxScore: 30,
    },
  ]);

  const [examinerConfig, setExaminerConfig] = useState<AiExaminerConfig>({
    name: 'Dr. Turing (AI-Neural)',
    title: 'Chair of Deep Learning & Foundations',
    persona: 'rigorous_socratic',
    voiceType: 'en-US-Neural2-J',
    avatarStyle: 'holographic',
    followUpDepth: 2,
    strictness: 'moderate',
  });

  if (!isOpen) return null;

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setSyllabusTopics([...syllabusTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (index: number) => {
    setSyllabusTopics(syllabusTopics.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      code,
      title,
      course,
      department,
      term,
      status: 'scheduled',
      scheduledDate: new Date().toISOString().split('T')[0],
      vivaDurationMin,
      totalQuestions,
      totalMarks: rubric.reduce((sum, r) => sum + r.maxScore, 0),
      passingMarks,
      assignedCandidateCount: 18,
      completedCandidateCount: 0,
      syllabusTopics,
      rubric,
      examinerConfig,
      instructions: 'Oral examination conducted by AI Examiner. Students will be evaluated on technical clarity and response to probing questions.',
      questions: [
        {
          id: 'q-new-1',
          index: 1,
          topic: syllabusTopics[0] || 'Core Architecture',
          questionText: 'Explain the mathematical purpose of the Softmax scaling factor (sqrt of d_k) in Scaled Dot-Product Attention.',
          difficulty: 'intermediate',
          expectedConcepts: ['Dot product variance', 'Softmax saturation', 'Gradient vanishing', 'Vector dimension d_k'],
          maxMarks: 10,
        },
      ],
    };

    onCreateExam(newExam);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Create AI Viva Examination
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {step} of 3: {step === 1 ? 'Exam & Course Overview' : step === 2 ? 'Syllabus & Rubric' : 'AI Examiner Configuration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          {[
            { num: 1, label: 'Course & Duration' },
            { num: 2, label: 'Syllabus & Rubrics' },
            { num: 3, label: 'AI Examiner Tuning' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
                step === s.num
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : step > s.num
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-indigo-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {step > s.num ? <Check className="h-3 w-3" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Term *
                  </label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Examination Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Degree / Cohort Program
                  </label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                    Viva Duration
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min={5}
                      max={45}
                      value={vivaDurationMin}
                      onChange={(e) => setVivaDurationMin(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-500 font-medium">mins</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                    Total Questions
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min={3}
                      max={12}
                      value={totalQuestions}
                      onChange={(e) => setTotalQuestions(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-500 font-medium">items</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                    Pass Mark
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-500 font-medium">pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Syllabus topics list */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Assessed Topics & Knowledge Blueprint
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add topic (e.g. Diffusion Models vs GANs)..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {syllabusTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {index + 1}. {topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(index)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rubric evaluation criteria */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Grading Rubric Breakdown
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total weight:{' '}
                    {rubric.reduce((acc, r) => acc + r.weight, 0)}%
                  </span>
                </div>

                <div className="space-y-2">
                  {rubric.map((criterion, idx) => (
                    <div
                      key={criterion.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {criterion.name}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {criterion.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                          {criterion.weight}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">weight</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {/* AI Examiner Persona & Voice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    AI Examiner Persona Name
                  </label>
                  <input
                    type="text"
                    value={examinerConfig.name}
                    onChange={(e) =>
                      setExaminerConfig({ ...examinerConfig, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Persona Archetype
                  </label>
                  <select
                    value={examinerConfig.persona}
                    onChange={(e) =>
                      setExaminerConfig({
                        ...examinerConfig,
                        persona: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="rigorous_socratic">
                      Rigorous Socratic (Probing & Counter-arguments)
                    </option>
                    <option value="standard_academic">
                      Standard Academic (Structured & Balanced)
                    </option>
                    <option value="encouraging">
                      Supportive / Formative (Gentle prompting)
                    </option>
                  </select>
                </div>
              </div>

              {/* Avatar Style & Strictness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Avatar Visual Style
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['holographic', 'academic', 'minimalist'] as const).map((style) => (
                      <button
                        type="button"
                        key={style}
                        onClick={() =>
                          setExaminerConfig({ ...examinerConfig, avatarStyle: style })
                        }
                        className={`p-2 rounded-lg border text-center capitalize transition-colors ${
                          examinerConfig.avatarStyle === style
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Evaluation Strictness
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['lenient', 'moderate', 'strict'] as const).map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() =>
                          setExaminerConfig({ ...examinerConfig, strictness: lvl })
                        }
                        className={`p-2 rounded-lg border text-center capitalize transition-colors ${
                          examinerConfig.strictness === lvl
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Socratic Adaptive Probing Depth */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Adaptive Follow-up Probing Depth: Level {examinerConfig.followUpDepth}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Max 2 follow-ups per primary question
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  When a candidate answers, the AI Examiner evaluates key concept coverage in real-time. If key nuances are missing or if the candidate claims advanced knowledge, the examiner generates dynamic follow-up probes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              <Check className="h-4 w-4" /> Create & Publish Exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
