
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
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
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
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') setStatus('permission_denied');
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = async () => {
    if (status === 'permission_denied') return;

    if (!audioContextRef.current) {
        // Force initialization if needed
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startAudioMonitoring(stream);
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isListeningRef.current) {
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch(e) {}
      setStatus('idle');
    } else {
      isListeningRef.current = true;
      setStatus('listening');
      try { recognitionRef.current?.start(); } catch (e) {}
    }
  };

  const startAudioMonitoring = (stream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioLevel(Math.min(100, (sum / dataArray.length) * 4));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (e) {}
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    const historyText = messages.length > 0 
      ? messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n')
      : "The candidate ended the session before any interaction took place.";
    onComplete(historyText, proctorLogs.map(l => l.msg));
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        startAudioMonitoring(stream);
      } catch (err) {
        setStatus('permission_denied');
      }

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
  }, [profile]);

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

  const getHUDText = () => {
    const lastModelMsg = [...messages].reverse().find(m => m.role === 'model')?.text;
    if (status === 'initializing') return `Synchronizing Neural Link with ${persona.name}...`;
    if (status === 'thinking') return `Interviewer is evaluating data...`;
    if (status === 'speaking') return messages[messages.length - 1]?.text;
    if (status === 'listening') return ((input + " " + interimTranscript).trim() || "Active Listening... Transcription ongoing.");
    return lastModelMsg || "Waiting for session initiation...";
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 top-16 flex flex-col bg-[#020617] overflow-hidden select-none z-[100]">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Telemetry Deck */}
        <div className="w-64 bg-black/40 border-r border-white/5 flex flex-col p-6 space-y-6 shrink-0 z-10">
           <div className="bg-[#1e293b]/40 p-5 rounded-[2rem] border border-white/5">
              <div className="flex justify-between items-center mb-4 text-[8px] font-black uppercase tracking-widest text-white/30">
                 <span>Input Volume</span>
                 <span className="text-blue-400 font-mono text-[10px]">{Math.round(audioLevel)}</span>
              </div>
              <div className="flex items-end gap-1.5 h-10 px-1">
                 {[...Array(14)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 rounded-full transition-all duration-75"
                      style={{ 
                        height: `${Math.max(20, (audioLevel + Math.random() * 8) * 4)}%`,
                        backgroundColor: audioLevel > 5 ? '#3b82f6' : '#1e293b'
                      }}
                    ></div>
                 ))}
              </div>
           </div>
           <div className="flex-1 bg-black/20 p-5 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden">
              <h3 className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-4">Uplink Log</h3>
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[7px] scrollbar-hide">
                 {messages.slice(-5).map((m, i) => (
                    <div key={i} className={`border-l-2 pl-2 py-0.5 ${m.role === 'user' ? 'border-emerald-500 text-emerald-400/60' : 'border-blue-500 text-blue-400/60'}`}>
                       [{m.timeLabel}] {m.role.toUpperCase()} Transmission Received
                    </div>
                 ))}
              </div>
           </div>
           <div className="bg-blue-600/5 p-5 rounded-[2rem] border border-blue-500/10 flex justify-between items-center">
              <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest">Time Remaining</span>
              <span className="font-mono text-sm text-blue-400 font-black">{formatTime(timer)}</span>
           </div>
        </div>

        {/* HUD Center */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
           <div className="relative w-48 h-48 flex items-center justify-center mb-10">
              <div className={`w-40 h-40 rounded-full bg-[#010515] border-[1px] flex items-center justify-center transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,1)] ${status === 'listening' ? 'border-emerald-500/30' : status === 'speaking' ? 'border-blue-500/30' : 'border-white/5'}`}>
                 <div className="flex items-center gap-2 h-10">
                    {[...Array(5)].map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-1.5 rounded-full transition-all duration-300 ${status === 'speaking' ? 'bg-blue-400' : status === 'listening' ? 'bg-emerald-400' : 'bg-white/5'}`}
                         style={{ height: status === 'speaking' ? `${30+Math.random()*70}%` : status === 'listening' ? `${Math.max(20, audioLevel*2.5)}%` : '15%' }}
                       ></div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="w-full max-w-xl bg-black/60 border border-white/5 p-12 rounded-[3rem] backdrop-blur-3xl text-center shadow-2xl relative z-20">
              <span className="block text-[7px] font-black text-white/10 uppercase tracking-[0.6em] mb-4">Neural Feed Transmission</span>
              <p className={`text-[10px] md:text-[11px] font-bold leading-relaxed tracking-tight min-h-[4rem] flex items-center justify-center transition-all duration-500 ${status === 'idle' ? 'text-white' : 'text-white/60'}`}>
                 {getHUDText()}
              </p>
           </div>
        </div>

        {/* Candidate Feed */}
        <div className="absolute top-6 right-6 w-52 aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl z-20">
           <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-60" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
           <div className="absolute bottom-3 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] text-white/70 font-black uppercase tracking-widest">Live Link: {profile.name}</span>
           </div>
        </div>
      </div>

      {/* Control Footer */}
      <div className="h-20 bg-black/90 border-t border-white/5 px-6 flex items-center gap-6 z-50">
         <button 
           onClick={toggleMic}
           className={`h-11 px-8 rounded-xl flex items-center gap-4 transition-all active:scale-95 shadow-xl ${isListeningRef.current ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
         >
            {isListeningRef.current ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            )}
            <span className="text-[8.5px] font-black uppercase tracking-widest">{isListeningRef.current ? 'Uplink Muted' : 'Uplink Active'}</span>
         </button>

         <form onSubmit={handleSendResponse} className="flex-1 h-11 flex gap-3">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={status === 'thinking'}
              placeholder="Inject textual response..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 text-[10px] font-bold outline-none text-white focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-white/10"
            />
            <button type="submit" className="h-11 w-11 bg-white text-black rounded-xl flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
         </form>

         <button 
           onClick={handleFinish}
           className="h-11 px-6 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl text-[8.5px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg"
         >
            Finalize Session
         </button>
      </div>
    </div>
  );
};

export default ChatInterface;
