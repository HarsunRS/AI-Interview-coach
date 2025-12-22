import React, { useState, useEffect, useRef } from "react";
import { UserProfile, Message } from "../types";
import { PERSONAS } from "../constants";
import { initInterview, sendInterviewMsg } from "../services/api";

interface ChatInterfaceProps {
  profile: UserProfile;
  onComplete: (history: string, proctoringLogs: string[]) => void;
  theme: "light" | "dark";
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ profile, onComplete, theme }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [proctoringLogs, setProctoringLogs] = useState<string[]>([]);
  const [alert, setAlert] = useState<string | null>(null);
  const [timer, setTimer] = useState(profile.timeLimit * 60);

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        const timestamp = new Date().toLocaleTimeString();
        const msg = `[${timestamp}] Tab Switch Violation`;
        setProctoringLogs(prev => [...prev, msg]);
        setAlert("Security Alert: Application visibility changed.");
        setTimeout(() => setAlert(null), 4000);
      }
    });

    const start = async () => {
      try {
        const { reply } = await initInterview(profile);
        setMessages([{ role: "model", text: reply, timestamp: new Date() }]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || isFinishing) return;

    const userText = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userText, timestamp: new Date() }]);
    setLoading(true);

    try {
      const { reply } = await sendInterviewMsg(userText);
      setMessages(prev => [...prev, { role: "model", text: reply, timestamp: new Date() }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setIsFinishing(true);
    const transcript = messages
      .map(m => `${m.role.toUpperCase()}: ${m.text}`)
      .join("\n\n");
    onComplete(transcript, proctoringLogs);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-7xl mx-auto rounded-[3rem] shadow-2xl overflow-hidden border">
      <div className="px-8 py-4 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">
            IP
          </div>
          <h1 className="text-white font-black text-sm uppercase tracking-wider">
            Secure Interview Session
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-white font-mono">
              {formatTime(timer)}
            </span>
          </div>
          <button
            onClick={handleFinish}
            className="bg-green-600 text-white px-5 py-1.5 rounded-xl font-black text-[10px] uppercase hover:bg-green-700"
          >
            End Practice
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col bg-slate-900">
          <div
            ref={scrollRef}
            className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth scrollbar-hide"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-6 rounded-[2rem] shadow-2xl ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed font-medium">
                    {m.text}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-4 rounded-3xl flex gap-1 shadow-inner">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-900 border-t border-white/5">
            <form onSubmit={handleSend} className="flex gap-4">
              <input
                type="text"
                autoFocus
                className="flex-1 bg-slate-800/50 text-white border border-white/10 px-6 py-4 rounded-2xl"
                placeholder="Enter your response..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading || isFinishing}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || isFinishing}
                className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
