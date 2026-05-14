
import React, { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, theme, toggleTheme }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem('ip_gemini_key') || '');
  }, [showSettings]);

  const saveKey = () => {
    const trimmed = apiKey.trim();
    if (trimmed) localStorage.setItem('ip_gemini_key', trimmed);
    else localStorage.removeItem('ip_gemini_key');
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowSettings(false); }, 1200);
  };

  const isDark = theme === 'dark';
  const modalBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 border-b shrink-0 z-[100] transition-colors duration-300 h-16 ${isDark ? 'bg-[#020617]/80 backdrop-blur-md border-white/5' : 'bg-white/80 backdrop-blur-md border-slate-200'}`}>
        <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-black text-xs">AI</span>
            </div>
            <h1 className="text-lg font-black tracking-tighter">Interview Pro</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings / API key */}
            <button
              onClick={() => setShowSettings(true)}
              title="API Key Settings"
              className={`p-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07m14.14 0A10 10 0 0 0 4.93 4.93"/>
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
              title="Toggle Theme"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* API Key Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-5 ${modalBg}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Gemini API Key</h2>
                <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your key from{' '}
                  <span className="text-blue-500">aistudio.google.com/apikey</span>
                  . Stored locally only — never sent anywhere.
                </p>
              </div>
              <button onClick={() => setShowSettings(false)} className={`shrink-0 p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder="AIzaSy..."
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono outline-none focus:ring-2 focus:ring-blue-600/30 transition-all ${inputCls}`}
            />

            <div className={`rounded-xl border p-3 text-[10px] font-medium leading-relaxed ${isDark ? 'bg-blue-950/30 border-blue-800/40 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
              <strong className="font-black">Free tier:</strong> The Gemini API free tier supports{' '}
              15 req/min and 1 500 req/day on gemini-2.5-flash.{' '}
              If you hit quota, the app automatically falls back to a local Ollama model if you have one running.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { localStorage.removeItem('ip_gemini_key'); setApiKey(''); }}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-black transition-all ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Clear Key
              </button>
              <button
                onClick={saveKey}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {saved ? 'Saved!' : 'Save Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 relative bg-inherit">
        {children}
      </main>
    </div>
  );
};

export default Layout;
