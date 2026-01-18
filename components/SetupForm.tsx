
import React, { useState, useRef } from 'react';
import { UserProfile, InterviewMode, RoundType } from '../types';
import { INITIAL_USER_PROFILE, COMMON_SKILLS, COMPANIES } from '../constants';

interface SetupFormProps {
  onStart: (profile: UserProfile) => void;
  onCancel: () => void;
  theme: 'light' | 'dark';
}

const SetupForm: React.FC<SetupFormProps> = ({ onStart, onCancel, theme }) => {
  const [profile, setProfile] = useState<UserProfile>({ ...INITIAL_USER_PROFILE, theme });
  const [step, setStep] = useState(1);
  const [customSkill, setCustomSkill] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        // Store filename and content for context
        setProfile(prev => ({ 
          ...prev, 
          resumeText: `[FILE: ${file.name}] \n ${text.substring(0, 5000)}` 
        }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        alert("Failed to read file.");
      };
      reader.readAsText(file);
    }
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !profile.techStack.includes(trimmed)) {
      setProfile({ ...profile, techStack: [...profile.techStack, trimmed] });
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, techStack: profile.techStack.filter(s => s !== skill) });
  };

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
             <span className="text-white font-black">M</span>
          </div>
          <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>MockMate AI</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
           <span>Step {step} / 4</span>
           <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden">
             <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${(step / 4) * 100}%` }}></div>
           </div>
           <span>{Math.round((step / 4) * 100)}%</span>
        </div>
      </div>

      <div className={`${cardBg} rounded-[3rem] p-12 shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-8 duration-700`}>
        {step === 1 && (
          <div className="space-y-10">
            <div className="mb-10">
              <h2 className={`text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Basic Information</h2>
              <p className="text-slate-500 text-sm font-medium">Let's personalize your interview experience</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Full Name</label>
                <input 
                  type="text" 
                  className={`w-full p-5 rounded-2xl border ${inputClass} font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all`}
                  placeholder="John Doe"
                  value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Email</label>
                <input 
                  type="email" 
                  className={`w-full p-5 rounded-2xl border ${inputClass} font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all`}
                  placeholder="john@example.com"
                  value={profile.email}
                  onChange={e => setProfile({...profile, email: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Experience</label>
                <select 
                  className={`w-full p-5 rounded-2xl border ${inputClass} font-bold outline-none`}
                  value={profile.experienceLevel}
                  onChange={e => setProfile({...profile, experienceLevel: e.target.value})}
                >
                  <option value="">Select your experience</option>
                  <option>Fresher</option>
                  <option>Junior (1-2y)</option>
                  <option>Mid (3-5y)</option>
                  <option>Senior (5y+)</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Practice Mode</label>
                <div className="flex gap-4">
                  <button 
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${profile.rolePreference === 'Specific Role' ? 'border-blue-600 bg-blue-50/10 text-blue-600 shadow-xl shadow-blue-600/10' : 'border-slate-100 opacity-60'}`}
                    onClick={() => setProfile({...profile, rolePreference: 'Specific Role'})}
                  >
                    Specific Role
                  </button>
                  <button 
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${profile.rolePreference === 'Overall Practice' ? 'border-emerald-500 bg-emerald-400/10 text-emerald-600 shadow-xl shadow-emerald-500/10' : 'border-slate-100 opacity-60'}`}
                    onClick={() => setProfile({...profile, rolePreference: 'Overall Practice'})}
                  >
                    Overall
                  </button>
                </div>
              </div>
            </div>
            {profile.rolePreference === 'Specific Role' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Target Role</label>
                <select className={`w-full p-5 rounded-2xl border ${inputClass} font-bold`} value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})}>
                  <option value="">Select Role...</option>
                  <option>Software Development Engineer</option>
                  <option>Frontend Developer</option>
                  <option>Backend Developer</option>
                  <option>Full Stack Developer</option>
                  <option>Data Engineer</option>
                  <option>Product Manager</option>
                </select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10">
            <div className="mb-10">
              <h2 className={`text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Skills & Goals</h2>
              <p className="text-slate-500 text-sm font-medium">Select your tech stack and session objectives</p>
            </div>
            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Technical Stack</label>
              <div className="flex flex-wrap gap-3">
                {COMMON_SKILLS.map(skill => (
                  <button 
                    key={skill}
                    onClick={() => profile.techStack.includes(skill) ? removeSkill(skill) : addSkill(skill)}
                    className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border-2 transition-all ${profile.techStack.includes(skill) ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-600/30' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <input 
                  className={`flex-1 p-5 rounded-2xl border ${inputClass} font-bold`}
                  placeholder="Add custom skill..."
                  value={customSkill}
                  onChange={e => setCustomSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (addSkill(customSkill), setCustomSkill(''))}
                />
                <button onClick={() => { addSkill(customSkill); setCustomSkill(''); }} className="bg-blue-600 text-white px-10 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Add</button>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Interview Goal</label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'Check my preparation', desc: 'Holistic assessment of your current interview readiness' },
                  { id: 'Prepare for a specific company', desc: 'Practice patterns common at top tech firms' },
                  { id: 'Improve communication & confidence', desc: 'Focus on delivery, STAR method, and soft skills' }
                ].map(goal => (
                  <button 
                    key={goal.id}
                    onClick={() => setProfile({...profile, interviewGoal: goal.id as any})}
                    className={`p-7 rounded-[2.5rem] border-2 text-left transition-all ${profile.interviewGoal === goal.id ? 'bg-emerald-400 border-emerald-400 text-slate-900 shadow-2xl shadow-emerald-500/20' : 'border-slate-100 hover:border-slate-200 opacity-60'}`}
                  >
                    <div className="font-black text-sm uppercase tracking-tight">{goal.id}</div>
                    <div className="text-xs font-bold opacity-70 mt-1">{goal.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {profile.interviewGoal === 'Prepare for a specific company' && (
              <div className="animate-in zoom-in-95 duration-500 space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Target Company</label>
                <select className={`w-full p-5 rounded-2xl border ${inputClass} font-bold`} value={profile.targetCompany} onChange={e => setProfile({...profile, targetCompany: e.target.value})}>
                  <option value="">Select Company...</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10">
            <div className="mb-10">
              <h2 className={`text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Session Format</h2>
              <p className="text-slate-500 text-sm font-medium">Customize the intensity of your practice</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: InterviewMode.QUICK, time: '10-15 min', desc: 'Rapid-fire fundamentals', icon: '⚡' },
                { id: InterviewMode.FULL, time: '45-60 min', desc: 'Deep-dive session', icon: '🕒' },
                { id: InterviewMode.SIMULATION, time: '30-45 min', desc: 'FAANG bar-raiser simulation', icon: '🏢' }
              ].map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => setProfile({...profile, interviewMode: mode.id})}
                  className={`p-8 rounded-[2.5rem] border-2 text-left flex flex-col gap-4 transition-all ${profile.interviewMode === mode.id ? 'border-blue-600 bg-blue-50/10' : 'border-slate-100 opacity-60'}`}
                >
                  <span className="text-3xl">{mode.icon}</span>
                  <div>
                    <div className="font-black text-sm uppercase tracking-tight">{mode.id}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">{mode.time}</div>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mode.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Context: Resume (PDF/TXT)</label>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt,.doc" className="hidden" />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-12 border-2 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all flex flex-col items-center gap-3 ${profile.resumeText ? 'border-blue-600 bg-blue-50/10' : 'border-slate-200 hover:bg-slate-50/5'}`}
                >
                  {isUploading ? <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : (
                    <>
                      <span className="text-blue-600 text-3xl">📄</span>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{profile.resumeText ? 'Resume Loaded ✓' : 'Click to Upload Resume'}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Context: Job Description</label>
                <textarea 
                  className={`w-full p-8 rounded-[2.5rem] border h-[180px] resize-none text-xs font-bold leading-relaxed shadow-inner outline-none focus:ring-4 focus:ring-blue-600/10 ${inputClass}`}
                  placeholder="Paste the Job Description to allow the AI to perform a fit-gap analysis..."
                  value={profile.jobDescription}
                  onChange={e => setProfile({...profile, jobDescription: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-12 text-center">
            <div className="mb-10">
              <h2 className={`text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>System Ready</h2>
              <p className="text-slate-500 text-sm font-medium">Our AI is ready to facilitate your session</p>
            </div>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-50/50'} p-12 rounded-[3.5rem] text-left space-y-6 border border-slate-100/10 shadow-inner`}>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</span>
                <span className="text-sm font-black">{profile.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format</span>
                <span className="text-sm font-black">{profile.interviewMode} • {profile.roundType}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Context</span>
                <span className="text-sm font-black">{profile.resumeText ? 'Resume provided' : 'No resume'}</span>
              </div>
            </div>
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Proctoring Active: Tab switching and eye contact will be monitored for final evaluation.
            </div>
          </div>
        )}

        <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between items-center">
          <button onClick={step === 1 ? onCancel : prevStep} className="text-xs font-black text-slate-400 hover:text-slate-600 flex items-center gap-4 uppercase tracking-widest transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </button>
          
          <button 
            onClick={step === 4 ? () => onStart(profile) : nextStep}
            disabled={step === 1 && !profile.name}
            className={`${step === 4 ? 'bg-emerald-500' : 'bg-blue-600'} text-white px-16 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-30`}
          >
            {step === 4 ? 'Launch Interview' : 'Continue'}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
