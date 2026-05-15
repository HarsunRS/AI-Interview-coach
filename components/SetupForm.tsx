import React, { useRef, useState } from 'react';
import { UserProfile, InterviewMode, RoundType, ResumeProfile, JobMatch } from '../types';
import { INITIAL_USER_PROFILE, COMMON_SKILLS, COMPANIES } from '../constants';
import { interviewService } from '../services/geminiService';

interface SetupFormProps {
  onStart: (profile: UserProfile) => void;
  onCancel: () => void;
  theme: 'light' | 'dark';
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MODE_TIME_LIMITS: Record<InterviewMode, number> = {
  [InterviewMode.QUICK]: 10,
  [InterviewMode.SIMULATION]: 25,
  [InterviewMode.FULL]: 40,
};

const SCAN_STAGES = [
  'Reading resume content…',
  'Extracting projects & tech stack…',
  'Building personalised question profile…',
];

const SetupForm: React.FC<SetupFormProps> = ({ onStart, onCancel, theme }) => {
  const [profile, setProfile] = useState<UserProfile>({ ...INITIAL_USER_PROFILE, theme });
  const [step, setStep] = useState(1);
  const [customSkill, setCustomSkill] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [personaliseEnabled, setPersonaliseEnabled] = useState(false);
  const [isPersonalising, setIsPersonalising] = useState(false);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [personaliseMode, setPersonaliseMode] = useState<'full' | 'basic' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';
  const mutedPanel = isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200';

  const extractSkills = (text: string) => {
    const normalizedText = text
      .replace(/[•·|,;:/()[\]{}]/g, ' ')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();

    const aliases: Record<string, string[]> = {
      JavaScript: ['javascript', 'js', 'es6'],
      TypeScript: ['typescript', 'ts'],
      React: ['react', 'react.js', 'reactjs'],
      'Next.js': ['next.js', 'nextjs', 'next js'],
      'Node.js': ['node.js', 'nodejs', 'node js'],
      Express: ['express', 'express.js'],
      Python: ['python', 'py'],
      Django: ['django'],
      Flask: ['flask'],
      Java: ['java', 'core java', 'oops'],
      'Spring Boot': ['spring boot', 'springboot'],
      'C++': ['c++', 'cpp', 'c plus plus'],
      'C#': ['c#', 'c sharp'],
      SQL: ['sql', 'structured query language'],
      PostgreSQL: ['postgresql', 'postgres'],
      MongoDB: ['mongodb', 'mongo db', 'mongo'],
      Firebase: ['firebase', 'firestore'],
      AWS: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
      Docker: ['docker', 'containerization', 'containers'],
      Kubernetes: ['kubernetes', 'k8s'],
      Git: ['git', 'github', 'gitlab', 'version control'],
      'REST API': ['rest api', 'restful'],
      GraphQL: ['graphql', 'graph ql'],
      'Data Structures': ['data structures', 'dsa', 'algorithms'],
      'System Design': ['system design', 'scalability', 'distributed systems'],
      'Machine Learning': ['machine learning', 'ml'],
      'Deep Learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'lstm'],
      'Artificial Intelligence': ['artificial intelligence', 'ai'],
      'Natural Language Processing': ['natural language processing', 'nlp'],
      'Computer Vision': ['computer vision', 'image processing', 'opencv'],
      TensorFlow: ['tensorflow', 'tensor flow'],
      PyTorch: ['pytorch', 'torch'],
      'Scikit-learn': ['scikit learn', 'scikit-learn', 'sklearn'],
      Pandas: ['pandas', 'dataframe'],
      NumPy: ['numpy', 'np'],
      HTML: ['html', 'html5'],
      CSS: ['css', 'css3'],
      'Tailwind CSS': ['tailwind', 'tailwind css'],
      Bootstrap: ['bootstrap'],
      Redux: ['redux', 'redux toolkit'],
      MySQL: ['mysql', 'my sql'],
      Linux: ['linux', 'ubuntu', 'shell scripting', 'bash'],
      'CI/CD': ['ci cd', 'cicd', 'continuous integration', 'continuous deployment'],
      Figma: ['figma'],
      Agile: ['agile', 'scrum', 'kanban'],
    };

    return COMMON_SKILLS.filter(skill => {
      const names = aliases[skill] || [skill.toLowerCase()];
      return names.some(name => {
        const normalizedName = name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
        return new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(name)}([^a-z0-9+#.]|$)`, 'i').test(text)
          || normalizedText.includes(normalizedName);
      });
    });
  };

  const updateContext = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      const extracted = extractSkills(`${next.resumeText || ''}\n${next.jobDescription || ''}`);
      const customSkills = next.techStack.filter(skill => !COMMON_SKILLS.includes(skill));
      return { ...next, techStack: Array.from(new Set([...extracted, ...customSkills])) };
    });
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !profile.techStack.includes(trimmed)) {
      setProfile(prev => ({ ...prev, techStack: [...prev.techStack, trimmed] }));
    }
  };

  const removeSkill = (skill: string) => {
    setProfile(prev => ({ ...prev, techStack: prev.techStack.filter(item => item !== skill) }));
  };

  const runPersonalise = async (resumeText: string, jobDescription?: string, techStack?: string[]) => {
    if (!resumeText.trim()) return;
    setIsPersonalising(true);
    setResumeProfile(null);
    setPersonaliseMode(null);
    try {
      const { resumeProfile: rp, jobMatches: jm } = await interviewService.parseResumeIntelligence(
        resumeText, jobDescription, techStack,
      );
      setResumeProfile(rp);
      setProfile(prev => ({ ...prev, resumeProfile: rp, jobMatches: jm }));
      // 'basic' mode when no projects were extracted (local fallback used)
      setPersonaliseMode(rp.projects.length > 0 ? 'full' : 'basic');
    } catch (e) {
      console.error('[Personalise] All methods failed:', e);
    }
    setIsPersonalising(false);
  };

  const handlePersonaliseToggle = () => {
    const enabling = !personaliseEnabled;
    setPersonaliseEnabled(enabling);
    if (enabling) {
      if (profile.resumeText && !resumeProfile && !isPersonalising) {
        runPersonalise(profile.resumeText, profile.jobDescription, profile.techStack);
      }
    } else {
      setResumeProfile(null);
      setPersonaliseMode(null);
      setProfile(prev => ({ ...prev, resumeProfile: undefined, jobMatches: undefined }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const text = await file.text();
      const resumeText = `[FILE: ${file.name}]\n${text.substring(0, 20000)}`;
      updateContext({ resumeText });
      if (personaliseEnabled) {
        runPersonalise(resumeText, profile.jobDescription, profile.techStack);
      }
    } catch {
      alert('Failed to read file. Try a text-based resume or paste the content.');
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const modeOptions = [
    { id: InterviewMode.QUICK, time: '10 min', desc: 'Intro, one project, focused skills' },
    { id: InterviewMode.SIMULATION, time: '25 min', desc: 'Company-style mixed round' },
    { id: InterviewMode.FULL, time: '40 min', desc: 'Projects, technical depth, behavior' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Keyframes injected once */}
      <style>{`
        @keyframes scanDown {
          0%   { top: -3px; opacity: 1; }
          85%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
          50%       { box-shadow: 0 0 18px 3px rgba(59,130,246,0.18); }
        }
        @keyframes orbits {
          0%   { transform: rotate(0deg)   translateX(18px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(18px) rotate(-360deg); }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">MockMate AI</p>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Interview Setup</h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
          <span>Step {step} / 4</span>
          <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl p-6 md:p-10 shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-500`}>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Basic Information</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Set the candidate and role target.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <input className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none focus:ring-4 focus:ring-blue-600/10`} placeholder="Full name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value, avatarSeed: e.target.value || profile.avatarSeed })} />
              <input className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none focus:ring-4 focus:ring-blue-600/10`} placeholder="Email" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.experienceLevel} onChange={e => setProfile({ ...profile, experienceLevel: e.target.value })}>
                <option value="">Experience level</option>
                <option>Fresher</option>
                <option>Junior (1-2y)</option>
                <option>Mid (3-5y)</option>
                <option>Senior (5y+)</option>
              </select>
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.rolePreference} onChange={e => setProfile({ ...profile, rolePreference: e.target.value as UserProfile['rolePreference'] })}>
                <option>Overall Practice</option>
                <option>Specific Role</option>
              </select>
              {profile.rolePreference === 'Specific Role' && (
                <select className={`md:col-span-2 w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })}>
                  <option value="">Select target role</option>
                  <option>Software Development Engineer</option>
                  <option>Frontend Developer</option>
                  <option>Backend Developer</option>
                  <option>Full Stack Developer</option>
                  <option>Data Engineer</option>
                  <option>Product Manager</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Resume & Skills ── */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Resume & Skills</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Upload your resume, add the JD, and optionally enable personalised questions.</p>
            </div>

            {/* Resume + JD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Resume</label>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.pdf,.doc,.docx" className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full min-h-[180px] border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${profile.resumeText ? 'border-blue-600 bg-blue-50/10' : 'border-slate-200 hover:bg-slate-50/5'}`}
                >
                  {isUploading
                    ? <span className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    : (
                      <>
                        <svg className="text-blue-600" xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{profile.resumeText ? 'Resume loaded — click to replace' : 'Upload resume'}</span>
                        <span className="text-[10px] text-slate-400 font-bold">Text-based files extract best in browser.</span>
                      </>
                    )}
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Job Description</label>
                <textarea
                  className={`w-full h-[180px] p-5 rounded-2xl border resize-none text-xs font-bold leading-relaxed outline-none focus:ring-4 focus:ring-blue-600/10 ${inputClass}`}
                  placeholder="Paste the JD here to tune skill and role questions..."
                  value={profile.jobDescription}
                  onChange={e => updateContext({ jobDescription: e.target.value })}
                />
              </div>
            </div>

            {/* Extracted Skills */}
            <div className={`${mutedPanel} rounded-2xl border p-5`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Extracted Stack</p>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{profile.techStack.length} skills</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.techStack.length
                  ? profile.techStack.map(skill => (
                    <button key={skill} onClick={() => removeSkill(skill)} title="Remove skill" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all">{skill} ×</button>
                  ))
                  : <p className="text-xs font-bold text-slate-500">No skills extracted yet.</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <input
                  className={`flex-1 p-4 rounded-xl border ${inputClass} font-bold`}
                  placeholder="Add missing skill"
                  value={customSkill}
                  onChange={e => setCustomSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (addSkill(customSkill), setCustomSkill(''))}
                />
                <button onClick={() => { addSkill(customSkill); setCustomSkill(''); }} className="bg-blue-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest">Add</button>
              </div>
            </div>

            {/* ── Personalise Questions Toggle ── */}
            <div
              className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                personaliseEnabled
                  ? isPersonalising
                    ? 'border-blue-500/60'
                    : resumeProfile
                      ? 'border-emerald-500/40'
                      : 'border-amber-500/40'
                  : isDark ? 'border-slate-700' : 'border-slate-200'
              }`}
              style={isPersonalising ? { animation: 'borderGlow 2s ease-in-out infinite' } : undefined}
            >
              {/* Toggle header */}
              <div className={`flex items-center justify-between p-5 ${personaliseEnabled ? (isDark ? 'bg-slate-800/60' : 'bg-slate-50') : ''}`}>
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${personaliseEnabled ? 'bg-blue-600/20' : isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                    {isPersonalising ? (
                      /* Orbiting dot animation */
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        {[0, 120, 240].map(deg => (
                          <div
                            key={deg}
                            className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/80"
                            style={{
                              animation: 'orbits 1.4s linear infinite',
                              animationDelay: `${deg / 360 * -1.4}s`,
                              transformOrigin: '0 0',
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                        className={personaliseEnabled ? 'text-blue-400' : 'text-slate-400'}>
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-black transition-colors ${personaliseEnabled ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>
                      Personalise Questions
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {personaliseEnabled && resumeProfile
                        ? `AI will ask about your actual projects and ${resumeProfile.seniorityLevel.toLowerCase()} experience`
                        : 'AI reads your resume to ask about your specific projects & tech'}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={handlePersonaliseToggle}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${personaliseEnabled ? 'bg-blue-600' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${personaliseEnabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              {/* ── Body: personalising states ── */}
              {personaliseEnabled && (
                <div className={`border-t ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>

                  {/* No resume uploaded yet */}
                  {!profile.resumeText && (
                    <div className="p-5 flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <p className="text-[11px] text-amber-400 font-bold">Upload your resume above to enable personalised questions.</p>
                    </div>
                  )}

                  {/* Personalising animation */}
                  {profile.resumeText && isPersonalising && (
                    <div className="p-5 space-y-4">
                      {/* Scanning document visual */}
                      <div className={`relative h-24 rounded-xl overflow-hidden ${isDark ? 'bg-slate-900/70 border border-slate-700/50' : 'bg-slate-100 border border-slate-200'}`}>
                        {/* Moving scan line */}
                        <div
                          className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                          style={{ animation: 'scanDown 2s ease-in-out infinite' }}
                        />
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
                        {/* Fake content lines */}
                        <div className="p-4 space-y-2.5">
                          {[72, 88, 55, 80, 40].map((w, i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'} animate-pulse`}
                              style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Stage indicators */}
                      <div className="space-y-2.5">
                        {SCAN_STAGES.map((stage, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3"
                            style={{
                              animation: `fadeSlideRight 0.5s ease forwards`,
                              animationDelay: `${i * 0.55}s`,
                              opacity: 0,
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent shrink-0"
                              style={{ animation: `spin ${0.7 + i * 0.15}s linear infinite` }}
                            />
                            <p className="text-[11px] text-blue-400 font-bold">{stage}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success: full AI extraction */}
                  {profile.resumeText && !isPersonalising && resumeProfile && personaliseMode === 'full' && (
                    <div className="p-5 space-y-3 animate-in fade-in duration-500">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-400">Personalised — ready to interview</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {resumeProfile.projects.length} project{resumeProfile.projects.length !== 1 ? 's' : ''} detected · {resumeProfile.seniorityLevel} · {resumeProfile.yearsOfExperience} yr{resumeProfile.yearsOfExperience !== 1 ? 's' : ''} exp
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Will ask about</p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeProfile.projects.slice(0, 5).map((p, i) => (
                            <span key={i} className="text-[9px] font-black px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        The interviewer will reference your specific projects, decisions, and tech choices.
                      </p>
                    </div>
                  )}

                  {/* Success: basic local extraction (AI unavailable) */}
                  {profile.resumeText && !isPersonalising && resumeProfile && personaliseMode === 'basic' && (
                    <div className="p-5 space-y-3 animate-in fade-in duration-500">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-amber-400">Skill-based personalisation active</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            AI unavailable — using {profile.techStack.length} extracted skills · {resumeProfile.seniorityLevel}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.techStack.slice(0, 6).map((s, i) => (
                          <span key={i} className="text-[9px] font-black px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">{s}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] text-slate-500 font-medium">Questions will focus on your skill set. Add your API key in Settings for full project-level personalisation.</p>
                        <button
                          onClick={() => runPersonalise(profile.resumeText, profile.jobDescription, profile.techStack)}
                          className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Session Format ── */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Session Format</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">The interviewer will begin with introduction, then projects, skills, technical depth, and behavioral questions.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modeOptions.map(mode => (
                <button key={mode.id} onClick={() => setProfile({ ...profile, interviewMode: mode.id, timeLimit: MODE_TIME_LIMITS[mode.id] })} className={`p-5 rounded-2xl border-2 text-left transition-all ${profile.interviewMode === mode.id ? 'border-blue-600 bg-blue-50/10 text-blue-600' : 'border-slate-100 opacity-70'}`}>
                  <p className="font-black text-sm uppercase tracking-tight">{mode.id}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">{mode.time}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{mode.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.roundType} onChange={e => setProfile({ ...profile, roundType: e.target.value as RoundType })}>
                <option>{RoundType.TECHNICAL}</option>
                <option>{RoundType.MIXED}</option>
                <option>{RoundType.HR}</option>
              </select>
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.interviewGoal} onChange={e => setProfile({ ...profile, interviewGoal: e.target.value as UserProfile['interviewGoal'] })}>
                <option>Check my preparation</option>
                <option>Prepare for a specific company</option>
                <option>Improve communication & confidence</option>
              </select>
              {profile.interviewGoal === 'Prepare for a specific company' && (
                <select className={`md:col-span-2 w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.targetCompany} onChange={e => setProfile({ ...profile, targetCompany: e.target.value })}>
                  <option value="">Select company</option>
                  {COMPANIES.map(company => <option key={company}>{company}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm & Launch ── */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Ready to Launch</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Your interview will use the ordered flow and extracted skill focus.</p>
            </div>
            <div className={`${mutedPanel} rounded-2xl border p-6 space-y-4`}>
              {[
                ['Candidate', profile.name || 'Not provided'],
                ['Format', `${profile.interviewMode} / ${profile.roundType}`],
                ['Role', profile.role || profile.rolePreference],
                ['Skills', profile.techStack.length ? profile.techStack.join(', ') : 'No skills extracted yet'],
                ...(resumeProfile ? [['Personalised', `${resumeProfile.projects.length} projects · ${resumeProfile.seniorityLevel}`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/20 pb-4 last:border-0 last:pb-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                  <span className={`text-sm font-black ${label === 'Personalised' ? 'text-emerald-400' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-10 pt-6 border-t border-slate-100/20 flex justify-between items-center">
          <button onClick={step === 1 ? onCancel : prevStep} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Back</button>
          <button
            onClick={step === 4 ? () => onStart(profile) : nextStep}
            disabled={step === 1 && !profile.name.trim()}
            className={`${step === 4 ? 'bg-emerald-500' : 'bg-blue-600'} text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-30`}
          >
            {step === 4 ? 'Launch Interview' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
