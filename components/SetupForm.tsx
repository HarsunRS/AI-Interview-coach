
import React, { useState, useRef } from 'react';
import { UserProfile, InterviewMode, RoundType } from '../types';
import { PERSONAS, INITIAL_USER_PROFILE } from '../constants';

interface SetupFormProps {
  onStart: (profile: UserProfile) => void;
  onCancel: () => void;
  theme: 'light' | 'dark';
}

const SetupForm: React.FC<SetupFormProps> = ({ onStart, onCancel, theme }) => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(profile);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfile(prev => ({ ...prev, resumeText: `Parsed from ${file.name}: Detailed skill extraction...` }));
    }
  };

  const bgClass = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const labelClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const headingClass = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className={`text-3xl font-black ${headingClass} transition-colors`}>Configure Your Interview</h2>
        <div className="flex justify-center items-center gap-3 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step >= i ? 'w-10 bg-blue-600' : 'w-4 bg-slate-300'}`} />
          ))}
        </div>
      </div>

      <div className={`${bgClass} p-8 rounded-[2.5rem] shadow-2xl border min-h-[500px] flex flex-col transition-colors`}>
        {step === 1 && (
          <div className="space-y-8 flex-1">
            <h3 className={`text-xl font-bold ${headingClass}`}>1. Interview Goal & Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className={`block text-xs font-black uppercase tracking-widest ${labelClass}`}>Full Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl outline-none border focus:ring-2 focus:ring-blue-600 transition-all ${inputClass}`} 
                  value={profile.name} 
                  placeholder="Enter your name"
                  onChange={e => setProfile({...profile, name: e.target.value, avatarSeed: e.target.value || 'User'})} 
                />
                
                <label className={`block text-xs font-black uppercase tracking-widest ${labelClass}`}>Avatar Preview</label>
                <div className={`flex items-center gap-4 p-4 rounded-2xl border border-dashed ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                   <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}`} 
                    className="w-16 h-16 rounded-full bg-slate-200 border border-slate-300" 
                    alt="Preview" 
                   />
                   <div className="text-xs text-slate-500 font-medium">Avatar updates dynamically with your name.</div>
                </div>
              </div>
              <div className="space-y-4">
                <label className={`block text-xs font-black uppercase tracking-widest ${labelClass}`}>Interview Mode</label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(InterviewMode).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setProfile({ ...profile, interviewMode: m as InterviewMode })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${profile.interviewMode === m ? 'border-blue-600 bg-blue-50/10' : (theme === 'dark' ? 'border-slate-800 hover:border-slate-700' : 'border-slate-100 hover:border-slate-200')}`}
                    >
                      <div className={`font-bold ${profile.interviewMode === m ? 'text-blue-600' : headingClass}`}>{m}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">{m === InterviewMode.QUICK ? '5-7 Questions, Rapid Feedback' : 'Full Realistic Simulation'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1">
            <h3 className={`text-xl font-bold ${headingClass}`}>2. Profile Details & Context</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest ${labelClass} mb-1`}>Target Role</label>
                  <input type="text" className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none ${inputClass}`} value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest ${labelClass} mb-1`}>Upload Resume (PDF)</label>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer hover:bg-slate-50/5 transition-all ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
                  >
                    <span className="text-slate-500 font-bold text-sm">{profile.resumeText ? 'Resume Loaded ✓' : 'Click to Upload Resume'}</span>
                  </div>
                </div>
                <div>
                   <label className={`block text-xs font-black uppercase tracking-widest ${labelClass} mb-1`}>Tech Stack</label>
                   <input type="text" className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none ${inputClass}`} value={profile.techStack} onChange={e => setProfile({...profile, techStack: e.target.value})} placeholder="e.g. React, Node.js, AWS" />
                </div>
              </div>
              <div className="space-y-4">
                <label className={`block text-xs font-black uppercase tracking-widest ${labelClass}`}>Job Description (Optional)</label>
                <textarea className={`w-full px-4 py-3 rounded-xl h-[230px] resize-none border focus:ring-2 focus:ring-blue-600 outline-none ${inputClass}`} placeholder="Paste the Job Description to tailor the interview depth and context..." value={profile.jobDescription} onChange={e => setProfile({...profile, jobDescription: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1">
            <h3 className={`text-xl font-bold ${headingClass}`}>3. Persona & Voice Options</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PERSONAS.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProfile({ ...profile, interviewerPersonaId: p.id })}
                  className={`p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all text-center flex flex-col items-center gap-3 ${
                    profile.interviewerPersonaId === p.id ? 'border-blue-600 bg-blue-50/10' : (theme === 'dark' ? 'border-slate-800' : 'border-slate-100')
                  }`}
                >
                  <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-full border border-slate-200 shadow-sm" />
                  <div>
                    <div className={`text-[10px] font-black ${headingClass}`}>{p.name}</div>
                    <div className="text-[7px] font-bold text-blue-600 uppercase tracking-widest">{p.style.split(' ')[0]}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className={`block text-xs font-black uppercase tracking-widest ${labelClass} mb-2`}>Round Type</label>
                  <select className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none ${inputClass}`} value={profile.roundType} onChange={e => setProfile({...profile, roundType: e.target.value as RoundType})}>
                    {Object.values(RoundType).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest ${labelClass} mb-2`}>Language Preference</label>
                  <select className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none ${inputClass}`} value={profile.preferredLanguage} onChange={e => setProfile({...profile, preferredLanguage: e.target.value})}>
                    <option>English (Neutral)</option>
                    <option>English (Indian)</option>
                    <option>English (US)</option>
                    <option>Hindi</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest ${labelClass} mb-2`}>Difficulty Engine</label>
                  <div className={`w-full px-4 py-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-[10px] text-green-500 uppercase tracking-widest ${inputClass}`}>
                    Adaptive Intelligence Active
                  </div>
                </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100/10">
          {step === 1 ? (
            <button type="button" onClick={onCancel} className="px-6 py-2 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
          ) : (
            <button type="button" onClick={() => setStep(s => s - 1)} className={`px-6 py-2 font-bold border rounded-xl transition-all ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Back</button>
          )}
          
          {step < 3 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">Next Step</button>
          ) : (
            <button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 animate-pulse transition-all active:scale-95">Start Interview</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
