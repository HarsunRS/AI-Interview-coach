import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, Message } from '../types';
import { PERSONAS } from '../constants';
import { interviewService } from '../services/geminiService';
import { whisperService } from '../services/whisperService';

interface ChatInterfaceProps {
  profile: UserProfile;
  onComplete: (history: string, proctoringLogs: string[]) => void;
  onCancel?: () => void;
  theme: 'light' | 'dark';
}

type InterviewState =
  | 'initializing'
  | 'speaking'
  | 'answering'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'paused'
  | 'permission_denied';

interface ProctorLog {
  time: string;
  msg: string;
  severity: 'low' | 'med' | 'high';
}

const ANSWER_SECONDS_BY_MODE: Record<string, number> = {
  'Quick Mock': 45,
  'Full Mock': 90,
  'Company Simulation': 75
};

const normalizeSpeechText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const ChatInterface: React.FC<ChatInterfaceProps> = ({ profile, onComplete, onCancel }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState<InterviewState>('initializing');
  const [sessionTimer, setSessionTimer] = useState(profile.timeLimit * 60);
  const [answerTimer, setAnswerTimer] = useState(ANSWER_SECONDS_BY_MODE[profile.interviewMode] || 60);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [whisperReady, setWhisperReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [proctorLogs] = useState<ProctorLog[]>([]);

  // DOM / media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceRafRef = useRef<number | null>(null);
  const micLevelIntervalRef = useRef<number | null>(null);

  // Web Speech API — live display only
  const recognitionRef = useRef<any>(null);
  const speechFinalRef = useRef('');

  // State refs
  const finishTriggeredRef = useRef(false);
  const initRef = useRef(false);
  const isListeningRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const submittingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const inputRef = useRef('');
  const submitAnswerRef = useRef<() => void>(() => {});
  const currentQuestionRef = useRef('');
  const answerDurationRef = useRef(ANSWER_SECONDS_BY_MODE[profile.interviewMode] || 60);
  const sessionExpiredRef = useRef(false);
  const isPausedRef = useRef(false);

  const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, seconds);
    return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
  };

  const lastQuestion = [...messages].reverse().find(m => m.role === 'model')?.text;
  const displayTranscript = `${input} ${interimTranscript}`.trim();

  useEffect(() => { currentQuestionRef.current = lastQuestion || ''; }, [lastQuestion]);
  useEffect(() => { inputRef.current = input; }, [input]);

  // ─── Mic level monitor ───────────────────────────────────────────────────────

  const startMicLevelMonitor = () => {
    if (micLevelIntervalRef.current) return;
    micLevelIntervalRef.current = window.setInterval(() => {
      if (!analyserRef.current) return;
      const buf = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(buf);
      const amplitude = buf.reduce((max, v) => Math.max(max, Math.abs(v - 128)), 0);
      setMicLevel(Math.round((amplitude / 128) * 100));
    }, 80);
  };

  const stopMicLevelMonitor = () => {
    if (micLevelIntervalRef.current) {
      window.clearInterval(micLevelIntervalRef.current);
      micLevelIntervalRef.current = null;
    }
    setMicLevel(0);
  };

  // ─── Web Speech API setup (live display only) ────────────────────────────────

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = profile.preferredLanguage === 'English' ? 'en-IN' : 'en-US';

    recognition.onresult = (event: any) => {
      if (!isListeningRef.current) return;
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      if (final) {
        speechFinalRef.current = (speechFinalRef.current + final).trim();
        inputRef.current = speechFinalRef.current;
        setInput(speechFinalRef.current);
      }
      setInterimTranscript(interim.trim());
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // Web Speech API blocked in this browser — Whisper still handles final transcription
      }
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [profile.preferredLanguage]);

  // ─── Device toggles ──────────────────────────────────────────────────────────

  const toggleMic = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    const next = !micEnabled;
    stream.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicEnabled(next);
    if (!next) stopMicLevelMonitor();
    else startMicLevelMonitor();
  };

  const toggleCam = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    const next = !camEnabled;
    stream.getVideoTracks().forEach(t => { t.enabled = next; });
    setCamEnabled(next);
  };

  const retryPermissions = async () => {
    let audioOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setMicEnabled(true);
      setCamEnabled(true);
      audioOk = true;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setMicEnabled(true);
        audioOk = true;
      } catch {}
    }

    if (!audioOk) return;
    permissionDeniedRef.current = false;

    try {
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(mediaStreamRef.current!);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioCtxRef.current = ctx;
      startMicLevelMonitor();
    } catch {}

    setStatus('thinking');
    try {
      const { text } = await interviewService.initInterview(profile);
      setMessages([{ role: 'model', text, timestamp: new Date(), timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      await speakQuestion(text);
      startAnswerWindow();
    } catch {
      startAnswerWindow();
    }
  };

  // ─── Recording helpers ───────────────────────────────────────────────────────

  const stopSilenceDetection = () => {
    if (silenceRafRef.current !== null) {
      cancelAnimationFrame(silenceRafRef.current);
      silenceRafRef.current = null;
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    stopSilenceDetection();
    try { recognitionRef.current?.stop(); } catch {}
    setInterimTranscript('');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  };

  const doTranscribe = async (): Promise<string> => {
    await new Promise<void>(resolve => {
      const rec = mediaRecorderRef.current;
      if (!rec || rec.state === 'inactive') { resolve(); return; }
      rec.onstop = () => resolve();
      try { rec.stop(); } catch { resolve(); }
    });

    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];
    if (!chunks.length || !whisperReady) return '';

    const mimeType = chunks[0]?.type || 'audio/webm';
    const blob = new Blob(chunks, { type: mimeType });
    return whisperService.transcribe(blob).catch(() => '');
  };

  const onSilenceDetected = async () => {
    if (isTranscribingRef.current || submittingRef.current) return;
    stopSilenceDetection();
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}

    // Get the current Web Speech result as immediate candidate
    const speechResult = `${speechFinalRef.current} ${interimTranscript}`.trim();
    setInterimTranscript('');

    // If nothing captured at all, stay in answering state — don't wipe existing text
    if (!speechResult && !audioChunksRef.current.length) {
      setStatus('answering');
      return;
    }

    // Try Whisper for accuracy if ready; fall back to Web Speech result
    if (whisperReady && audioChunksRef.current.length) {
      isTranscribingRef.current = true;
      setStatus('transcribing');
      const whisperText = await doTranscribe();
      isTranscribingRef.current = false;
      if (sessionExpiredRef.current) { handleFinish(); return; }
      const finalText = (whisperText && whisperText.length > 2) ? whisperText : speechResult;
      if (!finalText) { setStatus('answering'); return; }
      const norm = normalizeSpeechText(finalText);
      const normQ = normalizeSpeechText(currentQuestionRef.current);
      if (normQ.includes(norm) || norm.includes(normQ.slice(0, 80))) { setStatus('answering'); return; }
      inputRef.current = finalText;
      setInput(finalText);
    } else {
      if (!speechResult) { setStatus('answering'); return; }
      const norm = normalizeSpeechText(speechResult);
      const normQ = normalizeSpeechText(currentQuestionRef.current);
      if (normQ.includes(norm) || norm.includes(normQ.slice(0, 80))) { setStatus('answering'); return; }
      inputRef.current = speechResult;
      setInput(speechResult);
    }

    setStatus('answering');
    window.setTimeout(() => {
      if (!submittingRef.current) submitAnswerRef.current();
    }, 800);
  };

  const startSilenceDetection = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const buffer = new Uint8Array(analyser.fftSize);
    let silenceStart: number | null = null;
    let speechStart: number | null = null; // require sustained audio before marking hasSpeech
    let hasSpeech = false;

    const loop = () => {
      if (!isListeningRef.current) return;
      analyser.getByteTimeDomainData(buffer);
      const amplitude = buffer.reduce((max, v) => Math.max(max, Math.abs(v - 128)), 0);

      if (amplitude > 20) {
        // Require at least 400ms of sustained audio before we consider it real speech
        if (!speechStart) speechStart = Date.now();
        else if (!hasSpeech && Date.now() - speechStart > 400) hasSpeech = true;
        silenceStart = null;
      } else {
        speechStart = null;
        if (hasSpeech) {
          if (!silenceStart) silenceStart = Date.now();
          // 2500ms of silence after confirmed speech → auto-submit
          else if (Date.now() - silenceStart > 2500) { onSilenceDetected(); return; }
        }
      }
      silenceRafRef.current = requestAnimationFrame(loop);
    };
    silenceRafRef.current = requestAnimationFrame(loop);
  };

  const startListening = () => {
    if (permissionDeniedRef.current || !mediaStreamRef.current) return;

    isListeningRef.current = true;
    audioChunksRef.current = [];
    speechFinalRef.current = '';
    setInput('');
    setInterimTranscript('');
    inputRef.current = '';

    // MediaRecorder — for Whisper transcription
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg;codecs=opus';
    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      recorder.start(200);
    } catch {}

    // Web Speech API — for live word display
    try { recognitionRef.current?.start(); } catch {}

    startSilenceDetection();
    setStatus('listening');
  };

  const pauseVoiceCapture = () => {
    stopSilenceDetection();
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    const currentText = `${speechFinalRef.current} ${interimTranscript}`.trim();
    setInterimTranscript('');

    if (currentText) { inputRef.current = currentText; setInput(currentText); }

    // Transcribe with Whisper in background if available
    if (whisperReady && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setStatus('transcribing');
      isTranscribingRef.current = true;
      doTranscribe().then(text => {
        isTranscribingRef.current = false;
        if (text && text.length > 2) { inputRef.current = text; setInput(text); }
        setStatus('answering');
      });
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      setStatus('answering');
    }
  };

  const toggleVoiceCapture = () => {
    if (status === 'listening') pauseVoiceCapture();
    else if (status === 'answering') startListening();
  };

  const startAnswerWindow = () => {
    setInput('');
    setInterimTranscript('');
    inputRef.current = '';
    speechFinalRef.current = '';
    setAnswerTimer(answerDurationRef.current);
    setStatus('answering');
    window.setTimeout(startListening, 600);
  };

  // ─── TTS ────────────────────────────────────────────────────────────────────

  const speakQuestion = async (text: string): Promise<void> => {
    stopListening();
    setStatus('speaking');
    if (!text.trim()) return;

    try {
      const audioData = await interviewService.generateSpeech(text, persona.voice);
      if (audioData) { await interviewService.playAudio(audioData); return; }
    } catch {}

    await new Promise<void>(resolve => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = profile.preferredLanguage === 'English' ? 'en-IN' : 'en-US';
      utterance.rate = 0.96;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => /english/i.test(v.lang) && /india|in/i.test(`${v.name} ${v.lang}`))
        || voices.find(v => /english/i.test(v.lang)) || voices[0];
      if (preferred) utterance.voice = preferred;
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      utterance.onend = done;
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
      window.setTimeout(done, Math.max(3500, text.split(/\s+/).length * 430));
    });
  };

  // ─── Interview actions ───────────────────────────────────────────────────────

  const handleFinish = () => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    stopListening();
    stopMicLevelMonitor();
    interviewService.stopAudio();
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());

    const pendingAnswer = displayTranscript || inputRef.current.trim();
    const finalMessages = pendingAnswer
      ? [...messages, { role: 'user' as const, text: pendingAnswer, timestamp: new Date(), timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
      : messages;

    const historyText = finalMessages.length > 0
      ? finalMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n')
      : 'The candidate ended the session before any interaction took place.';
    onComplete(historyText, proctorLogs.map(l => l.msg));
  };

  const handlePause = () => {
    if (finishTriggeredRef.current) return;

    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      setStatus('answering');
      setAnswerTimer(answerDurationRef.current);
      window.setTimeout(startListening, 400);
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      stopListening();
      interviewService.stopAudio();
      setStatus('paused');
    }
  };

  const submitAnswer = async () => {
    if (submittingRef.current || isTranscribingRef.current || status === 'thinking' || status === 'speaking' || status === 'initializing' || status === 'transcribing' || status === 'paused') return;

    // If recording, stop and get best available transcription
    if (isListeningRef.current) {
      stopSilenceDetection();
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      const speechResult = `${speechFinalRef.current} ${interimTranscript}`.trim();
      setInterimTranscript('');

      if (whisperReady && audioChunksRef.current.length) {
        setStatus('transcribing');
        isTranscribingRef.current = true;
        const whisperText = await doTranscribe();
        isTranscribingRef.current = false;
        if (sessionExpiredRef.current) { handleFinish(); return; }
        const finalText = (whisperText && whisperText.length > 2) ? whisperText : speechResult;
        if (finalText) { inputRef.current = finalText; setInput(finalText); }
      } else {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try { mediaRecorderRef.current.stop(); } catch {}
        }
        if (speechResult) { inputRef.current = speechResult; setInput(speechResult); }
      }
    }

    if (isTranscribingRef.current) return;

    const answer = inputRef.current.trim() || 'No answer captured.';
    submittingRef.current = true;
    stopListening();
    setInput('');
    setInterimTranscript('');
    inputRef.current = '';
    speechFinalRef.current = '';

    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: answer, timestamp: new Date(), timeLabel }]);
    setStatus('thinking');

    try {
      const { text } = await interviewService.sendMessage(answer);
      setMessages(prev => [...prev, { role: 'model', text, timestamp: new Date(), timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      await speakQuestion(text);
      submittingRef.current = false;
      startAnswerWindow();
    } catch {
      submittingRef.current = false;
      startAnswerWindow();
    }
  };

  submitAnswerRef.current = () => submitAnswer();

  useEffect(() => {
    if (status !== 'listening' && status !== 'answering') return;
    const interval = window.setInterval(() => {
      setAnswerTimer(current => {
        if (current <= 1) { window.clearInterval(interval); submitAnswerRef.current(); return 0; }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isPausedRef.current) setSessionTimer(t => t <= 1 ? 0 : t - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sessionTimer !== 0) return;
    if (isTranscribingRef.current) {
      sessionExpiredRef.current = true;
    } else {
      handleFinish();
    }
  }, [sessionTimer]);

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const startSession = async () => {
      // Load Whisper in background — don't block the interview
      whisperService.load().then(() => setWhisperReady(true)).catch(() => {});

      let audioOk = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        audioOk = true;
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          audioOk = true;
          setCamEnabled(false);
        } catch {
          permissionDeniedRef.current = true;
          setMicEnabled(false);
          setCamEnabled(false);
          setStatus('permission_denied');
        }
      }

      if (audioOk && mediaStreamRef.current) {
        try {
          const ctx = new AudioContext();
          const source = ctx.createMediaStreamSource(mediaStreamRef.current);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;
          audioCtxRef.current = ctx;
          startMicLevelMonitor();
        } catch {}
      }

      if (permissionDeniedRef.current) return;

      setStatus('thinking');
      try {
        const { text } = await interviewService.initInterview(profile);
        setMessages([{ role: 'model', text, timestamp: new Date(), timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        await speakQuestion(text);
        startAnswerWindow();
      } catch {
        startAnswerWindow();
      }
    };

    startSession();

    return () => {
      stopListening();
      stopMicLevelMonitor();
      interviewService.stopAudio();
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [profile]);

  const getStatusLabel = () => {
    if (status === 'initializing') return `Preparing ${persona.name}`;
    if (status === 'thinking') return 'Interviewer is preparing the next question';
    if (status === 'speaking') return 'Question is being asked';
    if (status === 'answering') return `Your turn — type or turn voice on${!whisperReady ? ' · Whisper loading...' : ''}`;
    if (status === 'transcribing') return 'Refining transcription with Whisper...';
    if (status === 'paused') return 'Interview paused — press Resume to continue';
    if (status === 'permission_denied') return 'Microphone access denied';
    return `Speak now — silence auto-submits${!whisperReady ? ' · Whisper loading' : ''}`;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 top-16 flex flex-col bg-[#020617] overflow-hidden select-none z-[100]">
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Sidebar ── */}
        <aside className="w-72 bg-black/40 border-r border-white/5 flex flex-col p-6 space-y-5 shrink-0 z-10">
          <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-blue-300/60 uppercase tracking-widest">Answer Timer</span>
              <span className="font-mono text-2xl text-blue-300 font-black">{formatTime(answerTimer)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, (answerTimer / answerDurationRef.current) * 100)}%` }} />
            </div>
            <p className="text-[9px] text-blue-200/50 font-bold mt-3 uppercase tracking-widest">Auto-submits when time ends</p>
          </div>

          <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-emerald-300/60 uppercase tracking-widest">Voice</span>
              <span className={`h-2.5 w-2.5 rounded-full ${status === 'listening' ? 'bg-emerald-400 animate-pulse' : status === 'transcribing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            </div>
            <p className="text-xs text-emerald-100/70 font-bold mt-3">
              {status === 'transcribing' ? 'Refining with Whisper...'
                : whisperReady ? 'Live + Whisper accuracy active'
                : 'Live speech · Whisper loading in background'}
            </p>
          </div>

          <div className="flex-1 bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
            <h3 className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-4">Question Pattern</h3>
            <div className="space-y-3">
              {['Self intro', 'Projects', 'Skills', 'Technical', 'Behavioral'].map((stage, i) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                  <span className="text-[10px] font-black text-white/45 uppercase tracking-widest">{stage}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-white/5 space-y-2 font-mono text-[8px] scrollbar-hide overflow-y-auto">
              {messages.slice(-6).map((m, i) => (
                <div key={`${m.timeLabel}-${i}`} className={`border-l-2 pl-2 py-0.5 ${m.role === 'user' ? 'border-emerald-500 text-emerald-400/70' : 'border-blue-500 text-blue-400/70'}`}>
                  [{m.timeLabel}] {m.role.toUpperCase()} saved
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600/5 p-5 rounded-2xl border border-blue-500/10 flex justify-between items-center">
            <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest">Session Time</span>
            <span className="font-mono text-sm text-blue-300 font-black">{formatTime(sessionTimer)}</span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative">

          {/* Video + device controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
            <div className="w-64 aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
              <video
                ref={videoRef}
                autoPlay muted playsInline
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${camEnabled ? 'opacity-70' : 'opacity-0'}`}
              />
              {!camEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                    <path d="M17 3H7L3 7v10l4 4h10l4-4V7l-4-4Z"/><line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                  <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Camera Off</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <div className={`w-1.5 h-1.5 rounded-full ${camEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[8px] text-white/75 font-black uppercase tracking-widest">
                  {camEnabled ? `Live: ${profile.name}` : 'Camera Off'}
                </span>
              </div>
            </div>

            {/* Mic & cam buttons */}
            <div className="flex gap-2">
              <button
                onClick={toggleMic}
                disabled={permissionDeniedRef.current}
                title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                className={`flex-1 h-10 rounded-xl border flex items-center justify-center gap-2 transition-all disabled:opacity-30 ${micEnabled ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={micEnabled ? 'text-emerald-400' : 'text-red-400'}>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                  {!micEnabled && <line x1="2" x2="22" y1="2" y2="22"/>}
                </svg>
                <div className="flex items-end gap-px h-4">
                  {[0.5, 0.8, 1.0, 0.8, 0.5].map((scale, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${micEnabled ? 'bg-emerald-400' : 'bg-red-400/40'}`}
                      style={{ height: micEnabled && micLevel > 0 ? `${Math.max(3, micLevel * scale * 0.14 + 2)}px` : '3px' }}
                    />
                  ))}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/50">{micEnabled ? 'Mic' : 'Muted'}</span>
              </button>

              <button
                onClick={toggleCam}
                disabled={!mediaStreamRef.current || mediaStreamRef.current.getVideoTracks().length === 0}
                title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
                className={`flex-1 h-10 rounded-xl border flex items-center justify-center gap-2 transition-all disabled:opacity-30 ${camEnabled ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' : 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={camEnabled ? 'text-blue-400' : 'text-red-400'}>
                  <path d="m22 8-6 4 6 4V8Z"/>
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                  {!camEnabled && <line x1="2" x2="22" y1="2" y2="22"/>}
                </svg>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/50">{camEnabled ? 'Cam' : 'Off'}</span>
              </button>
            </div>
          </div>

          {/* Paused overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
              <div className="flex items-center gap-3 bg-amber-500/20 border border-amber-500/40 px-8 py-4 rounded-2xl">
                <div className="w-3 h-8 bg-amber-400 rounded-sm" />
                <div className="w-3 h-8 bg-amber-400 rounded-sm" />
                <span className="text-amber-300 font-black text-lg uppercase tracking-[0.3em] ml-2">Paused</span>
              </div>
            </div>
          )}

          {/* Waveform orb */}
          <div className={`w-40 h-40 rounded-full border flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(0,0,0,1)] ${status === 'listening' ? 'border-emerald-500/40' : status === 'speaking' ? 'border-blue-500/40' : status === 'transcribing' ? 'border-amber-500/40' : status === 'paused' ? 'border-amber-500/20' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 h-12">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 rounded-full transition-all duration-150 ${status === 'listening' ? 'bg-emerald-400' : status === 'speaking' ? 'bg-blue-400' : status === 'transcribing' ? 'bg-amber-400' : status === 'paused' ? 'bg-amber-400/30' : 'bg-white/10'}`}
                  style={{
                    height: status === 'listening'
                      ? `${Math.max(8, (micLevel * [0.6, 1, 0.8, 1, 0.6][i]) * 0.36 + 8)}px`
                      : status === 'speaking' ? `${22 + (i % 2) * 24}px`
                      : status === 'transcribing' ? `${16 + (i % 4) * 8}px`
                      : status === 'paused' ? '14px'
                      : '10px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Status + transcript */}
          <section className="w-full max-w-3xl bg-black/60 border border-white/10 p-8 rounded-2xl backdrop-blur-3xl text-center shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.4em]">{getStatusLabel()}</span>
            </div>

            {status === 'permission_denied' ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-white/60 font-bold leading-relaxed">
                  Microphone access was blocked. Click the lock/camera icon in your browser's address bar to allow access, then retry.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={retryPermissions}
                    className="h-10 px-6 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Retry Permissions
                  </button>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="h-10 px-6 bg-white/10 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                      Return to Dashboard
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm md:text-base font-bold leading-relaxed text-white min-h-[5rem] flex items-center justify-center">
                {status === 'listening'
                  ? displayTranscript || 'Speak now — your words will appear here in real time.'
                  : status === 'answering'
                    ? displayTranscript || 'Voice is paused. Type your answer or turn voice back on.'
                    : status === 'transcribing'
                      ? input || 'Refining transcription...'
                      : status === 'paused'
                        ? <span className="text-amber-300/70">{lastQuestion || 'Interview is paused. Press Resume to continue.'}</span>
                        : lastQuestion || 'Waiting for the first question...'}
              </p>
            )}
          </section>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="h-20 bg-black/90 border-t border-white/5 px-6 flex items-center gap-5 z-50">
        <button
          type="button"
          onClick={toggleVoiceCapture}
          disabled={status === 'initializing' || status === 'thinking' || status === 'speaking' || status === 'transcribing' || status === 'paused' || permissionDeniedRef.current}
          className={`h-11 px-5 rounded-xl border flex items-center gap-3 transition-all disabled:opacity-30 ${
            status === 'listening'
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
              : status === 'answering'
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">
            {status === 'listening' ? 'Pause Voice' : 'Start Voice'}
          </span>
        </button>

        <form onSubmit={e => { e.preventDefault(); submitAnswer(); }} className="flex-1 h-11 flex gap-3">
          <input
            type="text"
            value={displayTranscript}
            onChange={e => { inputRef.current = e.target.value; setInput(e.target.value); setInterimTranscript(''); }}
            disabled={status === 'thinking' || status === 'speaking' || status === 'paused'}
            placeholder={isPaused ? 'Interview paused...' : 'Speak or type your answer here...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 text-xs font-bold outline-none text-white focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={status !== 'listening' && status !== 'answering'}
            className="h-11 px-5 bg-white text-black rounded-xl flex items-center gap-2 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Submit</span>
          </button>
        </form>

        <button
          onClick={handlePause}
          disabled={status === 'initializing' || status === 'thinking' || status === 'transcribing' || status === 'permission_denied' || finishTriggeredRef.current}
          title={isPaused ? 'Resume interview' : 'Pause interview'}
          className={`h-11 px-5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center gap-2 ${
            isPaused
              ? 'border-amber-500 bg-amber-500 text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {isPaused ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Resume
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pause
            </>
          )}
        </button>

        <button
          onClick={handleFinish}
          className="h-11 px-6 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg"
        >
          Finalize Session
        </button>
      </footer>
    </div>
  );
};

export default ChatInterface;
