
import React, { useState } from 'react';
import { Report, QuestionEvaluation } from '../types';

interface ReportViewProps {
  report: Report;
  onReset: () => void;
  theme: 'light' | 'dark';
}

const ReportView: React.FC<ReportViewProps> = ({ report, onReset, theme }) => {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex justify-between items-center mb-10 pt-10">
         <div>
            <h1 className={`text-4xl font-black ${textPrimary} mb-2`}>Session Performance Report</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">AI Evaluation • Comprehensive Audit</p>
         </div>
         <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-xs font-black hover:bg-slate-50 transition-all">
              📥 Export Data
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
           <p className={`text-sm ${textSecondary} leading-relaxed font-medium px-4`}>
             {report.summary}
           </p>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 gap-4">
             {[
               { label: 'Technical depth', val: report.metrics.technicalAccuracy + '%', color: 'bg-blue-600', icon: '💻' },
               { label: 'Communication', val: report.metrics.communication + '%', color: 'bg-emerald-500', icon: '💬' },
               { label: 'Pronunciation', val: report.metrics.pronunciation + '%', color: 'bg-indigo-500', icon: '🗣️' },
               { label: 'Pace & Fluency', val: report.metrics.fluency + '%', color: 'bg-amber-500', icon: '⚡' },
             ].map((m, i) => (
               <div key={i} className={`${cardBg} p-8 rounded-[2rem] border shadow-md space-y-4`}>
                 <div className="flex items-center justify-between">
                    <span className="text-2xl">{m.icon}</span>
                    <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.val}</span>
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                 <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color}`} style={{ width: m.val }}></div>
                 </div>
               </div>
             ))}
          </div>
          
          <div className={`${cardBg} rounded-[2rem] p-8 border shadow-md`}>
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Speech & Clarity Breakdown</h3>
             <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-slate-50/50 rounded-2xl">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Clarity Score</p>
                   <p className="text-lg font-black text-blue-600">{report.speechAnalysis.clarityScore}%</p>
                </div>
                <div className="text-center p-4 bg-slate-50/50 rounded-2xl">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Speaking Pace</p>
                   <p className="text-sm font-black text-emerald-600 uppercase">{report.speechAnalysis.pace}</p>
                </div>
                <div className="text-center p-4 bg-slate-50/50 rounded-2xl">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Filler Words</p>
                   <p className="text-sm font-black text-amber-600 uppercase">{report.speechAnalysis.fillerWordUsage}</p>
                </div>
             </div>
             {report.speechAnalysis.pronunciationGaps.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Pronunciation Alerts</p>
                   <div className="flex flex-wrap gap-2">
                      {report.speechAnalysis.pronunciationGaps.map((gap, idx) => (
                        <span key={idx} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold border border-red-100">{gap}</span>
                      ))}
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-[2.5rem] shadow-xl border overflow-hidden`}>
        <div className="p-10 border-b border-slate-100">
           <h3 className="text-lg font-black mb-2">Adaptive Difficulty Response Log</h3>
           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Question escalation and correctness details</p>
        </div>
        <div className="divide-y divide-slate-100">
          {report.questionBreakdown.map((q, i) => (
            <div key={i} className="group transition-all">
              <div 
                className="p-10 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
              >
                <div className="flex items-center gap-6">
                   <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{i+1}</div>
                   <div>
                      <p className={`font-black text-sm mb-1 ${textPrimary}`}>{q.questionText}</p>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                         <span>{q.difficulty} Level</span>
                         <span>Score: {q.correctness}%</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${q.tag === 'Excellent' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{q.tag}</span>
                   <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedQuestion === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                </div>
              </div>
              
              {expandedQuestion === i && (
                <div className="p-10 pt-0 bg-slate-50/20 animate-in slide-in-from-top-2">
                   <div className="space-y-6 mt-4">
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Your Answer</p>
                         <p className="text-xs leading-relaxed font-medium">"{q.userAnswer}"</p>
                      </div>

                      {q.pronunciationFeedback && (
                         <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-2 flex items-center gap-2">🗣️ Pronunciation Feedback</h4>
                            <p className="text-[10px] leading-relaxed text-indigo-800 font-medium">{q.pronunciationFeedback}</p>
                         </div>
                      )}

                      <div className="grid grid-cols-2 gap-6">
                         <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-3">✅ Correct Insights</h4>
                            <ul className="space-y-2">
                               {q.feedback.whatWentWell.map((f, j) => <li key={j} className="text-[10px] text-emerald-800 font-medium">• {f}</li>)}
                            </ul>
                         </div>
                         <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                            <h4 className="text-[10px] font-black text-amber-600 uppercase mb-3">✨ Guidance</h4>
                            <ul className="space-y-2">
                               {q.feedback.areasToImprove.map((f, j) => <li key={j} className="text-[10px] text-amber-800 font-medium">• {f}</li>)}
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
    </div>
  );
};

export default ReportView;
