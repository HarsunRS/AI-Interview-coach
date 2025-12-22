
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

  const syncUserData = (updatedProfile: UserProfile, updatedHistory: InterviewHistoryItem[]) => {
    if (!currentUser) return;
    
    const savedUsers: UserAccount[] = JSON.parse(localStorage.getItem('ip_users') || '[]');
    const updatedUsers = savedUsers.map(u => {
      if (u.email === currentUser.email) {
        return { ...u, profile: updatedProfile, history: updatedHistory };
      }
      return u;
    });
    
    const updatedSession = { ...currentUser, profile: updatedProfile, history: updatedHistory };
    
    localStorage.setItem('ip_users', JSON.stringify(updatedUsers));
    localStorage.setItem('ip_session', JSON.stringify(updatedSession));
    
    setCurrentUser(updatedSession);
    setProfile(updatedProfile);
    setHistory(updatedHistory);
  };

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setProfile(user.profile);
    setHistory(user.history);
    localStorage.setItem('ip_session', JSON.stringify(user));
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ip_session');
    setView('auth');
  };

  const toggleTheme = () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    const newProfile = { ...profile, theme: newTheme };
    if (currentUser) {
      syncUserData(newProfile, history);
    } else {
      setProfile(newProfile);
    }
  };

  const handleStartSetup = () => setView('setup');
  
  const handleConfirmProfile = (selectedProfile: UserProfile) => {
    syncUserData(selectedProfile, history);
    setView('interview');
  };

  const handleCompleteInterview = async (transcript: string, logs: string[]) => {
    setView('loading');
    try {
      const result = await interviewService.generateReport(transcript);
      result.proctoringLogs = logs;
      
      const newHistoryItem: InterviewHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        mode: profile.interviewMode,
        roundType: profile.roundType,
        score: result.overallScore,
        status: result.label,
        report: result
      };

      const updatedHistory = [newHistoryItem, ...history];
      syncUserData(profile, updatedHistory);
      setReport(result);
      setView('report');
    } catch (error) {
      console.error("Evaluation error:", error);
      setView('dashboard');
    }
  };

  const handleReset = () => {
    setReport(null);
    setView('dashboard');
  };

  return (
    <Layout theme={profile.theme} toggleTheme={toggleTheme}>
      {view === 'auth' && <Auth onLogin={handleLogin} theme={profile.theme} />}

      {view === 'dashboard' && currentUser && (
        <div className="space-y-4">
          <div className="flex justify-end">
             <button 
              onClick={handleLogout}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors px-2 py-4"
            >
              Log Out Session
            </button>
          </div>
          <Dashboard 
            profile={profile} 
            history={history} 
            onStart={handleStartSetup} 
            onViewReport={(rep) => { setReport(rep); setView('report'); }}
            theme={profile.theme}
          />
        </div>
      )}
      
      {view === 'setup' && (
        <SetupForm 
          onStart={handleConfirmProfile} 
          onCancel={() => setView('dashboard')} 
          theme={profile.theme}
        />
      )}
      
      {view === 'interview' && (
        <ChatInterface 
          profile={profile} 
          onComplete={handleCompleteInterview} 
          theme={profile.theme}
        />
      )}

      {view === 'loading' && (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 text-center animate-in fade-in zoom-in-95">
          <div className="relative">
            <div className="w-24 h-24 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-2xl"></div>
            <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-xs">AI</div>
          </div>
          <div className="space-y-3">
            <h3 className={`text-3xl font-black tracking-tight ${profile.theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Finalizing Evaluation...</h3>
            <p className="text-slate-500 max-w-sm font-medium">Matching your responses against the JD & Resume data to build your success roadmap.</p>
          </div>
        </div>
      )}

      {view === 'report' && report && (
        <ReportView 
          report={report} 
          onReset={handleReset} 
          theme={profile.theme}
        />
      )}
    </Layout>
  );
};

export default App;
