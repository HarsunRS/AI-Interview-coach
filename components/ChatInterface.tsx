
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
  const isListeningRef = useRef(false);
  const initRef = useRef(false);
  
  const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];

  // Initialize Speech Recognition
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
          setInput(prev => (prev.trim() ? `${prev.trim()} ${final.trim()}` : final.trim()));
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try { recognition.start(); } catch (e) {
            console.error("Auto-restart failed", e);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setStatus('permission_denied');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  const toggleMic = async () => {
    if (status === 'permission_denied') {
      const granted = await requestHardware();
      if (!granted) return;
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (status === 'listening') {
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch(e) {}
      setStatus('idle');
      setInterimTranscript('');
    } else {
      setStatus('listening');
      isListeningRef.current = true;
      try { 
        recognitionRef.current?.start(); 
      } catch (e) {
        // Recognition might already be running
      }
    }
  };

  const startAudioMonitoring = (stream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.smoothingTimeConstant = 0.5;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = Math.min(100, (sum / dataArray.length) * 4);
        setAudioLevel(level);
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (e) {
      console.error("Visualizer failed", e);
    }
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

  const requestHardware = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      startAudioMonitoring(stream);
      return true;
    } catch (err) {
      console.error("Hardware denied:", err);
      setStatus('permission_denied');
      return false;
    }
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const startSession = async () => {
      await requestHardware();

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

    startSession();

    return () => {
      interviewService.stopAudio();
      isListeningRef.current = false;
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
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch(e) {}

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

  const getSubtitles = () => {
    // Find last message from AI to display when idle
    const lastModelMessage = [...messages].reverse().find(m => m.role === 'model')?.text;

    if (status === 'initializing') return `Establishing secure uplink with ${persona.name}...`;
    if (status === 'thinking') return `Analyzing transmission buffer...`;
    if (status === 'speaking') return messages[messages.length - 1]?.text;
    if (status === 'listening') return ((input + " " + interimTranscript).trim() || "Ready. Waiting for your voice input...");
    return lastModelMessage || "Neural link established. Waiting for initiation.";
  };

  if (status === 'permission_denied') {
    return (
      <div className="fixed inset-0 top-16 flex flex-col items-center justify-center bg-[#020617] text-white p-10 text-center z-[200]">
        <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mb-10 border border-red-500/20 text-red-500 shadow-2xl animate-pulse">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="m12 14-4-4"/><path d="M12 14V4"/><path d="M5 20h14"/></svg>
        </div>
        <h2 className="text-2xl font-black mb-6 uppercase tracking-[0.4em]">Bridge Link Failed</h2>
        <p className="text-slate-400 max-w-md font-medium leading-relaxed mb-12 text-sm">
          Simulation requires active microphone and camera streams. Please enable browser permissions to proceed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => window.location.reload()} className="bg-white text-black px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">Retry Connection</button>
          <button onClick={() => setStatus('idle')} className="bg-slate-800 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl border border-white/10">Continue Offline (Text Only)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 flex flex-col bg-[#020617] overflow-hidden select-none z-[100]">
      
      {/* Simulation Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Telemetry Deck */}
        <div className="w-64 bg-black/50 border-r border-white/5 flex flex-col shrink-0 z-10 p-6 space-y-6">
           <div className="bg-[#1e293b]/40 p-5 rounded-[2.5rem] border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/30">
                 <span>Integrity Index</span>
                 <span className={trustIndex > 80 ? 'text-emerald-400' : 'text-red-500'}>{trustIndex}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-1000 ${trustIndex > 80 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} style={{ width: `${trustIndex}%` }}></div>
              </div>
           </div>

           <div className="bg-[#1e293b]/40 p-5 rounded-[2.5rem] border border-white/5">
              <div className="flex justify-between items-center mb-4 text-[8px] font-black uppercase tracking-widest text-white/30">
                 <span>Voice Intensity</span>
                 <span className="text-blue-400 font-mono text-[10px]">{Math.round(audioLevel)}</span>
              </div>
              <div className="flex items-end gap-1.5 h-10 px-1">
                 {[...Array(14)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 rounded-full transition-all duration-75"
                      style={{ 
                        height: `${Math.max(15, (audioLevel + Math.random() * 8) * 4)}%`,
                        backgroundColor: audioLevel > 5 ? (i % 2 === 0 ? '#3b82f6' : '#60a5fa') : '#1e293b'
                      }}
                    ></div>
                 ))}
              </div>
           </div>

           <div className="flex-1 min-h-0 bg-black/20 p-5 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden shadow-inner">
              <h3 className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-4">Neural Audit Log</h3>
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[7.5px] scrollbar-hide">
                 {proctorLogs.map((log, i) => (
                    <div key={i} className={`border-l-2 pl-2 py-0.5 leading-tight ${log.severity === 'high' ? 'border-red-500 text-red-400/70' : 'border-blue-500 text-blue-400/70'}`}>
                       [{log.time}] {log.msg}
                    </div>
                 ))}
                 {proctorLogs.length === 0 && <div className="text-white/5 italic">Monitoring uplink...</div>}
              </div>
           </div>

           <div className="bg-blue-600/5 p-5 rounded-[2rem] border border-blue-500/10 flex justify-between items-center">
              <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest">Time Remaining</span>
              <span className="font-mono text-sm text-blue-400 font-black tracking-tight">{formatTime(timer)}</span>
           </div>
        </div>

        {/* AI Feed Center */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none"></div>
           
           <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center mb-10">
              <div className={`absolute inset-0 rounded-full border border-blue-500/5 transition-all duration-1000 ${status === 'thinking' ? 'animate-pulse scale-110 border-blue-500/10' : 'scale-100'}`}></div>
              <div className={`w-32 h-32 md:w-36 md:h-36 rounded-full bg-[#010515] border-[1px] flex items-center justify-center transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,1)] ${status === 'listening' ? 'border-emerald-500/30' : status === 'speaking' ? 'border-blue-500/30' : 'border-white/5'}`}>
                 <div className="flex items-center gap-2 h-10">
                    {[...Array(5)].map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-1.5 rounded-full transition-all duration-300 ${status === 'speaking' ? 'bg-blue-400' : status === 'listening' ? 'bg-emerald-400' : 'bg-white/5'}`}
                         style={{ 
                           height: status === 'speaking' ? `${35 + Math.random() * 65}%` : status === 'listening' ? `${Math.max(20, audioLevel * 2.5)}%` : '15%',
                           transitionDelay: `${i * 100}ms`
                         }}
                       ></div>
                    ))}
                 </div>
              </div>
           </div>

           {/* AI Question Feed */}
           <div className="w-full max-w-xl bg-black/60 border border-white/5 p-12 rounded-[3rem] backdrop-blur-3xl text-center shadow-2xl relative z-20">
              <span className="block text-[7px] font-black text-white/10 uppercase tracking-[0.6em] mb-4">Encrypted AI Feed</span>
              <p className={`text-[10px] md:text-[11px] font-bold leading-relaxed tracking-tight min-h-[4rem] flex items-center justify-center transition-all duration-500 ${status === 'idle' ? 'text-white/90' : 'text-white/60'}`}>
                 {getSubtitles()}
              </p>
           </div>
        </div>

        {/* Candidate Monitor */}
        <div className="absolute top-6 right-6 w-52 aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl z-20 group">
           <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-60 transition-opacity group-hover:opacity-80" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
           <div className="absolute bottom-3 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] text-white/70 font-black uppercase tracking-widest">{profile.name}</span>
           </div>
        </div>

        {/* History Overlay */}
        <div className={`absolute top-0 right-0 bottom-0 z-40 bg-[#020617]/98 backdrop-blur-3xl border-l border-white/5 flex flex-col transition-all duration-500 ${showHistory ? 'w-80' : 'w-0 overflow-hidden'}`}>
           <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Audit Transcript</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 text-white/30 hover:text-white transition-colors">✕</button>
           </div>
           <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                 <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[10px] leading-relaxed font-bold border ${m.role === 'user' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}>
                       {m.text}
                    </div>
                    <span className="mt-1.5 text-[6.5px] font-black text-white/10 uppercase tracking-widest">{m.timeLabel} • {m.role}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Control Deck */}
      <div className="h-20 bg-black/90 border-t border-white/5 px-6 flex items-center gap-6 z-50 shrink-0">
         <button 
           onClick={toggleMic}
           className={`h-11 px-8 rounded-xl flex items-center gap-4 transition-all active:scale-95 shadow-xl ${status === 'listening' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
         >
            {status === 'listening' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            )}
            <span className="text-[8.5px] font-black uppercase tracking-widest">{status === 'listening' ? 'Mute Uplink' : 'Unmute Link'}</span>
         </button>

         <form onSubmit={handleSendResponse} className="flex-1 h-11 flex gap-3">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={status === 'thinking'}
              placeholder={status === 'listening' ? "Voice activity identified..." : "Transmit textual response..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 text-[10px] font-bold outline-none focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-white/10"
            />
            <button 
              type="submit" 
              disabled={!(input.trim() || interimTranscript.trim()) || status === 'thinking'}
              className="h-11 w-11 bg-white text-black rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-5"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
         </form>

         <div className="flex items-center gap-2.5">
            <button onClick={() => setShowHistory(true)} className="h-11 w-11 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 text-white/20 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button 
              onClick={handleFinish}
              className="h-11 px-6 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl text-[8.5px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10"
            >
               Finish Session
            </button>
         </div>
      </div>
    </div>
  );
};

export default ChatInterface;
