import React, { useRef, useState } from 'react';
import { ResumeAnalysis, ResumeProfile, JobMatch } from '../types';
import { interviewService } from '../services/geminiService';

interface ResumeAnalyzerProps {
  onBack: () => void;
  theme: 'light' | 'dark';
}

const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({ onBack, theme }) => {
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[] | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#020617]' : 'bg-slate-50';
  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const muted = isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputCls = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const hasResults = analysis || profile || jobMatches;
  const running = isAnalyzing || isParsing;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setResumeText(`[FILE: ${file.name}]\n${text.substring(0, 20000)}`);
      setFileName(file.name);
    } catch {
      alert('Could not read the file. Try a plain-text or PDF resume.');
    }
    e.target.value = '';
  };

  const runAll = async () => {
    if (!resumeText.trim()) return;
    setAnalysis(null);
    setProfile(null);
    setJobMatches(null);
    setExpandedMatch(null);

    setIsAnalyzing(true);
    setIsParsing(true);

    const [atsResult, intelligenceResult] = await Promise.allSettled([
      interviewService.analyzeResume(resumeText, jobDescription),
      interviewService.parseResumeIntelligence(resumeText, jobDescription),
    ]);

    if (atsResult.status === 'fulfilled') setAnalysis(atsResult.value);
    setIsAnalyzing(false);

    if (intelligenceResult.status === 'fulfilled') {
      setProfile(intelligenceResult.value.resumeProfile);
      setJobMatches(intelligenceResult.value.jobMatches);
    }
    setIsParsing(false);
  };

  const ScoreRing = ({ score, label, color }: { score: number; label: string; color: string }) => {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * score) / 100;
    return (
      <div className="flex flex-col items-center gap-2">
        <svg width="128" height="128" className="-rotate-90">
          <circle cx="64" cy="64" r={r} stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth="10" fill="none" />
          <circle cx="64" cy="64" r={r} stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute flex flex-col items-center" style={{ marginTop: -8 }}>
          <span className={`text-3xl font-black ${textPrimary}`} style={{ lineHeight: 1 }}>{score}</span>
          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">/ 100</span>
        </div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{label}</p>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 border-b ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-xl px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${textMuted} hover:text-blue-500 transition-colors`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Dashboard
          </button>
          <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">MockMate AI</p>
            <h1 className={`text-lg font-black ${textPrimary} leading-none`}>Resume Analyzer</h1>
          </div>
        </div>
        <button
          onClick={runAll}
          disabled={!resumeText.trim() || running}
          className="h-10 px-6 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          {running && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {running ? 'Analyzing...' : hasResults ? 'Re-Analyze' : 'Analyze Resume'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Input panel ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Upload */}
            <div className={`${card} border rounded-2xl p-6`}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Resume</p>
              <input type="file" ref={fileInputRef} onChange={handleFile} accept=".txt,.pdf,.doc,.docx" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-all ${resumeText ? (isDark ? 'border-blue-500/50 bg-blue-500/5' : 'border-blue-400 bg-blue-50') : (isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={resumeText ? 'text-blue-500' : 'text-slate-400'}>
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
                </svg>
                {resumeText ? (
                  <>
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">{fileName || 'Resume loaded'}</span>
                    <span className="text-[10px] text-slate-400 font-bold">Click to replace</span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Upload Resume</span>
                    <span className="text-[10px] text-slate-500 font-bold">PDF, DOC, or TXT</span>
                  </>
                )}
              </button>

              {/* Or paste */}
              {!resumeText && (
                <div className="mt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Or paste resume text</p>
                  <textarea
                    rows={6}
                    className={`w-full p-4 rounded-xl border text-xs font-medium leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-600/20 transition-all ${inputCls}`}
                    placeholder="Paste your resume content here..."
                    onChange={e => { setResumeText(e.target.value); setFileName(''); }}
                  />
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className={`${card} border rounded-2xl p-6`}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Job Description <span className="text-slate-500 normal-case tracking-normal font-bold">(optional)</span></p>
              <textarea
                rows={7}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                className={`w-full p-4 rounded-xl border text-xs font-medium leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-600/20 transition-all ${inputCls}`}
                placeholder="Paste the job description to get a tailored gap analysis and role match score..."
              />
            </div>

            {/* Tip */}
            <div className={`${muted} rounded-xl border p-4`}>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Pro Tip</p>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Add a job description to unlock targeted skill gap analysis and see exactly how well your resume matches the role.</p>
            </div>
          </div>

          {/* ── Right: Results panel ── */}
          <div className="lg:col-span-3 space-y-5">

            {!hasResults && !running && (
              <div className={`${card} border rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <p className="text-sm font-black text-slate-500">Upload your resume and click Analyze to get started</p>
                <p className="text-[10px] text-slate-600 font-bold">ATS score · Skill gaps · Project extraction · Job role matches</p>
              </div>
            )}

            {/* ATS + Resume Scores */}
            {(isAnalyzing || analysis) && (
              <div className={`${card} border rounded-2xl p-8`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Resume Scores</p>
                {isAnalyzing && !analysis ? (
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">Running ATS analysis...</span>
                  </div>
                ) : analysis && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Score rings */}
                    <div className="flex items-center justify-around gap-4">
                      <div className="relative flex flex-col items-center">
                        <ScoreRing score={analysis.overallScore} label="Resume Score" color="#3b82f6" />
                      </div>
                      <div className="relative flex flex-col items-center">
                        <ScoreRing score={analysis.atsScore} label="ATS Score" color="#10b981" />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className={`text-lg font-black px-4 py-2 rounded-2xl border ${
                          analysis.overallScore >= 80 ? (isDark ? 'bg-emerald-900/40 border-emerald-700 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                          : analysis.overallScore >= 60 ? (isDark ? 'bg-amber-900/40 border-amber-700 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                          : (isDark ? 'bg-red-900/40 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                        }`}>{analysis.label}</span>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest text-center">Readiness Label</p>
                      </div>
                    </div>

                    {/* Strengths + Weaknesses */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'}`}>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-3">Strengths</p>
                        <ul className="space-y-1.5">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className={`text-[10px] font-medium leading-snug ${isDark ? 'text-emerald-100' : 'text-emerald-800'}`}>✓ {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-950/30 border-amber-800/40' : 'bg-amber-50 border-amber-100'}`}>
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-3">To Improve</p>
                        <ul className="space-y-1.5">
                          {analysis.weaknesses.map((w, i) => (
                            <li key={i} className={`text-[10px] font-medium leading-snug ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>△ {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Skill Gaps */}
                    {analysis.skillGaps.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-3">
                          Skill Gaps {jobDescription ? '(vs Job Description)' : '(Suggested)'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.skillGaps.map((gap, i) => (
                            <span key={i} className={`text-[9px] font-black px-3 py-1.5 rounded-xl border ${isDark ? 'bg-red-950/30 border-red-800/40 text-red-400' : 'bg-red-50 border-red-100 text-red-600'}`}>{gap}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Tips */}
                    <div>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3">Actionable Tips</p>
                      <div className="space-y-2">
                        {analysis.improvementTips.map((tip, i) => (
                          <div key={i} className={`flex gap-3 p-3 rounded-xl border ${isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50 border-blue-100'}`}>
                            <span className="text-blue-400 font-black text-xs shrink-0">{i + 1}.</span>
                            <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-blue-100' : 'text-blue-800'}`}>{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resume Intelligence */}
            {(isParsing || profile) && (
              <div className={`${card} border rounded-2xl p-8`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Resume Intelligence</p>
                {isParsing && !profile ? (
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">Extracting projects, education, experience...</span>
                  </div>
                ) : profile && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Summary chips */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border ${isDark ? 'bg-blue-950/30 border-blue-800/40 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                        {profile.yearsOfExperience} yr{profile.yearsOfExperience !== 1 ? 's' : ''} experience
                      </span>
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border ${isDark ? 'bg-purple-950/30 border-purple-800/40 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                        {profile.seniorityLevel}
                      </span>
                      {profile.certifications.map((c, i) => (
                        <span key={i} className={`text-[9px] font-black px-3 py-1.5 rounded-xl border ${isDark ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>{c}</span>
                      ))}
                    </div>

                    {/* Projects */}
                    {profile.projects.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3">Extracted Projects</p>
                        <div className="space-y-3">
                          {profile.projects.map((p, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <p className={`font-black text-sm ${textPrimary}`}>{p.name}</p>
                                <div className="flex flex-wrap gap-1 justify-end shrink-0">
                                  {p.technologies.slice(0, 4).map((t, j) => (
                                    <span key={j} className={`text-[8px] font-black px-2 py-0.5 rounded-lg border ${isDark ? 'bg-blue-950/40 border-blue-800/40 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>{t}</span>
                                  ))}
                                </div>
                              </div>
                              <p className={`text-[10px] font-medium leading-relaxed ${textMuted}`}>{p.description}</p>
                              {p.impact && <p className={`text-[10px] font-bold mt-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>↗ {p.impact}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {profile.education.length > 0 && (
                      <div>
                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-3">Education</p>
                        <div className="space-y-2">
                          {profile.education.map((e, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <div>
                                <p className={`text-xs font-black ${textPrimary}`}>{e.degree} in {e.major}</p>
                                <p className={`text-[10px] font-medium ${textMuted}`}>{e.institution}</p>
                              </div>
                              <span className={`text-[10px] font-black ${textMuted} shrink-0`}>{e.year}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Job Role Matches */}
            {(isParsing || jobMatches) && (
              <div className={`${card} border rounded-2xl p-8`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Best-Fit Job Roles</p>
                {isParsing && !jobMatches ? (
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">Matching against job roles...</span>
                  </div>
                ) : jobMatches && (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    {jobMatches.map((match, i) => (
                      <div key={i} className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <button
                          onClick={() => setExpandedMatch(expandedMatch === i ? null : i)}
                          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              match.matchScore >= 75 ? 'bg-emerald-500/20 text-emerald-400' :
                              match.matchScore >= 55 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>#{i + 1}</div>
                            <div className="min-w-0">
                              <p className={`font-black text-sm ${textPrimary} truncate`}>{match.role}</p>
                              <p className={`text-[9px] font-medium ${textMuted} truncate`}>{match.whyMatch}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 rounded-full overflow-hidden bg-slate-200/20">
                                <div className={`h-full rounded-full transition-all ${match.matchScore >= 75 ? 'bg-emerald-400' : match.matchScore >= 55 ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${match.matchScore}%` }} />
                              </div>
                              <span className={`text-sm font-black w-10 text-right ${match.matchScore >= 75 ? 'text-emerald-400' : match.matchScore >= 55 ? 'text-amber-400' : 'text-slate-400'}`}>{match.matchScore}%</span>
                            </div>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedMatch === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
                          </div>
                        </button>

                        {expandedMatch === i && (
                          <div className={`px-4 pb-4 animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/30' : 'bg-slate-50/80'}`}>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div>
                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">You already have</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {match.matchedSkills.map((s, j) => (
                                    <span key={j} className={`text-[8px] font-black px-2 py-1 rounded-lg border ${isDark ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>✓ {s}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-2">Skills to add</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {match.missingSkills.map((s, j) => (
                                    <span key={j} className={`text-[8px] font-black px-2 py-1 rounded-lg border ${isDark ? 'bg-red-950/40 border-red-800/40 text-red-400' : 'bg-red-50 border-red-100 text-red-600'}`}>✗ {s}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
