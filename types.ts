
export enum InterviewMode {
  QUICK = 'Quick Mock',
  FULL = 'Full Mock',
  SIMULATION = 'Company Simulation'
}

export enum RoundType {
  TECHNICAL = 'Technical',
  HR = 'HR / Behavioral',
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
  email: string;
  role: string;
  avatarSeed: string;
  techStack: string[];
  experienceLevel: string;
  resumeText: string;
  jobDescription?: string;
  interviewMode: InterviewMode;
  roundType: RoundType;
  interviewerPersonaId: string;
  preferredLanguage: string;
  timeLimit: number;
  theme: 'light' | 'dark';
  rolePreference: 'Specific Role' | 'Overall Practice';
  interviewGoal: 'Check my preparation' | 'Prepare for a specific company' | 'Improve communication & confidence';
  targetCompany?: string;
}

export interface QuestionEvaluation {
  questionText: string;
  userAnswer: string;
  idealAnswer: string;
  type: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  correctness: number; 
  duration: string;
  tag: 'Excellent' | 'Partial' | 'Weak';
  feedback: {
    whatWentWell: string[];
    areasToImprove: string[];
  };
  interviewerNotes: string;
  pronunciationFeedback?: string;
}

export interface Report {
  summary: string;
  overallScore: number;
  label: 'Beginner' | 'Intermediate' | 'Interview Ready' | 'Strong';
  duration: string;
  metrics: {
    technicalAccuracy: number;
    communication: number;
    problemSolving: number;
    confidence: number;
    pronunciation: number;
    fluency: number;
  };
  behavioralAnalysis: {
    score: number;
    eyeContact: { score: number; percentage: string; avg: string };
    bodyLanguage: { score: number; posture: string; gestures: string };
    facialExpression: { score: number; engagement: string; nervousness: string };
    setupQuality: { score: number; lighting: string };
    energyLevel: { score: number; consistency: string };
  };
  speechAnalysis: {
    clarityScore: number;
    pace: 'Too Fast' | 'Too Slow' | 'Optimal';
    fillerWordUsage: 'High' | 'Low' | 'Moderate';
    pronunciationGaps: string[];
  };
  roadmap: {
    technical: string[];
    communication: string[];
  };
  questionBreakdown: QuestionEvaluation[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  audioData?: string;
  timeLabel: string;
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
