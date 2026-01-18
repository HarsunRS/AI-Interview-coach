
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
      <div className="flex justify-between items-center mb-10">
         <div>
            <h1 className={`text-4xl font-black ${textPrimary} mb-2`}>Interview Performance Report</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Full Mock Interview • Mixed Round</p>
         </div>
         <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-xs font-black hover:bg-slate-50 transition-all">
              <span className="text-lg">📥</span> Download PDF
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-xs font-black hover:bg-slate-50 transition-all">
              <span className="text-lg">🔗</span> Share
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Score Summary */}
        <div className={`${cardBg} rounded-[2.5rem] p-10 shadow-xl border flex flex-col items-center justify-center text-center`}>
           <div className="relative mb-8">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth="12" fill="transparent" />
                <circle cx="96" cy="96" r="80" stroke="#3b82f6" strokeWidth="12" fill="transparent" strokeDasharray={502} strokeDashoffset={502 - (502 * report.overallScore) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className={`text-6xl font-black ${textPrimary}`}>{report.overallScore}</span>
                 <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">/ 100</span>
              </div>
           </div>
           <div className="mb-8">
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">{report.label}</span>
           </div>
           <p className={`text-sm ${textSecondary} leading-relaxed font-medium px-4`}>
             "{report.summary}"
           </p>
           <div className="mt-8 pt-8 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-emerald-500 font-black text-xs uppercase">
              <span className="text-lg">📈</span> +8 points from last mock
           </div>
        </div>

        {/* Right Details Grid */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`${cardBg} rounded-[2.5rem] p-10 shadow-xl border`}>
             <h3 className="text-sm font-black uppercase text-slate-400 mb-8 tracking-widest">Interview Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">👤</div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Candidate</p>
                      <p className="text-sm font-black">Rohit Sharma</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">💼</div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Role</p>
                      <p className="text-sm font-black">Software Development Engineer</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl">⏱️</div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Duration</p>
                      <p className="text-sm font-black">{report.duration}</p>
                   </div>
                </div>
             </div>
             <div className="mt-10 flex flex-wrap gap-2">
                {['Java', 'Python', 'React', 'System Design', 'SQL'].map(tag => (
                  <span key={tag} className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">{tag}</span>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {[
               { label: 'Technical Accuracy', val: report.metrics.technicalAccuracy + '%', color: 'bg-blue-600', icon: '💻' },
               { label: 'Communication', val: report.metrics.communication + '%', color: 'bg-emerald-500', icon: '💬' },
               { label: 'Problem Solving', val: report.metrics.problemSolving + '%', color: 'bg-indigo-500', icon: '🧠' },
               { label: 'Confidence', val: report.metrics.confidence + '%', color: 'bg-amber-500', icon: '✨' },
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
        </div>
      </div>

      {/* Video & Behavioral Analysis */}
      <div className={`${cardBg} rounded-[2.5rem] p-10 shadow-xl border`}>
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-lg font-black flex items-center gap-3">
             <span className="text-2xl">📹</span> Video & Behavioral Analysis
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Analyzed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-10">
             <div className="bg-slate-50/50 p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-black text-slate-400 uppercase">Overall Visual Presence</p>
                   <p className="text-2xl font-black text-blue-600">{report.behavioralAnalysis.score}/100</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">Professional appearance with room for improvement</p>
             </div>
             <div className="grid grid-cols-1 gap-8">
               {[
                 { label: 'Eye Contact', val: report.behavioralAnalysis.eyeContact.score, sub: `${report.behavioralAnalysis.eyeContact.percentage} of time`, icon: '👁️' },
                 { label: 'Body Language', val: report.behavioralAnalysis.bodyLanguage.score, sub: report.behavioralAnalysis.bodyLanguage.posture, icon: '👤' },
                 { label: 'Facial Expression', val: report.behavioralAnalysis.facialExpression.score, sub: report.behavioralAnalysis.facialExpression.engagement, icon: '😊' },
               ].map((b, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <span className="text-xl">{b.icon}</span>
                          <div>
                            <p className="text-xs font-black">{b.label}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{b.sub}</p>
                          </div>
                       </div>
                       <span className="text-sm font-black">{b.val}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600" style={{ width: `${b.val}%` }}></div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             {[
               { title: 'Eye Contact Tips', desc: 'Maintain eye contact for 4-5 seconds at a time. You looked away frequently during technical explanations.' },
               { title: 'Body Language Tips', desc: 'Reduce fidgeting with pen. Use hand gestures purposefully to emphasize key points.' },
               { title: 'Expression Tips', desc: 'Great natural smile! Relax facial muscles during pauses to appear more confident.' },
               { title: 'Energy Management', desc: 'Energy dropped during complex questions. Practice maintaining enthusiasm throughout.' }
             ].map((t, i) => (
               <div key={i} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-blue-600">{t.title}</h4>
                  <p className="text-[10px] leading-relaxed text-slate-600 font-medium">{t.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Detailed Question Analysis */}
      <div className={`${cardBg} rounded-[2.5rem] shadow-xl border overflow-hidden`}>
        <div className="p-10 border-b border-slate-100">
           <h3 className="text-lg font-black mb-2">Detailed Question Analysis</h3>
           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">In-depth review of each question and response</p>
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
                         <span>{q.duration}</span>
                         <span>Score: {q.correctness}%</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${q.difficulty === 'Hard' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>{q.difficulty}</span>
                   <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase">{q.type}</span>
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${q.tag === 'Excellent' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{q.tag}</span>
                   <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedQuestion === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              
              {expandedQuestion === i && (
                <div className="p-10 pt-0 bg-slate-50/20 animate-in slide-in-from-top-2">
                   <div className="space-y-8 mt-4">
                      <div className="space-y-2">
                         <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase">
                            <span>Answer Quality</span>
                            <span>{q.correctness}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600" style={{ width: `${q.correctness}%` }}></div>
                         </div>
                      </div>
                      
                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Your Answer</p>
                         <p className="p-5 bg-white border border-slate-200 rounded-2xl text-xs leading-relaxed font-medium">"{q.userAnswer}"</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                         <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-3 flex items-center gap-2">✅ What Went Well</h4>
                            <ul className="space-y-2">
                               {q.feedback.whatWentWell.map((f, j) => <li key={j} className="text-[10px] text-emerald-800 font-medium">• {f}</li>)}
                            </ul>
                         </div>
                         <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                            <h4 className="text-[10px] font-black text-amber-600 uppercase mb-3 flex items-center gap-2">✨ Areas to Improve</h4>
                            <ul className="space-y-2">
                               {q.feedback.areasToImprove.map((f, j) => <li key={j} className="text-[10px] text-amber-800 font-medium">• {f}</li>)}
                            </ul>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Ideal Answer</p>
                         <p className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-xs leading-relaxed font-medium italic text-emerald-900">{q.idealAnswer}</p>
                      </div>

                      <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                         <h4 className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2">
                           <span className="text-sm">✨</span> AI Interviewer Notes
                         </h4>
                         <p className="text-[11px] leading-relaxed text-blue-900 font-medium">{q.interviewerNotes}</p>
                      </div>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Personalized Improvement Roadmap */}
      <div className={`${cardBg} rounded-[2.5rem] p-10 shadow-xl border`}>
        <div className="flex items-center gap-4 mb-10">
           <span className="text-3xl">🎯</span>
           <div>
              <h3 className="text-lg font-black">Personalized Improvement Roadmap</h3>
              <p className="text-xs text-slate-500 font-bold uppercase">Tailored action plan based on your mock session</p>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
           <div className="space-y-6">
              <h4 className="text-xs font-black text-blue-600 uppercase flex items-center gap-2">
                 <span className="text-lg">💻</span> Technical Improvements
              </h4>
              <ul className="space-y-4">
                 {report.roadmap.technical.map((item, i) => (
                   <li key={i} className="flex gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                      <span className="text-blue-500">↗</span> {item}
                   </li>
                 ))}
              </ul>
           </div>
           <div className="space-y-6">
              <h4 className="text-xs font-black text-emerald-600 uppercase flex items-center gap-2">
                 <span className="text-lg">💬</span> Communication Improvements
              </h4>
              <ul className="space-y-4">
                 {report.roadmap.communication.map((item, i) => (
                   <li key={i} className="flex gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                      <span className="text-emerald-500">↗</span> {item}
                   </li>
                 ))}
              </ul>
           </div>
        </div>
        
        <button onClick={onReset} className="w-full mt-12 py-5 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all">
           Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ReportView;
