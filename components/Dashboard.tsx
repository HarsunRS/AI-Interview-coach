
import React from 'react';
import { InterviewHistoryItem, UserProfile } from '../types';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

interface DashboardProps {
  onStart: () => void;
  onViewReport: (report: any) => void;
  history: InterviewHistoryItem[];
  profile: UserProfile;
  theme: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ onStart, onViewReport, history, profile, theme }) => {
  const chartData = history.slice().reverse().map(h => ({ name: h.date.split(',')[0], score: h.score }));

  const cardBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  const stats = [
    { label: 'Total Interviews', value: history.length, icon: '🎯', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Avg Score', value: history.length ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0, icon: '📈', color: 'bg-green-500/10 text-green-500' },
    { label: 'Last Mock', value: history.length ? history[0].date.split(',')[0] : 'N/A', icon: '📅', color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Status', value: profile.experienceLevel.split(' ')[0], icon: '👤', color: 'bg-orange-500/10 text-orange-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}`} 
              className="relative w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-xl" 
              alt="Avatar" 
            />
          </div>
          <div>
            <h2 className={`text-2xl font-black ${textPrimary}`}>Welcome back, {profile.name} 👋</h2>
            <p className={`${textSecondary} text-sm font-medium`}>Unlock your potential with adaptive AI prep.</p>
          </div>
        </div>
        <button onClick={onStart} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-sm uppercase tracking-widest">
          Start New Practice
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`${cardBg} p-5 rounded-3xl border shadow-sm flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-lg font-black ${textPrimary}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 ${cardBg} p-8 rounded-[2.5rem] border shadow-sm`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className={`text-lg font-black ${textPrimary}`}>Interview History</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/10 px-3 py-1 rounded-full">Recent Sessions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100/10">
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Mode</th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Score</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">No practice sessions found yet. Let's start!</td>
                  </tr>
                ) : history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100/10 last:border-0 group hover:bg-slate-50/5 transition-colors">
                    <td className={`py-5 font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{h.date}</td>
                    <td className={`py-5 font-black ${textPrimary}`}>{h.mode}</td>
                    <td className={`py-5 ${textSecondary} font-medium`}>{h.roundType}</td>
                    <td className={`py-5 font-black ${textPrimary}`}>{h.score}%</td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${
                        h.status === 'Strong' ? 'bg-green-100 text-green-700' : 
                        h.status === 'Interview Ready' ? 'bg-blue-100 text-blue-700' : 
                        h.status === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <button 
                        onClick={() => h.report && onViewReport(h.report)}
                        className={`text-blue-600 font-black text-xs uppercase tracking-widest hover:underline ${h.report ? 'opacity-100' : 'opacity-20 cursor-not-allowed'}`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${cardBg} p-8 rounded-[2.5rem] border shadow-sm flex flex-col`}>
          <h3 className={`text-lg font-black ${textPrimary} mb-1`}>Performance Matrix</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Score momentum</p>
          <div className="flex-1 min-h-[250px]">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Analytics will appear here...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                  />
                  <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-6 p-5 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-500/20">
            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">AI Tip</p>
            <p className="text-[11px] font-medium leading-relaxed">"Your Technical depth is increasing! Focus on communication fluency next to reach 'Strong' status."</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
