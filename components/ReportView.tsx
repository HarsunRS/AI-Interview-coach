import React, { useState } from 'react';
import { Report, ImprovementPlan } from '../types';

interface ReportViewProps {
  report: Report;
  onReset: () => void;
  theme: 'light' | 'dark';
}

const LEVEL_WIDTH: Record<string, string> = {
  'Beginner': '20%', 'Basic': '20%', 'Developing': '35%', 'Building': '35%',
  'Intermediate': '50%', 'Proficient': '65%', 'Strong': '80%', 'Advanced': '85%',
  'Confident': '80%', 'Expert': '100%'
};

const ReportView: React.FC<ReportViewProps> = ({ report, onReset, theme }) => {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [expandedPractice, setExpandedPractice] = useState<number | null>(null);

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-500';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const softPanel = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200';
  const expandedBg = isDark ? 'bg-slate-800/80' : 'bg-slate-50/60';

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex justify-between items-center mb-10 pt-10">
        <div>
          <h1 className={`text-4xl font-black ${textPrimary} mb-2`}>Session Performance Report</h1>
          <p className={`${mutedText} font-bold uppercase tracking-widest text-xs`}>AI Evaluation - Comprehensive Audit</p>
        </div>
        <div className="flex gap-4">
          <button className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-xs font-black transition-all ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
            Export Data
          </button>
          <button onClick={onReset} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
            Return Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${cardBg} rounded-[2.5rem] p-10 shadow-xl border flex flex-col items-center justify-center text-center`}>
          <div className="relative mb-8">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle cx="96" cy="96" r="80" stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth="12" fill="transparent" />
              <circle cx="96" cy="96" r="80" stroke="#3b82f6" strokeWidth="12" fill="transparent" strokeDasharray={502} strokeDashoffset={502 - (502 * report.overallScore) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-black ${textPrimary}`}>{report.overallScore}</span>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Score</span>
            </div>
          </div>
          <div className="mb-8">
            <span className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-200 shadow-sm">{report.label}</span>
          </div>
          <p className={`text-sm ${textSecondary} leading-relaxed font-medium px-4`}>{report.summary}</p>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Technical depth', val: report.metrics.technicalAccuracy + '%', color: 'bg-blue-600' },
              { label: 'Communication', val: report.metrics.communication + '%', color: 'bg-emerald-500' },
              { label: 'Pronunciation', val: report.metrics.pronunciation + '%', color: 'bg-indigo-500' },
              { label: 'Pace & Fluency', val: report.metrics.fluency + '%', color: 'bg-amber-500' }
            ].map((metric, index) => (
              <div key={index} className={`${cardBg} p-8 rounded-[2rem] border shadow-md space-y-4`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-black ${textPrimary}`}>{metric.val}</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className={`h-full ${metric.color}`} style={{ width: metric.val }} />
                </div>
              </div>
            ))}
          </div>

          <div className={`${cardBg} rounded-[2rem] p-8 border shadow-md`}>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Speech & Clarity Breakdown</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className={`${softPanel} text-center p-4 rounded-2xl border`}>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Clarity Score</p>
                <p className="text-lg font-black text-blue-500">{report.speechAnalysis.clarityScore}%</p>
              </div>
              <div className={`${softPanel} text-center p-4 rounded-2xl border`}>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Speaking Pace</p>
                <p className="text-sm font-black text-emerald-500 uppercase">{report.speechAnalysis.pace}</p>
              </div>
              <div className={`${softPanel} text-center p-4 rounded-2xl border`}>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Filler Words</p>
                <p className="text-sm font-black text-amber-500 uppercase">{report.speechAnalysis.fillerWordUsage}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-[2.5rem] shadow-xl border overflow-hidden`}>
        <div className={`p-10 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Adaptive Difficulty Response Log</h3>
          <p className={`${mutedText} text-xs font-bold uppercase tracking-widest`}>Question escalation and correctness details</p>
        </div>
        <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {report.questionBreakdown.map((question, index) => (
            <div key={index} className="group transition-all">
              <div
                className={`p-10 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50/50'}`}
                onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</div>
                  <div>
                    <p className={`font-black text-sm mb-1 ${textPrimary}`}>{question.questionText}</p>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                      <span>{question.difficulty} Level</span>
                      <span>Score: {question.correctness}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${question.tag === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{question.tag}</span>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedQuestion === index ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                </div>
              </div>

              {expandedQuestion === index && (
                <div className={`p-10 pt-0 ${expandedBg} animate-in slide-in-from-top-2`}>
                  <div className="space-y-6 mt-4">
                    <div className={`${softPanel} p-6 border rounded-2xl`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Your Answer</p>
                      <p className={`text-xs leading-relaxed font-medium ${textPrimary}`}>"{question.userAnswer}"</p>
                    </div>

                    {question.pronunciationFeedback && (
                      <div className={`p-6 border rounded-2xl ${isDark ? 'bg-indigo-950/40 border-indigo-700/50' : 'bg-indigo-50 border-indigo-100'}`}>
                        <h4 className="text-[10px] font-black text-indigo-500 uppercase mb-2">Pronunciation Feedback</h4>
                        <p className={`text-[10px] leading-relaxed font-medium ${isDark ? 'text-indigo-100' : 'text-indigo-800'}`}>{question.pronunciationFeedback}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-emerald-950/40 border-emerald-700/50' : 'bg-emerald-50 border-emerald-100'}`}>
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase mb-3">Correct Insights</h4>
                        <ul className="space-y-2">
                          {question.feedback.whatWentWell.map((item, itemIndex) => (
                            <li key={itemIndex} className={`text-[10px] font-medium ${isDark ? 'text-emerald-100' : 'text-emerald-800'}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-amber-950/40 border-amber-700/50' : 'bg-amber-50 border-amber-100'}`}>
                        <h4 className="text-[10px] font-black text-amber-500 uppercase mb-3">Guidance</h4>
                        <ul className="space-y-2">
                          {question.feedback.areasToImprove.map((item, itemIndex) => (
                            <li key={itemIndex} className={`text-[10px] font-medium ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* ── Improvement Plan ── */}
      {report.improvementPlan && (
        <div className={`${cardBg} rounded-[2.5rem] shadow-xl border overflow-hidden`}>
          <div className={`p-10 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </div>
              <div>
                <h3 className={`text-lg font-black ${textPrimary}`}>Personalized Improvement Plan</h3>
                <p className={`${mutedText} text-xs font-bold uppercase tracking-widest`}>AI-generated action plan based on your session performance</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-12">

            {/* Priority Skills */}
            <div>
              <h4 className={`text-xs font-black text-slate-400 uppercase tracking-widest mb-6`}>Priority Skills to Develop</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.improvementPlan.prioritySkills.map((item, i) => (
                  <div key={i} className={`${softPanel} rounded-2xl border p-6 space-y-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-black text-sm ${textPrimary}`}>{item.skill}</p>
                      <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${i === 0 ? 'bg-red-500/10 text-red-400' : i === 1 ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        #{i + 1} Priority
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span>Now: {item.currentLevel}</span>
                        <span>Goal: {item.targetLevel}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="h-full bg-slate-400/40 rounded-full relative">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-blue-400'}`}
                            style={{ width: LEVEL_WIDTH[item.currentLevel] || '30%' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Resources</p>
                      <ul className="space-y-1">
                        {item.resources.map((r, j) => (
                          <li key={j} className={`text-[10px] font-medium ${textSecondary} leading-snug`}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Wins */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Quick Wins — Do These First</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.improvementPlan.quickWins.map((win, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${isDark ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'}`}>
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className={`text-xs font-medium ${isDark ? 'text-emerald-100' : 'text-emerald-800'} leading-relaxed`}>{win}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4-Week Study Plan */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Study Roadmap</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {report.improvementPlan.weeklyPlan.map((week, i) => (
                  <div key={i} className={`${softPanel} rounded-2xl border p-5 space-y-3`}>
                    <div>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{week.week}</p>
                      <p className={`font-black text-sm mt-1 ${textPrimary}`}>{week.focus}</p>
                    </div>
                    <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <ul className="space-y-2">
                      {week.tasks.map((task, j) => (
                        <li key={j} className={`text-[10px] font-medium ${textSecondary} leading-snug flex gap-2`}>
                          <span className="text-blue-400 shrink-0">→</span>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Practice Questions */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Practice Questions</h4>
              <div className={`rounded-2xl border overflow-hidden divide-y ${isDark ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-100'}`}>
                {report.improvementPlan.practiceQuestions.map((q, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setExpandedPractice(expandedPractice === i ? null : i)}
                      className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                          q.topic === 'Technical' ? 'bg-blue-500/10 text-blue-400' :
                          q.topic === 'System Design' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>{q.topic}</span>
                        <p className={`text-sm font-bold ${textPrimary}`}>{q.question}</p>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 shrink-0 ml-4 transition-transform ${expandedPractice === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </button>
                    {expandedPractice === i && (
                      <div className={`px-5 pb-5 animate-in slide-in-from-top-2`}>
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-blue-950/30 border-blue-800/40' : 'bg-blue-50 border-blue-100'}`}>
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Hint</p>
                          <p className={`text-xs font-medium ${isDark ? 'text-blue-100' : 'text-blue-800'} leading-relaxed`}>{q.hint}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ReportView;
