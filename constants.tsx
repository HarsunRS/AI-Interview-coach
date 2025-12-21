
import { InterviewerPersona, InterviewMode, RoundType, InterviewHistoryItem } from './types';

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
  },
  {
    id: 'karan',
    name: 'Karan',
    role: 'Engineering Manager',
    style: 'Pragmatic & Managerial',
    description: 'Karan bridges the gap between technical depth and business value. He values problem-solving and collaboration.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan',
    voice: 'Zephyr'
  },
  {
    id: 'elara',
    name: 'Elara',
    role: 'Product Specialist',
    style: 'Creative & Visionary',
    description: 'Elara focuses on user-centric design, product-market fit, and high-level strategy.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elara',
    voice: 'Puck'
  },
  {
    id: 'victor',
    name: 'Victor',
    role: 'System Architect',
    style: 'Methodical & Complex',
    description: 'Victor tests your ability to design robust distributed systems and handle massive scale.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victor',
    voice: 'Fenrir'
  }
];

export const MOCK_HISTORY: InterviewHistoryItem[] = [];

export const INITIAL_USER_PROFILE = {
  name: '',
  avatarSeed: 'User',
  role: '',
  techStack: '',
  experienceLevel: 'Junior (0-2 years)',
  resumeText: '',
  jobDescription: '',
  interviewMode: InterviewMode.QUICK,
  roundType: RoundType.MIXED,
  interviewerPersonaId: 'aarav',
  preferredLanguage: 'English',
  voiceAccent: 'Neutral',
  timeLimit: 30,
  theme: 'light' as const
};
