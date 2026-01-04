export interface TrainingSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  notes?: string;
  recordingId?: string;
}

export interface Recording {
  id: string;
  filename: string;
  date: number;
  duration: number;
  blob?: Blob; // In-memory blob for this session
  size: number;
}

export interface Goal {
  id: string;
  type: 'streak' | 'duration' | 'sessions';
  target: number;
  current: number;
  label: string;
  isCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats, sessions: TrainingSession[]) => boolean;
  unlockedAt?: number;
}

export interface AppSettings {
  userName: string;
  trainingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  enableRecording: boolean;
  inputDeviceId: string;
  outputDeviceId: string; // Note: Output device selection is limited in web browsers
  micGain: number; // 0.0 to 2.0
  trainingPlan: string;
  sessionFocus: string;
  theme: 'dark' | 'light';
  planFontSize: number;
  targetPitch: number; // Target frequency in Hz
  deleteSessionWithRecording: boolean;
  
  // Feature Toggles
  enableHistory: boolean;
  enableGoals: boolean;
  enableVisualizer: boolean;
  enableAchievements: boolean;
  enableStats: boolean;
}

export interface UserStats {
  totalSessions: number;
  totalTrainingTime: number; // seconds
  currentStreak: number;
  lastTrainingDate: number | null; // timestamp
  history: { [dateString: string]: boolean }; // YYYY-MM-DD -> trained/sick
  sickDays: { [dateString: string]: boolean };
  unlockedAchievements: string[]; // IDs of unlocked achievements
}

export enum AppState {
  IDLE = 'IDLE',
  TRAINING = 'TRAINING',
  PAUSED = 'PAUSED',
}

export interface SetupData {
  installDir: string;
  createShortcut: boolean;
  completed: boolean;
}