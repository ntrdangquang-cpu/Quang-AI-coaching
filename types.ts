export enum CoachMode {
  PRONUNCIATION = 'Pronunciation Drill',
  ROLEPLAY = 'Roleplay Scenario',
  FREE_TALK = 'Free Conversation',
}

export enum RoleplayScenario {
  RESTAURANT = 'Ordering Food',
  DIRECTIONS = 'Asking Directions',
  INTERVIEW = 'Job Interview',
  NONE = 'None'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isComplete: boolean;
  timestamp: Date;
}

export interface FeedbackItem {
  original: string;
  corrected: string;
  explanation: string;
}

export interface MiniLesson {
  title: string;
  description: string;
  example: string;
}

export interface SessionReport {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  corrections: FeedbackItem[];
  // New analysis fields
  speakingPace: 'Too Slow' | 'Good' | 'Too Fast';
  intonationScore: number; // 1-10
  pronunciationFocus: string[]; // e.g., ["th sound", "r sound"]
  miniLessons: MiniLesson[];
}

export type LiveConfig = {
  mode: CoachMode;
  scenario?: RoleplayScenario;
  voiceName: string;
};