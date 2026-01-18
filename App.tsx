
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import SetupForm from './components/SetupForm';
import ChatInterface from './components/ChatInterface';
import ReportView from './components/ReportView';
import { UserProfile, Report, InterviewHistoryItem, UserAccount } from './types';
import { interviewService } from './services/geminiService';
import { INITIAL_USER_PROFILE } from './constants';

type View = 'auth' | 'dashboard' | 'setup' | 'interview' | 'report' | 'loading' | 'error';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('ip_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<View>(currentUser ? 'dashboard' : 'auth');
  const [profile, setProfile] = useState<UserProfile>(currentUser?.profile || INITIAL_USER_PROFILE);
  const [history, setHistory] = useState<InterviewHistoryItem[]>(currentUser?.history || []);
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentUser) {
      const savedUsers: UserAccount[] = JSON.parse(localStorage.getItem('ip_users') || '[]');
      const updatedUsers = savedUsers.map(u => 
        u.email === currentUser.email ? { ...u, profile, history } : u
      );
      const updatedSession = { ...currentUser, profile, history };
      localStorage.setItem('ip_users', JSON.stringify(updatedUsers));
      localStorage.setItem('ip_session', JSON.stringify(updatedSession));
    }
  }, [profile, history, currentUser]);

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setProfile(user.profile);
    setHistory(user.history);
    localStorage.setItem('ip_session', JSON.stringify(user));
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('ip_session');
    setCurrentUser(null);
    setView('auth');
  };

  const handleCompleteInterview = async (transcript: string, logs: string[]) => {
    setView('loading');
    try {
      const result = await interviewService.generateReport(transcript);
      const newHistoryItem: InterviewHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        mode: profile.interviewMode,
        roundType: profile.roundType,
        score: result.overallScore,
        status: result.label,
        report: result
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setReport(result);
      setView('report');
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to finalize evaluation.");
      setView('error');
    }
  };

  return (
    <Layout theme={profile.theme} toggleTheme={() => setProfile(p => ({...p, theme: p.theme === 'light' ? 'dark' : 'light'}))}>
      {view === 'auth' && <Auth onLogin={handleLogin} theme={profile.theme} />}
      {view === 'dashboard' && currentUser && (
        <Dashboard profile={profile} history={history} onStart={() => setView('setup')} onViewReport={(rep) => { setReport(rep); setView('report'); }} theme={profile.theme} />
      )}
      {view === 'setup' && <SetupForm onStart={(p) => { setProfile(p); setView('interview'); }} onCancel={() => setView('dashboard')} theme={profile.theme} />}
      {view === 'interview' && <ChatInterface profile={profile} onComplete={handleCompleteInterview} theme={profile.theme} />}
      {view === 'loading' && (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-8 text-center animate-in fade-in duration-700">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black">Generating Your Performance Audit</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Our AI is evaluating your technical depth and delivery...</p>
          </div>
        </div>
      )}
      {view === 'error' && (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-8 text-center">
          <div className="text-6xl">⚠️</div>
          <h3 className="text-2xl font-black text-red-500">{errorMessage}</h3>
          <button onClick={() => setView('dashboard')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Return to Dashboard</button>
        </div>
      )}
      {view === 'report' && report && <ReportView report={report} onReset={() => setView('dashboard')} theme={profile.theme} />}
    </Layout>
  );
};

export default App;
