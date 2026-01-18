
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
        // In this simulated environment, we treat the text content as the resume data
        setProfile(prev => ({ 
          ...prev, 
          resumeText: `[FILENAME: ${file.name}] \n CONTENT: ${text.substring(0, 5000)}` 
        }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        alert("Failed to read file.");
      };
      // For demo, we read as text. In production we'd use a server-side PDF parser.
      reader.readAsText(file);
    }
  };

  const addSkill = (skill: string) => {
    if (skill.trim() && !profile.techStack.includes(skill.trim())) {
      setProfile({ ...profile, techStack: [...profile.techStack, skill.trim()] });
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
      {/* Navbar Brand Mockup */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
             <span className="text-white font-black">M</span>
          </div>
          <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>MockMate AI</span>
        </div>
        <div className="hidden md:flex gap-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">
           <span className="hover:text-blue-500 cursor-pointer transition-colors">Home</span>
           <span className="hover:text-blue-500 cursor-pointer transition-colors">How it Works</span>
           <span className="hover:text-blue-500 cursor-pointer transition-colors">Dashboard</span>
           <span className="hover:text-blue-500 cursor-pointer transition-colors">Pricing</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-12 flex justify-between items-center px-4">
        <span className="text-xs font-black text-slate-400 font-mono tracking-widest uppercase">Step {step} / 4</span>
        <div className="flex-1 mx-10 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>
        <span className="text-xs font-black text-slate-400 font-mono tracking-widest">{Math.round((step / 4) * 100)}%</span>
      </div>

      <div className={`${cardBg} rounded-[3rem] p-12 shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-8 duration-700`}>
        {step === 1 && (
          <div className="space-y-10">
            <div className="mb-12">
              <h2 className={`text-4xl font-black mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Basic Information</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Let's personalize your interview experience. Your background helps our AI tailor the technical depth.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Full Name</label>
                <input 
                  type="text" 
                  className={`w-full p-5 rounded-2xl border ${inputClass} focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-inner font-bold`}
                  placeholder="e.g. Alex Johnson"
                  value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Email</label>
                <input 
                  type="email" 
                  className={`w-full p-5 rounded-2xl border ${inputClass} focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-inner font-bold`}
                  placeholder="alex@example.com"
                  value={profile.email}
                  onChange={e => setProfile({...profile, email: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Experience Level</label>
                <select 
                  className={`w-full p-5 rounded-2xl border ${inputClass} focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-inner font-bold`}
                  value={profile.experienceLevel}
                  onChange={e => setProfile({...profile, experienceLevel: e.target.value})}
                >
                  <option value="">Select your experience</option>
                  <option>Fresher (New Grad)</option>
                  <option>Junior (0-2 years)</option>
                  <option>Mid-Level (3-5 years)</option>
                  <option>Senior (5+ years)</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Practice Mode</label>
                <div className="flex gap-4">
                  <button 
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-[10px] transition-all uppercase tracking-widest ${profile.rolePreference === 'Specific Role' ? 'border-blue-600 bg-blue-50/10 text-blue-600 shadow-xl shadow-blue-600/10' : 'border-slate-100 opacity-60'}`}
                    onClick={() => setProfile({...profile, rolePreference: 'Specific Role'})}
                  >
                    Specific Role
                  </button>
                  <button 
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-[10px] transition-all uppercase tracking-widest ${profile.rolePreference === 'Overall Practice' ? 'border-emerald-500 bg-emerald-400/10 text-emerald-600 shadow-xl shadow-emerald-500/10' : 'border-slate-100 opacity-60'}`}
                    onClick={() => setProfile({...profile, rolePreference: 'Overall Practice'})}
                  >
                    Overall Practice
                  </button>
                </div>
              </div>
            </div>
            {profile.rolePreference === 'Specific Role' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Target Role</label>
                <select 
                  className={`w-full p-5 rounded-2xl border ${inputClass} font-bold transition-all shadow-inner focus:ring-4 focus:ring-blue-600/10`}
                  value={profile.role}
                  onChange={e => setProfile({...profile, role: e.target.value})}
                >
                  <option value="">Select your target role</option>
                  <option>Software Development Engineer (SDE)</option>
                  <option>Frontend Architect</option>
                  <option>Backend Systems Engineer</option>
                  <option>Full Stack Developer</option>
                  <option>Data Infrastructure Engineer</option>
                  <option>Site Reliability Engineer (SRE)</option>
                  <option>QA Automation Lead</option>
                  <option>Technical Product Manager</option>
                </select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10">
            <div className="mb-12">
              <h2 className={`text-4xl font-black mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Skills & Goals</h2>
              <p className="text-slate-500 text-sm font-medium">Select your tech stack and interview objectives.</p>
            </div>
            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Core Tech Stack</label>
              <div className="flex flex-wrap gap-3">
                {COMMON_SKILLS.map(skill => (
                  <button 
                    key={skill}
                    onClick={() => profile.techStack.includes(skill) ? removeSkill(skill) : addSkill(skill)}
                    className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border-2 transition-all ${profile.techStack.includes(skill) ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-600/40 scale-105' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <input 
                  className={`flex-1 p-5 rounded-2xl border ${inputClass} font-bold text-sm shadow-inner`}
                  placeholder="Enter a specific technology..."
                  value={customSkill}
                  onChange={e => setCustomSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (addSkill(customSkill), setCustomSkill(''))}
                />
                <button 
                  onClick={() => { addSkill(customSkill); setCustomSkill(''); }}
                  className="bg-blue-600 text-white px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
                >
                  + Add Skill
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Interview Goal</label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'Check my preparation', desc: 'Holistic assessment across data structures, logic, and systems.' },
                  { id: 'Prepare for a specific company', desc: 'Focus on known interview patterns and cultural fit.' },
                  { id: 'Improve communication & confidence', desc: 'Emphasis on articulation, STAR method, and soft skills.' }
                ].map(goal => (
                  <button 
                    key={goal.id}
                    onClick={() => setProfile({...profile, interviewGoal: goal.id as any})}
                    className={`p-7 rounded-[2.5rem] border-2 text-left transition-all ${profile.interviewGoal === goal.id ? 'bg-emerald-400 border-emerald-400 text-slate-900 shadow-2xl shadow-emerald-500/20' : 'border-slate-100 hover:border-slate-200 opacity-60'}`}
                  >
                    <div className="font-black text-base uppercase tracking-tight">{goal.id}</div>
                    <div className="text-xs font-bold opacity-80 mt-1">{goal.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {profile.interviewGoal === 'Prepare for a specific company' && (
              <div className="space-y-4 animate-in zoom-in-95 duration-500">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Target Company</label>
                <select 
                  className={`w-full p-5 rounded-2xl border ${inputClass} font-bold transition-all shadow-inner focus:ring-4 focus:ring-blue-600/10`}
                  value={profile.targetCompany}
                  onChange={e => setProfile({...profile, targetCompany: e.target.value})}
                >
                  <option value="">Select company</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10">
            <div className="mb-12">
              <h2 className={`text-4xl font-black mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Session Format</h2>
              <p className="text-slate-500 text-sm font-medium">Customize the intensity and context of the interview.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { id: InterviewMode.QUICK, time: '10-15 min', desc: 'Core fundamentals check', icon: '⚡' },
                { id: InterviewMode.FULL, time: '45-60 min', desc: 'Deep-dive session', icon: '🕒' },
                { id: InterviewMode.SIMULATION, time: '30-45 min', desc: 'FAANG style bar-raiser', icon: '🏢' }
              ].map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => setProfile({...profile, interviewMode: mode.id})}
                  className={`p-10 rounded-[3rem] border-2 text-left flex flex-col gap-5 transition-all group ${profile.interviewMode === mode.id ? 'border-blue-600 bg-blue-50/10 shadow-2xl shadow-blue-600/10' : 'border-slate-100 opacity-60'}`}
                >
                  <span className="text-4xl group-hover:scale-125 transition-transform">{mode.icon}</span>
                  <div>
                    <div className="font-black text-sm uppercase tracking-tight">{mode.id}</div>
                    <div className="text-[11px] text-slate-500 font-black mt-1 uppercase tracking-widest">{mode.time}</div>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{mode.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Round Intensity</label>
              <div className="flex gap-4">
                {[RoundType.TECHNICAL, RoundType.HR, RoundType.MIXED].map(rt => (
                  <button 
                    key={rt}
                    onClick={() => setProfile({...profile, roundType: rt})}
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${profile.roundType === rt ? 'border-slate-900 bg-slate-900 text-white shadow-2xl' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {rt === RoundType.HR ? 'Behavioral focus' : rt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Context: Resume (PDF/TXT)</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf,.txt,.doc,.docx" 
                  className="hidden" 
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-12 border-2 border-dashed rounded-[3rem] text-center cursor-pointer hover:bg-slate-50/5 transition-all flex flex-col items-center gap-4 ${profile.resumeText ? 'border-blue-600 bg-blue-50/10' : 'border-slate-200'}`}
                >
                  {isUploading ? (
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="text-blue-600 text-4xl">📄</span>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{profile.resumeText ? 'Resume Synced ✓' : 'Upload Resume'}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Context: Job Description</label>
                <textarea 
                  className={`w-full p-8 rounded-[3rem] border h-[180px] resize-none text-xs font-bold leading-relaxed ${inputClass} shadow-inner focus:ring-4 focus:ring-blue-600/10 outline-none placeholder:text-slate-300`}
                  placeholder="Paste the Job Description to allow the AI to perform a detailed skill-gap analysis..."
                  value={profile.jobDescription}
                  onChange={e => setProfile({...profile, jobDescription: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-12 text-center">
            <div className="mb-12">
              <h2 className={`text-4xl font-black mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Ready to Begin?</h2>
              <p className="text-slate-500 text-sm font-medium">Our AI is processing your inputs to create a custom session.</p>
            </div>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-50/50'} p-12 rounded-[3.5rem] text-left space-y-6 border border-slate-100/10 shadow-inner`}>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidate</span>
                <span className="text-sm font-black tracking-tight">{profile.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Objective</span>
                <span className="text-sm font-black tracking-tight">{profile.interviewGoal}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tech Stack</span>
                <span className="text-sm font-black tracking-tight">{profile.techStack.length ? profile.techStack.join(', ') : 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Intensity</span>
                <span className="text-sm font-black tracking-tight">{profile.interviewMode} • {profile.roundType}</span>
              </div>
            </div>
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
              System Check: Microphone and Camera calibrated. Ensure you are in a quiet environment.
            </div>
          </div>
        )}

        <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between items-center">
          <button 
            onClick={step === 1 ? onCancel : prevStep}
            className="text-xs font-black text-slate-400 hover:text-slate-600 flex items-center gap-4 uppercase tracking-[0.2em] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Go Back
          </button>
          
          <button 
            onClick={step === 4 ? () => onStart(profile) : nextStep}
            disabled={step === 1 && (!profile.name || !profile.email)}
            className={`${step === 4 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-blue-600 shadow-blue-600/30'} text-white px-16 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-30`}
          >
            {step === 4 ? 'Launch Session' : 'Continue'}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
