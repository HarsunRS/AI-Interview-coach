
import React from 'react';
import { Report } from '../types';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface ReportViewProps {
  report: Report;
  onReset: () => void;
  theme: 'light' | 'dark';
}

const ReportView: React.FC<ReportViewProps> = ({ report, onReset, theme }) => {
  const radarData = report.skillScores.map(s => ({ subject: s.name, A: s.score }));
  
  const communicationData = [
    { name: 'Fluency', value: report.communication.fluency },
    { name: 'Clarity', value: report.communication.clarity },
    { name: 'Grammar', value: report.communication.grammarScore },
    { name: 'Speech', value: report.communication.pronunciationScore },
  ];

  const cardBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-700">
      {/* Header Summary */}
      <div className={`${cardBg} rounded-[3rem] p-10 shadow-2xl border grid grid-cols-1 md:grid-cols-3 gap-10`}>
        <div className="flex flex-col items-center justify-center text-center space-y-4 md:border-r border-slate-100/10 pr-0 md:pr-10">
          <div className="relative">
             <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} strokeWidth="10" fill="transparent" />
                <circle cx="64" cy="64" r="58" stroke="#3b82f6" strokeWidth="10" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * report.overallScore) / 100} />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className={`text-3xl font-black ${textPrimary}`}>{report.overallScore}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Global</span>
             </div>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest shadow-sm">
              {report.label}
            </span>
            <p className={`mt-4 text-xs ${textSecondary} leading-relaxed font-medium px-4`}>"{report.summary}"</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'Fluency', val: report.communication.fluency + '%', color: 'text-blue-500' },
               { label: 'Clarity', val: report.communication.clarity + '%', color: 'text-purple-500' },
               { label: 'Speech', val: report.communication.pronunciationScore + '%', color: 'text-green-500' },
               { label: 'Fillers', val: report.communication.fillerWordsCount, color: 'text-red-500' },
             ].map((s, i) => (
               <div key={i} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                 <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
               </div>
             ))}
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-900'} rounded-[2rem] p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-xl`}>
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-black mb-1">Adaptive Skill Analysis</h3>
              <p className="text-xs text-slate-400 max-w-xs">Domain competence mapped across the AI difficulty escalation.</p>
            </div>
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={theme === 'dark' ? '#334155' : '#475569'} />
                  <Radar name="Skills" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className={`${cardBg} p-8 rounded-[2rem] border shadow-sm`}>
              <h3 className={`${textPrimary} font-black mb-4 flex items-center gap-2`}>
                <span className="text-xl">🎙️</span> Pronunciation Feedback
              </h3>
              <p className={`text-xs ${textSecondary} leading-relaxed italic border-l-4 border-blue-500 pl-4 bg-blue-50/5 py-3 rounded-r-xl`}>
                {report.communication.pronunciationFeedback}
              </p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/20">
                <h3 className="text-emerald-500 font-black mb-4 text-sm">✅ Strengths</h3>
                <div className="space-y-2">
                  {report.strengths.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-[11px] font-bold text-emerald-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {s}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-red-500/5 p-6 rounded-[2rem] border border-red-500/20">
                <h3 className="text-red-500 font-black mb-4 text-sm">⚠️ Weaknesses</h3>
                <div className="space-y-2">
                  {report.weaknesses.slice(0, 3).map((w, i) => (
                    <div key={i} className="text-[11px] font-bold text-red-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {w}
                    </div>
                  ))}
                </div>
              </div>
           </div>
           
           <div className={`${cardBg} p-8 rounded-[2rem] border shadow-sm`}>
              <h3 className={`${textPrimary} font-black mb-6 flex items-center gap-2`}>
                <span className="text-xl">📊</span> Comm Metrics
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={communicationData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {communicationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className={`${cardBg} p-8 rounded-[3rem] shadow-xl border flex flex-col`}>
           <h3 className={`text-xl font-black ${textPrimary} mb-6 flex items-center gap-2`}>🚀 Learning Roadmap</h3>
           <div className="space-y-4 flex-1">
              {report.improvementPlan.map((step, i) => (
                <div key={i} className={`flex gap-4 p-4 rounded-2xl transition-all border border-transparent ${theme === 'dark' ? 'hover:bg-slate-800/50 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-100'}`}>
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm shadow-lg shadow-black/20">{i+1}</div>
                  <p className={`text-xs ${textSecondary} font-medium leading-relaxed`}>{step}</p>
                </div>
              ))}
           </div>
           
           {report.proctoringLogs.length > 0 && (
             <div className="mt-8 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl">
               <h4 className="text-[10px] font-black text-red-600 uppercase mb-2">Proctoring Violations Detected</h4>
               <div className="space-y-1">
                 {report.proctoringLogs.map((log, i) => (
                   <p key={i} className="text-[10px] text-red-400 font-mono">{log}</p>
                 ))}
               </div>
             </div>
           )}

           <button onClick={onReset} className="w-full mt-8 py-4 bg-blue-600 text-white font-black rounded-[2rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">
             Back to Dashboard
           </button>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
