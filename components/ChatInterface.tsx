
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
  const [isListening, setIsListening] = useState(false);
  const [timer, setTimer] = useState(profile.timeLimit * 60);
  const [hideHistory, setHideHistory] = useState(false);
  const [proctoringLogs, setProctoringLogs] = useState<string[]>([]);
  const [alert, setAlert] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];

  // Browser STT Engine Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) setInput(prev => prev + ' ' + transcript.trim());
      };

      recognitionRef.current.onerror = (e: any) => {
        console.warn("Recognition Error:", e.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) recognitionRef.current.start();
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Camera Logic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(err => {
      setAlert("Security Alert: Session requires Camera and Microphone access.");
    });

    // Proctoring: Detect Tab Switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const time = new Date().toLocaleTimeString();
        setProctoringLogs(prev => [...prev, `[${time}] Security Violation: Tab switched.`]);
        setAlert("PROCTORING ALERT: Violation detected. Tab switching is strictly prohibited.");
        setTimeout(() => setAlert(null), 6000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const start = async () => {
      try {
        const { text, audio } = await interviewService.initInterview(profile);
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages([{ role: 'model', text, timestamp: new Date(), audioData: audio, timeLabel }]);
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
      recognitionRef.current?.stop();
    };
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || isFinishing) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userText = input;
    setInput('');
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: new Date(), timeLabel }]);
    setLoading(true);
    
    interviewService.stopAudio();
    setIsSpeaking(false);
    
    try {
      const { text, audio } = await interviewService.sendMessage(userText);
      const resTimeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { role: 'model', text, timestamp: new Date(), audioData: audio, timeLabel: resTimeLabel }]);
      if (audio) {
        setIsSpeaking(true);
        await interviewService.playAudio(audio);
        setIsSpeaking(false);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[90vh] bg-[#0d1117] rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.4)] relative border border-white/5 animate-in zoom-in-95 duration-700">
      {/* Violation Alert Layer */}
      {alert && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
           <div className="bg-red-600 text-white px-10 py-4 rounded-[1.5rem] shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-4">
              <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
              {alert}
           </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="px-12 py-7 bg-[#161b22]/90 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 bg-red-600/10 px-5 py-2.5 rounded-2xl border border-red-500/20">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-white tracking-widest">Live Proctoring</span>
          </div>
          <div className="text-white font-mono text-xs font-black bg-blue-600/10 px-5 py-2.5 rounded-2xl border border-blue-600/20 shadow-inner">
            {formatTime(timer)} / {profile.timeLimit}:00
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{profile.targetCompany || 'General Assessment'}</p>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{persona.role} Round</p>
           </div>
           <button onClick={() => onComplete(messages.map(m => `${m.role}: ${m.text}`).join('\n\n'), proctoringLogs)} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-red-600/20">Finish Session</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Security Sidebar */}
        <div className="w-80 bg-[#0d1117] border-r border-white/5 p-8 flex flex-col gap-8">
           <div className="bg-[#161b22] p-6 rounded-[2.5rem] border border-white/10 shadow-inner">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5">AI Interviewer</h3>
              <div className="flex items-center gap-5">
                 <img src={persona.avatar} className="w-14 h-14 rounded-full border-2 border-blue-500/20 p-1 bg-slate-800" alt="Persona" />
                 <div>
                    <p className="text-sm font-black text-white">{persona.name}</p>
                    <p className={`text-[10px] font-black uppercase tracking-tighter ${isSpeaking ? 'text-blue-500 animate-pulse' : 'text-slate-500'}`}>
                      {isSpeaking ? 'Analyzing...' : 'Ready'}
                    </p>
                 </div>
              </div>
           </div>
           <div className="flex-1 bg-[#161b22]/50 p-6 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Security Log</h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                 {proctoringLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                       <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                       <p className="text-[9px] font-black uppercase tracking-widest">Environment Secure</p>
                    </div>
                 ) : (
                    proctoringLogs.map((log, i) => (
                       <p key={i} className="text-[9px] font-mono text-red-400/70 border-l-2 border-red-500/20 pl-3 leading-relaxed animate-in fade-in slide-in-from-left-2">{log}</p>
                    ))
                 )}
              </div>
           </div>
        </div>

        {/* Center: AI Session Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04),transparent_70%)]"></div>
          
          <div className="relative w-96 h-96 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full bg-blue-600/5 animate-ping duration-[3500ms] ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`w-48 h-48 rounded-full bg-[#161b22] border-4 border-[#30363d] flex items-center justify-center gap-4 shadow-2xl transition-all duration-500 ${isListening ? 'border-emerald-500/40 shadow-emerald-500/10' : ''}`}>
               <span className={`w-3 h-3 bg-blue-400 rounded-full transition-all duration-300 ${isSpeaking ? 'scale-150 animate-bounce' : 'scale-100'}`}></span>
               <span className={`w-3 h-3 bg-emerald-400 rounded-full transition-all duration-500 delay-75 ${isListening ? 'scale-150 animate-pulse shadow-xl shadow-emerald-400' : 'scale-100'}`}></span>
               <span className={`w-3 h-3 bg-blue-400 rounded-full transition-all duration-300 delay-150 ${isSpeaking ? 'scale-150 animate-bounce' : 'scale-100'}`}></span>
            </div>
          </div>

          <div className="mt-20 w-full max-w-2xl text-center">
             <div className="bg-[#161b22]/90 border border-white/5 px-12 py-10 rounded-[3.5rem] shadow-2xl backdrop-blur-3xl border-t-white/10">
               <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Transcript Subtitles</p>
               <p className={`text-base leading-relaxed font-bold transition-all duration-500 ${isSpeaking || isListening ? 'text-white' : 'text-white/30'}`}>
                 {isSpeaking ? (messages[messages.length-1]?.text || '...') : isListening ? (input || 'Listening to your response...') : 'Waiting for your next answer...'}
               </p>
             </div>
          </div>
        </div>

        {/* Right: Interaction Feed Sidebar */}
        <div className={`transition-all duration-700 bg-[#0d1117]/95 backdrop-blur-3xl border-l border-white/5 flex flex-col ${hideHistory ? 'w-0' : 'w-[500px]'}`}>
           <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white text-xs font-black uppercase tracking-widest">Conversation</h3>
              <button onClick={() => setHideHistory(!hideHistory)} className="p-2 text-white/40 hover:text-white transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
           </div>
           <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-12 scrollbar-hide scroll-smooth">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4`}>
                  <div className={`max-w-[90%] p-7 rounded-[2.5rem] relative shadow-2xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#161b22] text-white/90 border border-white/5 rounded-tl-none'}`}>
                    <p className="text-[14px] leading-relaxed font-bold">{m.text}</p>
                  </div>
                  <span className="mt-4 text-[10px] font-black text-white/20 uppercase tracking-widest px-2">{m.timeLabel} • {m.role === 'user' ? 'Candidate' : 'AI'}</span>
                </div>
              ))}
              {loading && (
                 <div className="flex gap-2 p-5 bg-white/5 rounded-full w-fit animate-pulse">
                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                   <div className="w-2 h-2 bg-blue-500 rounded-full delay-150"></div>
                 </div>
              )}
           </div>
        </div>

        {/* Floating User Preview */}
        <div className="absolute top-36 right-16 w-80 aspect-video bg-[#161b22] rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-20 hover:scale-105 transition-all duration-500">
           <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
           <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/50 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]"></div>
              <span className="text-[11px] text-white font-black uppercase tracking-widest">{profile.name} (Online)</span>
           </div>
        </div>
      </div>

      {/* Primary Interaction Bar */}
      <div className="p-12 bg-[#161b22] border-t border-white/5 flex items-center gap-10 z-10 shadow-[0_-30px_60px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-4">
           <button 
             onClick={toggleListening} 
             className={`p-6 rounded-[2rem] transition-all active:scale-95 shadow-2xl border-2 flex items-center gap-4 group ${isListening ? 'bg-red-500 border-red-400 text-white shadow-red-500/20' : 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'}`}
           >
              {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              )}
              <span className="text-[11px] font-black uppercase tracking-widest">{isListening ? 'Stop Mic' : 'Start Mic'}</span>
           </button>
        </div>

        <form onSubmit={handleSend} className="flex-1 flex gap-6">
           <input 
             type="text" 
             autoFocus
             className="flex-1 bg-black/60 border border-white/5 rounded-[2rem] px-10 py-7 text-white text-lg font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all shadow-inner placeholder:text-white/20"
             placeholder={isListening ? "Listening to your response..." : "Type or speak your answer..."}
             value={input}
             onChange={e => setInput(e.target.value)}
             disabled={loading || isFinishing}
           />
           <button type="submit" disabled={!input.trim() || loading || isFinishing} className="bg-blue-600 text-white px-12 rounded-[2rem] hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_40px_rgba(37,99,235,0.4)] disabled:opacity-10 group">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
           </button>
        </form>
        
        <div className="flex items-center gap-6">
           <button onClick={() => {}} className="flex items-center gap-4 px-10 py-6 rounded-[2rem] bg-white/5 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              <span className="text-[13px] font-black uppercase tracking-widest">Repeat</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
