
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
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express',
  'Python', 'Django', 'Flask', 'Java', 'Spring Boot', 'C++', 'C#',
  'SQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'AWS', 'Docker',
  'Kubernetes', 'Git', 'REST API', 'GraphQL', 'Data Structures',
  'System Design', 'Machine Learning', 'Deep Learning', 'Artificial Intelligence',
  'Natural Language Processing', 'Computer Vision', 'TensorFlow', 'PyTorch',
  'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Power BI', 'Tableau',
  'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'Redux', 'MySQL', 'SQLite',
  'Oracle', 'Linux', 'Jenkins', 'CI/CD', 'Figma', 'Agile'
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
  timeLimit: 10,
  theme: 'light',
  rolePreference: 'Overall Practice',
  interviewGoal: 'Check my preparation'
};
