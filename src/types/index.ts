export type ConversationPhase =
  | "welcome"
  | "intake"
  | "major_suggestions"
  | "career_suggestions"
  | "summary";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isAudioPlaying?: boolean;
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
  type: "open" | "multiple_choice";
  options?: string[];
}

export interface RIASECScore {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
}

export interface UserProfile {
  interests: string[];
  strengths: string[];
  values: string[];
  workStyle: string[];
  responses: Record<string, string>;
  riasecScore?: RIASECScore;
}

export interface SessionState {
  phase: ConversationPhase;
  currentQuestionIndex: number;
  messages: Message[];
  userProfile: UserProfile;
  suggestedMajors: Major[];
  selectedMajor: Major | null;
  suggestedCareers: Career[];
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  isAISpeaking: boolean;
  isProcessing: boolean;
  // Selected ElevenLabs voice for TTS
  selectedVoiceId?: string | null;
}

export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  isMicAvailable: boolean;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "q1",
    question:
      "What types of hands-on activities do you enjoy? (e.g., building, fixing, working outdoors, using tools)",
    type: "open",
  },
  {
    id: "q2",
    question:
      "Do you like solving puzzles, conducting research, or analyzing data? What topics interest you most?",
    type: "open",
  },
  {
    id: "q3",
    question:
      "How do you express your creativity? (e.g., art, music, writing, design)",
    type: "open",
  },
  {
    id: "q4",
    question:
      "Do you enjoy helping, teaching, or supporting others? In what ways?",
    type: "open",
  },
  {
    id: "q5",
    question:
      "Do you like leading groups, persuading people, or taking initiative in projects?",
    type: "open",
  },
  {
    id: "q6",
    question:
      "Are you detail-oriented and enjoy organizing information, schedules, or systems?",
    type: "open",
  },
  {
    id: "q7",
    question: "What school subjects or fields do you find most engaging?",
    type: "open",
  },
  {
    id: "q8",
    question:
      "Describe your ideal work environment (e.g., outdoors, lab, studio, office, with people, independently).",
    type: "open",
  },
  {
    id: "q9",
    question:
      "What are your career aspirations or dream jobs? What do you imagine yourself doing after college?",
    type: "open",
  },
  {
    id: "q10",
    question:
      "Is there anything else about your interests, strengths, or values that you want to share?",
    type: "open",
  },
];

export const PROGRESS_PHASES = [
  { phase: "welcome", label: "Welcome", weight: 0 },
  { phase: "intake", label: "Getting to Know You", weight: 40 },
  { phase: "major_suggestions", label: "Exploring Majors", weight: 25 },
  { phase: "career_suggestions", label: "Career Paths", weight: 25 },
  { phase: "summary", label: "Your Roadmap", weight: 10 },
] as const;
