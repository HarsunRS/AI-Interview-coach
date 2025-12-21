
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message, InterviewMode } from '../types';
import { PERSONAS } from '../constants';
import { interviewService } from '../services/geminiService';

interface ChatInterfaceProps {
  profile: UserProfile;
  onComplete: (history: string, proctoringLogs: string[]) => void;
  theme: 'light' | 'dark';
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ profile, onComplete, theme }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [proctoringLogs, setProctoringLogs] = useState<string[]>([]);
  const [alert, setAlert] = useState<string | null>(null);
  const [timer, setTimer] = useState(profile.timeLimit * 60);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(err => console.warn("Camera failed", err));

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const timestamp = new Date().toLocaleTimeString();
        const msg = `[${timestamp}] Tab Switching Violation Detected.`;
        setProctoringLogs(prev => [...prev, msg]);
        setAlert("Tab switching detected! This violation is logged.");
        setTimeout(() => setAlert(null), 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const start = async () => {
      try {
        const { text, audio } = await interviewService.initInterview(profile);
        setMessages([{ role: 'model', text, timestamp: new Date(), audioData: audio }]);
        if (audio) {
          setIsSpeaking(true);
          await interviewService.playAudio(audio);
          setIsSpeaking(false);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    start();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      interviewService.stopAudio();
    };
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || isFinishing) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: new Date() }]);
    setLoading(true);
    // Stop any current audio if the user starts answering
    interviewService.stopAudio();
    setIsSpeaking(false);
    
    try {
      const { text, audio } = await interviewService.sendMessage(userText);
      setMessages(prev => [...prev, { role: 'model', text, timestamp: new Date(), audioData: audio }]);
      if (audio) {
        setIsSpeaking(true);
        await interviewService.playAudio(audio);
        setIsSpeaking(false);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFinish = () => {
    setIsFinishing(true);
    interviewService.stopAudio();
    setIsSpeaking(false);
    const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
    onComplete(transcript, proctoringLogs);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const roomBg = theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-900';

  return (
    <div className={`flex flex-col h-[85vh] max-w-7xl mx-auto rounded-[3rem] shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-500 relative transition-colors ${roomBg}`}>
      {/* Proctoring Alert Toast */}
      {alert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
             <span className="text-sm font-black uppercase tracking-tight">{alert}</span>
          </div>
        </div>
      )}

      <div className="px-8 py-4 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">IP</div>
          <div>
            <h1 className="text-white font-black text-sm">Interview Pro Room</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live AI Proctoring Active</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-white font-mono">{formatTime(timer)}</span>
          </div>
          <button onClick={handleFinish} className="bg-green-600 text-white px-5 py-1.5 rounded-xl font-bold text-xs hover:bg-green-700 transition-all shadow-lg active:scale-95">End Interview</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Feed & Proctoring */}
        <div className="w-80 border-r border-white/5 bg-slate-900/20 p-6 flex flex-col gap-6">
          <div className="relative aspect-video bg-slate-800 rounded-3xl overflow-hidden border-2 border-blue-600/30">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute top-4 left-4 flex gap-1 items-center bg-black/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">{profile.name || "Candidate"}</span>
            </div>
            {isSpeaking && (
              <div className="absolute bottom-4 right-4 flex gap-0.5 h-3 items-end">
                <div className="w-0.5 bg-blue-500 h-full animate-bounce" />
                <div className="w-0.5 bg-blue-500 h-2/3 animate-bounce [animation-delay:0.1s]" />
                <div className="w-0.5 bg-blue-500 h-1/2 animate-bounce [animation-delay:0.2s]" />
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-800/30 rounded-3xl border border-white/5 p-4 overflow-hidden flex flex-col">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Interviewer Status</h3>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <img src={persona.avatar} className="w-10 h-10 rounded-full border border-white/10" alt="Persona" />
              <div>
                <p className="text-xs font-bold text-white">{persona.name}</p>
                <p className="text-[9px] text-slate-400">{isSpeaking ? 'Asking adaptive followup...' : 'Listening for answer...'}</p>
              </div>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-2 scrollbar-hide">
               <h4 className="text-[9px] font-bold text-slate-600 uppercase">Live Logs</h4>
               {proctoringLogs.length === 0 ? <p className="text-[10px] text-slate-600 italic">No violations detected</p> : 
                 proctoringLogs.map((log, i) => <p key={i} className="text-[10px] text-red-400 font-mono leading-tight">{log}</p>)}
            </div>
          </div>
        </div>

        {/* Center: Chat / Subtitles */}
        <div className="flex-1 flex flex-col bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.3),rgba(15,23,42,1))]">
          <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[75%] p-6 rounded-[2rem] shadow-2xl relative ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                  <p className="text-sm leading-relaxed font-medium">{m.text}</p>
                  <div className="mt-3 flex items-center justify-between opacity-50">
                    <span className="text-[9px] font-black uppercase tracking-widest">{m.role === 'model' ? persona.name : 'You'}</span>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center gap-2 shadow-inner">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-900 border-t border-white/5">
            <form onSubmit={handleSend} className="flex gap-4">
              <input 
                type="text" 
                autoFocus 
                className="flex-1 bg-slate-800/50 text-white border border-white/10 px-6 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm shadow-inner" 
                placeholder="Type your answer here..." 
                value={input} 
                onChange={e => setInput(e.target.value)}
                disabled={loading || isFinishing}
              />
              <button type="submit" disabled={!input.trim() || loading || isFinishing} className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl hover:bg-blue-500 active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
            <div className="flex justify-center gap-8 mt-4">
              <button onClick={() => {}} className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">Repeat Question</button>
              <button onClick={() => {}} className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">Skip Question</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
