
import { InterviewerPersona, InterviewMode, RoundType, InterviewHistoryItem, UserProfile } from './types';

export const PERSONAS: InterviewerPersona[] = [
  {
    id: 'aarav',
    name: 'Aarav',
    role: 'Senior Backend Architect',
    style: 'Strict & Deeply Technical',
    description: 'Aarav focuses on efficiency, scalability, and deep technical knowledge. He prefers direct answers and edge-case depth.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
    voice: 'Charon'
  },
  {
    id: 'meera',
    name: 'Meera',
    role: 'HR Director',
    style: 'Friendly & Behavioral Focus',
    description: 'Meera looks for culture fit and soft skills. She is empathetic but insightful about career trajectory.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Meera',
    voice: 'Kore'
  }
];

export const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'Data Structures'
];

export const COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Tesla', 'Uber', 'Airbnb', 'LinkedIn'
];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: '',
  email: '',
  avatarSeed: 'User',
  role: '',
  techStack: [],
  experienceLevel: '',
  resumeText: '',
  jobDescription: '',
  interviewMode: InterviewMode.QUICK,
  roundType: RoundType.TECHNICAL,
  interviewerPersonaId: 'aarav',
  preferredLanguage: 'English',
  timeLimit: 30,
  theme: 'light',
  rolePreference: 'Overall Practice',
  interviewGoal: 'Check my preparation'
};
