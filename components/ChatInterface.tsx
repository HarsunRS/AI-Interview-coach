
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { PERSONAS } from '../constants';
import { interviewService } from '../services/geminiService';

interface ChatInterfaceProps {
  profile: UserProfile;
  onComplete: (history: string, proctoringLogs: string[]) => void;
  theme: 'light' | 'dark';
}

type InterviewState = 'initializing' | 'speaking' | 'listening' | 'thinking' | 'idle' | 'permission_denied';

interface ProctorLog {
  time: string;
  msg: string;
  severity: 'low' | 'med' | 'high';
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ profile, onComplete, theme }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<InterviewState>('initializing');
  const [timer, setTimer] = useState(profile.timeLimit * 60);
  const [showHistory, setShowHistory] = useState(false);
  const [proctorLogs, setProctorLogs] = useState<ProctorLog[]>([]);
  const [trustIndex, setTrustIndex] = useState(100);
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const finishTriggeredRef = useRef(false);
  
  const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];

  // Robust Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (final) {
          setInput(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${final.trim()}` : final.trim();
          });
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onend = () => {
        if (status === 'listening' && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          setStatus('permission_denied');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [status]);

  const toggleMic = async () => {
    // Explicitly request permissions if not granted
    if (status === 'permission_denied' || !recognitionRef.current) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        window.location.reload();
      } catch (e) {
        setStatus('permission_denied');
        return;
      }
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (status === 'listening') {
      recognitionRef.current?.stop();
      setStatus('idle');
      setInterimTranscript('');
    } else {
      setStatus('listening');
      try { 
        recognitionRef.current?.start(); 
      } catch (e) {
        console.error("Mic start failed", e);
        // If it fails because it's already started, we just ignore. 
        // If it fails because of permission, it triggers recognition.onerror.
      }
    }
  };

  const startAudioMonitoring = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 128;
    source.connect(analyserRef.current);
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const update = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      setAudioLevel(sum / dataArray.length);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1 && !finishTriggeredRef.current) {
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerLog = (msg: string, severity: 'low' | 'med' | 'high') => {
    const log: ProctorLog = { time: new Date().toLocaleTimeString(), msg, severity };
    setProctorLogs(prev => [log, ...prev].slice(0, 50));
    if (severity === 'high') setTrustIndex(prev => Math.max(0, prev - 10));
    else if (severity === 'med') setTrustIndex(prev => Math.max(0, prev - 3));
  };

  const handleFinish = () => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    onComplete(messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n'), proctorLogs.map(l => l.msg));
  };

  useEffect(() => {
    // START INTERVIEW IMMEDIATELY
    const initSession = async () => {
      // 1. Hardware Access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        startAudioMonitoring(stream);
      } catch (err) {
        console.error("Hardware denied:", err);
        setStatus('permission_denied');
        triggerLog("HARDWARE ACCESS BLOCKED", "high");
        return;
      }

      // 2. AI Init
      setStatus('thinking');
      try {
        const { text, audio } = await interviewService.initInterview(profile);
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages([{ role: 'model', text, timestamp: new Date(), audioData: audio, timeLabel }]);
        if (audio) { 
          setStatus('speaking'); 
          await interviewService.playAudio(audio); 
        }
        setStatus('idle');
      } catch (err) { 
        setStatus('idle'); 
      }
    };

    initSession();

    return () => {
      interviewService.stopAudio();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status]);

  const handleSendResponse = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalInput = (input + " " + interimTranscript).trim();
    if (!finalInput || status === 'thinking' || status === 'speaking') return;
    
    setInput('');
    setInterimTranscript('');
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: finalInput, timestamp: new Date(), timeLabel }]);
    
    setStatus('thinking');
    interviewService.stopAudio();
    if (status === 'listening') recognitionRef.current?.stop();

    try {
      const { text, audio } = await interviewService.sendMessage(finalInput);
      setMessages(prev => [...prev, { role: 'model', text, timestamp: new Date(), audioData: audio, timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      if (audio) { 
        setStatus('speaking'); 
        await interviewService.playAudio(audio); 
      }
      setStatus('idle');
    } catch (err) { 
      setStatus('idle'); 
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (status === 'permission_denied') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-10 text-center z-[100]">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-6 text-red-500">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>
        </div>
        <h2 className="text-xl font-black mb-4 uppercase tracking-[0.2em]">Bridge connection failed</h2>
        <p className="text-slate-400 max-w-sm font-medium leading-relaxed mb-8 text-sm">
          Simulation requires microphone and camera access to begin. 
          Please enable them in your browser settings to proceed.
        </p>
        <button onClick={() => window.location.reload()} className="bg-white text-black px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">Enable Hardware & Start</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 flex flex-col bg-[#020617] overflow-hidden select-none z-50">
      
      {/* Top Main Section */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Stats Panel */}
        <div className="w-64 bg-black/40 border-r border-white/5 flex flex-col shrink-0 z-10 p-6 space-y-6">
           {/* Integrity Index */}
           <div className="bg-[#1e293b]/40 p-5 rounded-[2rem] border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/30">
                 <span>Integrity Index</span>
                 <span className={trustIndex > 80 ? 'text-emerald-400' : 'text-red-500'}>{trustIndex}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-1000 ${trustIndex > 80 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${trustIndex}%` }}></div>
              </div>
           </div>

           {/* Voice Visualization */}
           <div className="bg-[#1e293b]/40 p-5 rounded-[2rem] border border-white/5 flex flex-col">
              <div className="flex justify-between items-center mb-4 text-[8px] font-black uppercase tracking-widest text-white/30">
                 <span>Voice Activity</span>
                 <span className="text-blue-400 font-mono text-[10px]">{Math.round(audioLevel)}</span>
              </div>
              <div className="flex items-end gap-1 h-8">
                 {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 rounded-full transition-all duration-75"
                      style={{ 
                        height: `${Math.max(15, Math.random() * audioLevel * 3.5)}%`,
                        backgroundColor: audioLevel > 5 ? '#3b82f6' : '#1e293b'
                      }}
                    ></div>
                 ))}
              </div>
           </div>

           {/* Security Logs */}
           <div className="flex-1 min-h-0 bg-black/20 p-5 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden shadow-inner">
              <h3 className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-4">Security Log</h3>
              <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[7.5px] scrollbar-hide">
                 {proctorLogs.map((log, i) => (
                    <div key={i} className={`border-l pl-2 py-0.5 leading-tight ${log.severity === 'high' ? 'border-red-500 text-red-400/80' : 'border-blue-500 text-blue-400/80'}`}>
                       [{log.time}] {log.msg}
                    </div>
                 ))}
                 {proctorLogs.length === 0 && <div className="text-white/5 italic">Monitoring environment...</div>}
              </div>
           </div>

           {/* Timer */}
           <div className="bg-blue-600/10 p-5 rounded-3xl border border-blue-500/20 flex justify-between items-center">
              <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest">Time Remaining</span>
              <span className="font-mono text-sm text-blue-400 font-black tracking-tight">{formatTime(timer)}</span>
           </div>
        </div>

        {/* Center Section: AI Orb & Transcript Subtitles */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none"></div>
           
           {/* Visual Orb */}
           <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center mb-10">
              <div className={`absolute inset-0 rounded-full border border-blue-500/5 transition-all duration-1000 ${status === 'thinking' ? 'animate-pulse scale-110 border-blue-500/20' : 'scale-100'}`}></div>
              <div className={`w-32 h-32 md:w-36 md:h-36 rounded-full bg-[#010411] border-[1px] flex items-center justify-center transition-all duration-700 shadow-[0_0_40px_rgba(0,0,0,0.8)] ${status === 'listening' ? 'border-emerald-500/30' : status === 'speaking' ? 'border-blue-500/30' : 'border-white/5'}`}>
                 <div className="flex items-center gap-1.5 h-10">
                    {[...Array(5)].map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-1 rounded-full transition-all duration-300 ${status === 'speaking' ? 'bg-blue-400' : status === 'listening' ? 'bg-emerald-400' : 'bg-white/5'}`}
                         style={{ 
                           height: status === 'speaking' ? `${40 + Math.random() * 60}%` : status === 'listening' ? `${Math.max(20, audioLevel * 2.5)}%` : '12%',
                           transitionDelay: `${i * 100}ms`
                         }}
                       ></div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Small Font Subtitles Card */}
           <div className="w-full max-w-xl bg-black/40 border border-white/5 p-8 rounded-[2rem] backdrop-blur-3xl text-center shadow-2xl relative z-20">
              <span className="block text-[7.5px] font-black text-white/10 uppercase tracking-[0.5em] mb-4">AI Terminal Communication</span>
              <p className={`text-xs md:text-sm font-bold leading-relaxed tracking-tight min-h-[3rem] flex items-center justify-center transition-all duration-500 ${status === 'idle' ? 'text-white/20 italic' : 'text-white'}`}>
                 {status === 'initializing' ? `Linking with ${persona.name}...` : 
                  status === 'thinking' ? `Processing input...` : 
                  status === 'speaking' ? messages[messages.length - 1]?.text : 
                  status === 'listening' ? ((input + " " + interimTranscript).trim() || "Ready for transmission. Speak now.") : 
                  "Session paused. Waiting for user response."}
              </p>
           </div>
        </div>

        {/* Video Bubble Overlay */}
        <div className="absolute top-6 right-6 w-48 aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl z-20">
           <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-60" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
           <div className="absolute bottom-3 left-4 flex items-center gap-2 bg-black/30 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] text-white/70 font-black uppercase tracking-[0.1em]">{profile.name}</span>
           </div>
        </div>

        {/* Right Sidebar History Overlay */}
        <div className={`absolute top-0 right-0 bottom-0 z-40 bg-[#020617]/98 backdrop-blur-3xl border-l border-white/5 flex flex-col transition-all duration-500 ${showHistory ? 'w-80' : 'w-0 overflow-hidden'}`}>
           <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Encrypted Transcript</h3>
              <button onClick={() => setShowHistory(false)} className="p-1.5 text-white/20 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
           </div>
           <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                 <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] p-3.5 rounded-2xl text-[10.5px] leading-relaxed font-bold border ${m.role === 'user' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}>
                       {m.text}
                    </div>
                    <span className="mt-1.5 text-[7px] font-black text-white/10 uppercase tracking-[0.2em]">{m.timeLabel} • {m.role}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Control Footer */}
      <div className="h-20 bg-black/90 border-t border-white/5 px-6 flex items-center gap-6 z-50 shrink-0">
         <button 
           onClick={toggleMic}
           className={`h-12 px-8 rounded-xl flex items-center gap-4 transition-all active:scale-95 shadow-xl ${status === 'listening' ? 'bg-red-500 text-white shadow-red-500/10' : 'bg-blue-600 text-white shadow-blue-500/10'}`}
         >
            {status === 'listening' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="8" x="8" y="8" rx="1"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            )}
            <span className="text-[9px] font-black uppercase tracking-widest">{status === 'listening' ? 'Stop Transmission' : 'Voice Input'}</span>
         </button>

         <form onSubmit={handleSendResponse} className="flex-1 h-12 flex gap-4">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={status === 'thinking'}
              placeholder={status === 'listening' ? "Voice activity identified..." : "Provide textual response..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-white/5"
            />
            <button 
              type="submit" 
              disabled={!(input.trim() || interimTranscript.trim()) || status === 'thinking'}
              className="h-12 w-12 bg-white text-black rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-5"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
         </form>

         <div className="flex items-center gap-2.5">
            <button onClick={() => setShowHistory(true)} className="h-12 w-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 text-white/20 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button 
              onClick={handleFinish}
              className="h-12 px-6 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg"
            >
               Terminate
            </button>
         </div>
      </div>
    </div>
  );
};

export default ChatInterface;
