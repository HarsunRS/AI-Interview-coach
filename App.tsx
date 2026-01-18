
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

type View = 'auth' | 'dashboard' | 'setup' | 'interview' | 'report' | 'loading';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('ip_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<View>(currentUser ? 'dashboard' : 'auth');
  const [profile, setProfile] = useState<UserProfile>(currentUser?.profile || INITIAL_USER_PROFILE);
  const [history, setHistory] = useState<InterviewHistoryItem[]>(currentUser?.history || []);
  const [report, setReport] = useState<Report | null>(null);

  // Sync state to local storage whenever profile or history changes
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

  const toggleTheme = () => {
    const newTheme: 'light' | 'dark' = profile.theme === 'light' ? 'dark' : 'light';
    setProfile(prev => ({ ...prev, theme: newTheme }));
  };

  const handleStartSetup = () => setView('setup');
  
  const handleConfirmProfile = (selectedProfile: UserProfile) => {
    setProfile(selectedProfile);
    setView('interview');
  };

  const handleCompleteInterview = async (transcript: string, logs: string[]) => {
    setView('loading');
    try {
      const fullContext = `Proctoring Logs: ${logs.join(' | ')} \n\n Transcript: ${transcript}`;
      const result = await interviewService.generateReport(fullContext);
      
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
    } catch (error) {
      console.error("Evaluation Error:", error);
      setView('dashboard');
    }
  };

  return (
    <Layout theme={profile.theme} toggleTheme={toggleTheme}>
      {view === 'auth' && <Auth onLogin={handleLogin} theme={profile.theme} />}
      {view === 'dashboard' && currentUser && (
        <div className="space-y-4">
          <div className="flex justify-end">
             <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors p-4">Sign Out</button>
          </div>
          <Dashboard profile={profile} history={history} onStart={handleStartSetup} onViewReport={(rep) => { setReport(rep); setView('report'); }} theme={profile.theme} />
        </div>
      )}
      {view === 'setup' && <SetupForm onStart={handleConfirmProfile} onCancel={() => setView('dashboard')} theme={profile.theme} />}
      {view === 'interview' && <ChatInterface profile={profile} onComplete={handleCompleteInterview} theme={profile.theme} />}
      {view === 'loading' && (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 text-center animate-in fade-in zoom-in-95">
          <div className="relative">
            <div className="w-24 h-24 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-2xl"></div>
            <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-xs uppercase tracking-tighter">AI Lab</div>
          </div>
          <div className="space-y-3">
            <h3 className={`text-3xl font-black tracking-tight ${profile.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Evaluating Your Session...</h3>
            <p className="text-slate-500 max-w-sm font-bold leading-relaxed uppercase tracking-tighter text-[10px]">Processing transcript, behavioral markers, and technical accuracy to build your roadmap.</p>
          </div>
        </div>
      )}
      {view === 'report' && report && <ReportView report={report} onReset={() => setView('dashboard')} theme={profile.theme} />}
    </Layout>
  );
};

export default App;
