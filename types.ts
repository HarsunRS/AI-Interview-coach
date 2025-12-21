
export enum InterviewMode {
  QUICK = 'Quick Practice',
  FULL = 'Full Mock',
  SIMULATION = 'Company Simulation'
}

export enum RoundType {
  TECHNICAL = 'Technical',
  HR = 'HR',
  BEHAVIORAL = 'Behavioral',
  SYSTEM_DESIGN = 'System Design',
  MANAGERIAL = 'Managerial',
  MIXED = 'Mixed'
}

export interface InterviewerPersona {
  id: string;
  name: string;
  role: string;
  style: string;
  description: string;
  avatar: string;
  voice: 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';
}

export interface UserAccount {
  email: string;
  password?: string;
  name: string;
  profile: UserProfile;
  history: InterviewHistoryItem[];
}

export interface UserProfile {
  name: string;
  role: string;
  avatarSeed: string;
  techStack: string;
  experienceLevel: string;
  resumeText: string;
  jobDescription?: string;
  interviewMode: InterviewMode;
  roundType: RoundType;
  interviewerPersonaId: string;
  preferredLanguage: string;
  voiceAccent: string;
  timeLimit: number;
  theme: 'light' | 'dark';
}

export interface QuestionEvaluation {
  questionText: string;
  userAnswer: string;
  idealAnswer: string;
  type: string;
  correctness: number; 
  depth: number; 
  clarity: number; 
  structure: number; 
  tag: 'Excellent' | 'Partial' | 'Weak';
  feedback: string;
}

export interface Report {
  summary: string;
  overallScore: number;
  label: 'Beginner' | 'Intermediate' | 'Interview Ready' | 'Strong';
  skillScores: { name: string; score: number }[];
  communication: {
    fluency: number;
    clarity: number;
    fillerWordsCount: number;
    grammarScore: number;
    pronunciationScore: number;
    pronunciationFeedback: string;
  };
  behavioral: {
    confidence: number;
    ownership: number;
    leadership: number;
  };
  proctoringLogs: string[];
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string[];
  recommendedPractice: string[];
  questionBreakdown: QuestionEvaluation[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  audioData?: string;
}

export interface InterviewHistoryItem {
  id: string;
  date: string;
  mode: string;
  roundType: string;
  score: number;
  status: string;
  report?: Report;
}
