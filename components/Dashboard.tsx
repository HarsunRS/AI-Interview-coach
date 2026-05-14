import React from 'react';
import { InterviewHistoryItem, UserProfile } from '../types';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, YAxis } from 'recharts';

interface DashboardProps {
  onStart: () => void;
  onAnalyzeResume: () => void;
  onViewReport: (report: any) => void;
  history: InterviewHistoryItem[];
  profile: UserProfile;
  theme: 'light' | 'dark';
}

const Icon: React.FC<{ path: React.ReactNode; className?: string }> = ({ path, className = '' }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const Dashboard: React.FC<DashboardProps> = ({ onStart, onAnalyzeResume, onViewReport, history, profile, theme }) => {
  const chartData = history.slice().reverse().map(h => ({ name: h.date.split(',')[0], score: h.score }));
  const averageScore = history.length ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;
  const bestScore = history.length ? Math.max(...history.map(h => h.score)) : 0;
  const readiness = averageScore >= 85 ? 'Strong' : averageScore >= 70 ? 'Interview Ready' : averageScore >= 50 ? 'Building' : 'Not started';

  const isDark = theme === 'dark';
  const panel = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const softPanel = isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-950';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const stats = [
    { label: 'Sessions', value: history.length, icon: <Icon path={<><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></>} /> },
    { label: 'Average', value: `${averageScore}%`, icon: <Icon path={<><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>} /> },
    { label: 'Best', value: `${bestScore}%`, icon: <Icon path={<><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/><path d="M2 12h20"/></>} /> },
    { label: 'Readiness', value: readiness, icon: <Icon path={<><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-5"/></>} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6 animate-in fade-in duration-500">
      <section className={`${panel} border rounded-2xl p-6 md:p-8 shadow-sm`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed || profile.name || 'User'}`}
              className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200"
              alt="Candidate avatar"
            />
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Interview Dashboard</p>
              <h2 className={`text-2xl md:text-3xl font-black ${textPrimary}`}>Welcome back, {profile.name || 'Candidate'}</h2>
              <p className={`${textSecondary} text-sm font-medium mt-1`}>Practice follows your resume, projects, extracted skills, technical depth, then behavioral questions.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onAnalyzeResume} className="border border-blue-600 text-blue-600 px-6 py-4 rounded-xl font-black hover:bg-blue-600/10 active:scale-95 transition-all text-xs uppercase tracking-widest">
              Analyze Resume
            </button>
            <button onClick={onStart} className="bg-blue-600 text-white px-7 py-4 rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-widest">
              Start New Practice
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className={`${panel} border rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-center justify-between gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">{stat.icon}</div>
              <p className={`text-xl font-black ${textPrimary}`}>{stat.value}</p>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${panel} lg:col-span-2 border rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className={`text-lg font-black ${textPrimary}`}>Recent Interviews</h3>
              <p className="text-xs text-slate-400 font-bold">Review your score trend and report details.</p>
            </div>
            <span className={`${softPanel} border px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest`}>Latest first</span>
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className={`${softPanel} border rounded-2xl p-8 text-center`}>
                <p className="text-sm font-bold text-slate-500">No practice sessions yet. Start one to build your report history.</p>
              </div>
            ) : history.map(item => (
              <div key={item.id} className={`${softPanel} border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`font-black ${textPrimary}`}>{item.date}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.mode}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.roundType}</span>
                  </div>
                  <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-xl font-black ${textPrimary}`}>{item.score}%</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.status}</p>
                  </div>
                  <button
                    onClick={() => item.report && onViewReport(item.report)}
                    disabled={!item.report}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${panel} border rounded-2xl p-6 shadow-sm`}>
            <h3 className={`text-lg font-black ${textPrimary}`}>Extracted Skills</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 mb-5">Used to guide technical questions.</p>
            <div className="flex flex-wrap gap-2">
              {profile.techStack.length ? profile.techStack.slice(0, 12).map(skill => (
                <span key={skill} className="px-3 py-2 rounded-xl bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">{skill}</span>
              )) : (
                <p className="text-xs font-bold text-slate-500">Upload a resume during setup to extract skills automatically.</p>
              )}
            </div>
          </div>

          {profile.jobMatches && profile.jobMatches.length > 0 && (
            <div className={`${panel} border rounded-2xl p-6 shadow-sm`}>
              <h3 className={`text-lg font-black ${textPrimary}`}>Best-Fit Roles</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 mb-5">AI-matched from your resume.</p>
              <div className="space-y-3">
                {profile.jobMatches.slice(0, 4).map((match, i) => (
                  <div key={i} className={`${softPanel} border rounded-xl p-3`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className={`text-xs font-black ${textPrimary}`}>{match.role}</p>
                      <span className={`text-[10px] font-black ${match.matchScore >= 75 ? 'text-emerald-500' : match.matchScore >= 55 ? 'text-amber-500' : 'text-slate-400'}`}>{match.matchScore}%</span>
                    </div>
                    <div className="h-1 bg-slate-200/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${match.matchScore >= 75 ? 'bg-emerald-500' : match.matchScore >= 55 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${match.matchScore}%` }} />
                    </div>
                    {match.missingSkills.length > 0 && (
                      <p className="text-[9px] text-slate-400 font-medium mt-1.5">Missing: {match.missingSkills.slice(0, 3).join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`${panel} border rounded-2xl p-6 shadow-sm min-h-[280px]`}>
            <h3 className={`text-lg font-black ${textPrimary}`}>Score Trend</h3>
            <p className="text-xs text-slate-400 font-bold mb-5">Momentum across sessions.</p>
            {history.length === 0 ? (
              <div className={`${softPanel} border h-44 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-500`}>Chart appears after your first interview.</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
