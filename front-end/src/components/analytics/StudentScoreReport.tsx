import React, { useState } from 'react';
import {
  Download,
  Clock,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StudentEvaluationReport } from '../../types';
import { Language, translations } from '../../utils/i18n';

interface StudentScoreReportProps {
  report: StudentEvaluationReport;
  onViewTranscriptTab: () => void;
  isSimpleMode?: boolean;
  language?: Language;
  dataSourceLabel?: string;
}

export const StudentScoreReport: React.FC<StudentScoreReportProps> = ({
  report,
  onViewTranscriptTab,
  isSimpleMode = true,
  language = 'vi',
  dataSourceLabel,
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(1);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const t = translations[language];
  const excellentCount = report.questionFeedback.filter((q) => q.maxScore > 0 && q.score / q.maxScore >= 0.8).length;

  const handleExportReport = () => {
    const lines = [
      `${report.examTitle} - ${report.courseCode}`,
      `${report.studentName} (${report.matriculationNo})`,
      `Score: ${report.totalScore}/${report.maxScore} (${report.percentage}%) - Grade ${report.gradeLetter}`,
      '',
      ...report.questionFeedback.map(
        (q) => `Q${q.questionNumber} [${q.topic}]: ${q.score}/${q.maxScore} | AI: ${q.examinerCritique}`,
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phieu-diem-${report.matriculationNo}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Student Executive Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-md relative overflow-hidden">
        {/* Ambient decorative pattern */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-mono font-semibold">
                {report.courseCode}
              </span>
              <span className="text-xs text-indigo-200">
                Evaluated {report.evaluatedAt}
              </span>
              {dataSourceLabel && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-100 text-[11px] font-semibold">
                  {dataSourceLabel}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
              {report.studentName}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200">
              Matriculation ID: {report.matriculationNo} • {report.examTitle}
            </p>
          </div>

          {/* Big Grade Stamp & Percentile */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 self-start md:self-auto">
            <div className="text-center">
              <span className="text-[10px] uppercase font-semibold text-indigo-200 block">
                Oral Grade
              </span>
              <span className="text-3xl font-extrabold font-display leading-none">
                {report.gradeLetter}
              </span>
            </div>

            <div className="h-10 w-px bg-white/20" />

            <div className="text-left">
              <div className="font-mono text-xl font-bold">
                {report.totalScore}
                <span className="text-sm font-normal text-indigo-200">
                  /{report.maxScore} pts
                </span>
              </div>
              <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {report.cohortPercentile}th Percentile
              </span>
            </div>
          </div>
        </div>

        {/* Action bar on banner */}
        <div className="mt-6 pt-4 border-t border-indigo-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-indigo-200">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t.duration}: {report.durationSpentMinutes} {t.minutes}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Chỉ số trung thực: {report.academicIntegrityScore}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadSuccess ? 'Đã tải thành công!' : t.exportPdf}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Pillar Competency Breakdown vs Cohort Average (Visible in Detailed Mode) */}
      {!isSimpleMode && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Oral Competency Mastery Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Student score compared against the cohort average benchmark
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Candidate Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Cohort Benchmark</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {report.competencyBreakdown.map((comp, idx) => {
              const studentPercent = Math.round((comp.studentScore / comp.maxScore) * 100);
              const cohortPercent = Math.round((comp.cohortAverage / comp.maxScore) * 100);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                >
                  <div className="flex justify-between items-start text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {comp.category}
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {comp.studentScore}/{comp.maxScore} pts ({studentPercent}%)
                    </span>
                  </div>

                  {/* Comparative Double Bars */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${studentPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Benchmark: {comp.cohortAverage} pts ({cohortPercent}%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{studentPercent - cohortPercent}% above avg
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Examiner Qualitative Appraisal */}
      <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            {t.aiImpression}
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
          "{report.aiExaminerSummary.overallImpression}"
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              {t.strengths}
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium mt-1">
              {report.aiExaminerSummary.topStrength}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              {t.areasToImprove}
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium mt-1">
              {report.aiExaminerSummary.primaryDevelopmentArea}
            </p>
          </div>
        </div>
      </div>

      {/* Question-by-Question Feedback Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              {t.questionSummary}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'vi'
                ? `Đánh giá chi tiết từng câu • ${excellentCount}/${report.questionFeedback.length} câu đạt tốt`
                : `Granular AI examiner breakdown • ${excellentCount}/${report.questionFeedback.length} strong answers`}
            </p>
          </div>
          <button
            onClick={onViewTranscriptTab}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t.viewTranscript} →
          </button>
        </div>

        <div className="space-y-3">
          {report.questionFeedback.map((q) => {
            const isExpanded = expandedQuestion === q.questionNumber;
            const percent = q.maxScore > 0 ? Math.round((q.score / q.maxScore) * 100) : 0;

            return (
              <div
                key={q.questionNumber}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Accordion header */}
                <button
                  onClick={() =>
                    setExpandedQuestion(isExpanded ? null : q.questionNumber)
                  }
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono flex items-center justify-center">
                      {q.questionNumber}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display">
                        {q.topic}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Bloom's Level: {q.bloomTaxonomy}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {q.score}/{q.maxScore} pts ({percent}%)
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Question Prompt:
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        "{q.questionText}"
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Candidate Oral Summary:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300">
                        {q.studentResponseSummary}
                      </p>
                    </div>

                    {q.adaptiveProbeAsked && (
                      <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200">
                        <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block mb-0.5 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Adaptive Socratic Probe Evaluated:
                        </span>
                        <p className="italic font-medium">"{q.adaptiveProbeAsked}"</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                          Key Strengths:
                        </span>
                        <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                          {q.keyStrengths.map((s, si) => (
                            <li key={si}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20">
                        <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block mb-1">
                          Knowledge Gaps / Nuances:
                        </span>
                        <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                          {q.knowledgeGaps.map((g, gi) => (
                            <li key={gi}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        Suggested Revision:{' '}
                      </span>
                      {q.suggestedRevision}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
