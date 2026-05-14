import React, { useRef, useState } from 'react';
import { UserProfile, InterviewMode, RoundType, ResumeAnalysis } from '../types';
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
  [InterviewMode.FULL]: 40
};

const SetupForm: React.FC<SetupFormProps> = ({ onStart, onCancel, theme }) => {
  const [profile, setProfile] = useState<UserProfile>({ ...INITIAL_USER_PROFILE, theme });
  const [step, setStep] = useState(1);
  const [customSkill, setCustomSkill] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
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
      'Machine Learning': ['machine learning', 'ml', 'classification', 'regression', 'supervised learning', 'unsupervised learning', 'model training'],
      'Deep Learning': ['deep learning', 'neural network', 'neural networks', 'cnn', 'rnn', 'lstm'],
      'Artificial Intelligence': ['artificial intelligence', 'ai'],
      'Natural Language Processing': ['natural language processing', 'nlp', 'text classification', 'sentiment analysis'],
      'Computer Vision': ['computer vision', 'image processing', 'opencv', 'object detection'],
      TensorFlow: ['tensorflow', 'tensor flow'],
      PyTorch: ['pytorch', 'torch'],
      'Scikit-learn': ['scikit learn', 'scikit-learn', 'sklearn'],
      Pandas: ['pandas', 'dataframe', 'dataframes'],
      NumPy: ['numpy', 'np'],
      Matplotlib: ['matplotlib', 'pyplot'],
      'Power BI': ['power bi', 'powerbi'],
      Tableau: ['tableau'],
      HTML: ['html', 'html5'],
      CSS: ['css', 'css3'],
      'Tailwind CSS': ['tailwind', 'tailwind css'],
      Bootstrap: ['bootstrap'],
      Redux: ['redux', 'redux toolkit'],
      MySQL: ['mysql', 'my sql'],
      SQLite: ['sqlite', 'sqlite3'],
      Oracle: ['oracle db', 'oracle database'],
      Linux: ['linux', 'ubuntu', 'shell scripting', 'bash'],
      Jenkins: ['jenkins'],
      'CI/CD': ['ci cd', 'cicd', 'continuous integration', 'continuous deployment'],
      Figma: ['figma'],
      Agile: ['agile', 'scrum', 'kanban']
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

  const runAnalysis = async (resumeText: string, jobDescription?: string, techStack?: string[]) => {
    if (!resumeText.trim()) return;
    setIsAnalyzing(true);
    setResumeAnalysis(null);
    try {
      const result = await interviewService.analyzeResume(resumeText, jobDescription, techStack);
      setResumeAnalysis(result);
    } catch {
      // silently fail — analysis is optional
    } finally {
      setIsAnalyzing(false);
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
      // auto-analyze on upload
      runAnalysis(resumeText, profile.jobDescription, profile.techStack);
    } catch {
      alert('Failed to read file. Try a text-based resume or paste the content into the job description box.');
    } finally {
      setIsUploading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const modeOptions = [
    { id: InterviewMode.QUICK, time: '10 min', desc: 'Intro, one project, focused skills' },
    { id: InterviewMode.SIMULATION, time: '25 min', desc: 'Company-style mixed round' },
    { id: InterviewMode.FULL, time: '40 min', desc: 'Projects, technical depth, behavior' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
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
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Basic Information</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Set the candidate and role target.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <input className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none focus:ring-4 focus:ring-blue-600/10`} placeholder="Full name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value, avatarSeed: e.target.value || profile.avatarSeed})} />
              <input className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none focus:ring-4 focus:ring-blue-600/10`} placeholder="Email" type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.experienceLevel} onChange={e => setProfile({...profile, experienceLevel: e.target.value})}>
                <option value="">Experience level</option>
                <option>Fresher</option>
                <option>Junior (1-2y)</option>
                <option>Mid (3-5y)</option>
                <option>Senior (5y+)</option>
              </select>
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.rolePreference} onChange={e => setProfile({...profile, rolePreference: e.target.value as UserProfile['rolePreference']})}>
                <option>Overall Practice</option>
                <option>Specific Role</option>
              </select>
              {profile.rolePreference === 'Specific Role' && (
                <select className={`md:col-span-2 w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})}>
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

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Resume Skills</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Skills are inferred from your resume and job description, with a manual add only for missing items.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Resume</label>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.pdf,.doc,.docx" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className={`w-full min-h-[180px] border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${profile.resumeText ? 'border-blue-600 bg-blue-50/10' : 'border-slate-200 hover:bg-slate-50/5'}`}>
                  {isUploading ? <span className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /> : (
                    <>
                      <svg className="text-blue-600" xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{profile.resumeText ? 'Resume loaded' : 'Upload resume'}</span>
                      <span className="text-[10px] text-slate-400 font-bold">Text-based files extract best in browser.</span>
                    </>
                  )}
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Job Description</label>
                <textarea className={`w-full h-[180px] p-5 rounded-2xl border resize-none text-xs font-bold leading-relaxed outline-none focus:ring-4 focus:ring-blue-600/10 ${inputClass}`} placeholder="Paste the JD here to tune skill and role questions..." value={profile.jobDescription} onChange={e => updateContext({ jobDescription: e.target.value })} />
              </div>
            </div>

            <div className={`${mutedPanel} rounded-2xl border p-5`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Extracted Stack</p>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{profile.techStack.length} skills</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.techStack.length ? profile.techStack.map(skill => (
                  <button key={skill} onClick={() => removeSkill(skill)} title="Remove skill" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all">{skill} x</button>
                )) : <p className="text-xs font-bold text-slate-500">No skills extracted yet.</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <input className={`flex-1 p-4 rounded-xl border ${inputClass} font-bold`} placeholder="Add missing skill" value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (addSkill(customSkill), setCustomSkill(''))} />
                <button onClick={() => { addSkill(customSkill); setCustomSkill(''); }} className="bg-blue-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest">Add</button>
              </div>
            </div>

            {/* ── Resume Analysis Panel ── */}
            {profile.resumeText && (
              <div className={`${mutedPanel} rounded-2xl border p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Resume Analysis</p>
                    {isAnalyzing && <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />}
                  </div>
                  <button
                    onClick={() => runAnalysis(profile.resumeText, profile.jobDescription, profile.techStack)}
                    disabled={isAnalyzing}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {isAnalyzing ? 'Analyzing...' : resumeAnalysis ? 'Re-analyze' : 'Analyze'}
                  </button>
                </div>

                {!resumeAnalysis && !isAnalyzing && (
                  <p className="text-[11px] text-slate-500 font-bold">
                    Click Analyze to get AI feedback on your resume and skill gaps.
                  </p>
                )}

                {resumeAnalysis && (
                  <div className="space-y-5 animate-in fade-in duration-500">
                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Resume Score</p>
                        <p className="text-3xl font-black text-blue-400">{resumeAnalysis.overallScore}<span className="text-sm font-bold opacity-60">%</span></p>
                        <p className="text-[9px] font-black text-blue-300/60 mt-1 uppercase tracking-widest">{resumeAnalysis.label}</p>
                      </div>
                      <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">ATS Score</p>
                        <p className="text-3xl font-black text-emerald-400">{resumeAnalysis.atsScore}<span className="text-sm font-bold opacity-60">%</span></p>
                        <p className="text-[9px] font-black text-emerald-300/60 mt-1 uppercase tracking-widest">Parsability</p>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">Strengths</p>
                        <ul className="space-y-1.5">
                          {resumeAnalysis.strengths.slice(0, 4).map((s, i) => (
                            <li key={i} className="text-[10px] text-slate-400 font-medium leading-snug">✓ {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">To Improve</p>
                        <ul className="space-y-1.5">
                          {resumeAnalysis.weaknesses.slice(0, 4).map((w, i) => (
                            <li key={i} className="text-[10px] text-slate-400 font-medium leading-snug">△ {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Skill Gaps vs JD */}
                    {resumeAnalysis.skillGaps.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-2">
                          Skill Gaps {profile.jobDescription ? '(vs JD)' : '(suggested)'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeAnalysis.skillGaps.map((gap, i) => (
                            <span key={i} className="text-[9px] font-black px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">{gap}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Tips */}
                    <div>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">Top Tips</p>
                      <ul className="space-y-1.5">
                        {resumeAnalysis.improvementTips.slice(0, 4).map((tip, i) => (
                          <li key={i} className="text-[10px] text-slate-400 font-medium leading-snug">→ {tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>Session Format</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">The interviewer will begin with introduction, then projects, skills, technical depth, and behavioral questions.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modeOptions.map(mode => (
                <button key={mode.id} onClick={() => setProfile({...profile, interviewMode: mode.id, timeLimit: MODE_TIME_LIMITS[mode.id]})} className={`p-5 rounded-2xl border-2 text-left transition-all ${profile.interviewMode === mode.id ? 'border-blue-600 bg-blue-50/10 text-blue-600' : 'border-slate-100 opacity-70'}`}>
                  <p className="font-black text-sm uppercase tracking-tight">{mode.id}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">{mode.time}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{mode.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.roundType} onChange={e => setProfile({...profile, roundType: e.target.value as RoundType})}>
                <option>{RoundType.TECHNICAL}</option>
                <option>{RoundType.MIXED}</option>
                <option>{RoundType.HR}</option>
              </select>
              <select className={`w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.interviewGoal} onChange={e => setProfile({...profile, interviewGoal: e.target.value as UserProfile['interviewGoal']})}>
                <option>Check my preparation</option>
                <option>Prepare for a specific company</option>
                <option>Improve communication & confidence</option>
              </select>
              {profile.interviewGoal === 'Prepare for a specific company' && (
                <select className={`md:col-span-2 w-full p-4 rounded-xl border ${inputClass} font-bold outline-none`} value={profile.targetCompany} onChange={e => setProfile({...profile, targetCompany: e.target.value})}>
                  <option value="">Select company</option>
                  {COMPANIES.map(company => <option key={company}>{company}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

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
                ['Skills', profile.techStack.length ? profile.techStack.join(', ') : 'No skills extracted yet']
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/20 pb-4 last:border-0 last:pb-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                  <span className="text-sm font-black">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-100/20 flex justify-between items-center">
          <button onClick={step === 1 ? onCancel : prevStep} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Back</button>
          <button onClick={step === 4 ? () => onStart(profile) : nextStep} disabled={step === 1 && !profile.name.trim()} className={`${step === 4 ? 'bg-emerald-500' : 'bg-blue-600'} text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-30`}>
            {step === 4 ? 'Launch Interview' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
