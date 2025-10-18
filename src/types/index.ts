export type ConversationPhase = 'welcome' | 'intake' | 'major_suggestions' | 'career_suggestions' | 'summary';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface Major {
  id: string;
  name: string;
  description: string;
  typical_coursework: string;
  key_skills: string[];
  personality_traits: string[];
  values_alignment: string[];
  created_at: string;
  matchScore?: number;
  matchReason?: string;
}

export interface Career {
  id: string;
  name: string;
  description: string;
  related_major_ids: string[];
  salary_range: string;
  job_outlook: string;
  required_skills: string[];
  work_environment: string;
  next_steps: string;
  created_at: string;
}

export interface IntakeQuestion {
  id: string;
  question: string;
  type: 'open' | 'multiple_choice';
  options?: string[];
}

export interface UserProfile {
  interests: string[];
  strengths: string[];
  values: string[];
  workStyle: string[];
  responses: Record<string, string>;
}

export interface SessionState {
  phase: ConversationPhase;
  currentQuestionIndex: number;
  messages: Message[];
  userProfile: UserProfile;
  suggestedMajors: Major[];
  selectedMajor: Major | null;
  suggestedCareers: Career[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isAISpeaking: boolean;
  isProcessing: boolean;
}

export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  isMicAvailable: boolean;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: 'q1',
    question: "What subjects or activities do you find yourself naturally drawn to? What could you spend hours doing without getting bored?",
    type: 'open'
  },
  {
    id: 'q2',
    question: "What are you naturally good at? What do friends and teachers often compliment you on?",
    type: 'open'
  },
  {
    id: 'q3',
    question: "When you imagine your ideal work environment, what does it look like? Do you prefer working independently, in teams, outdoors, in an office, or something else?",
    type: 'open'
  },
  {
    id: 'q4',
    question: "What matters most to you in a career? For example: helping others, creativity, solving problems, financial security, making an impact, or something else?",
    type: 'open'
  }
];

export const PROGRESS_PHASES = [
  { phase: 'welcome', label: 'Welcome', weight: 0 },
  { phase: 'intake', label: 'Getting to Know You', weight: 40 },
  { phase: 'major_suggestions', label: 'Exploring Majors', weight: 25 },
  { phase: 'career_suggestions', label: 'Career Paths', weight: 25 },
  { phase: 'summary', label: 'Your Roadmap', weight: 10 }
] as const;
