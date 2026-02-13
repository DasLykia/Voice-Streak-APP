
export interface PitchDataPoint {
  time: number;
  pitch: number;
}

export interface ExerciseBlock {
  id: string;
  title: string;
  duration: number; // in seconds
  description: string;
}

export interface Routine {
  id: string;
  name: string;
  blocks: ExerciseBlock[];
}

export interface VocalHealthLog {
  effort: number; // 1-10
  clarity: number; // 1-5
  notes?: string;
}

export interface TrainingSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  notes?: string;
  recordingId?: string;
  pitchData?: PitchDataPoint[];
  targetPitch?: number;
  healthLog?: VocalHealthLog; 
  routineUsed?: string; 
  mode?: 'structured' | 'simple';
}

export interface Recording {
  id: string;
  filename: string;
  date: number;
  duration: number;
  blob?: Blob;
  size: number;
  pitchData?: PitchDataPoint[];
  targetPitch?: number;
}

export interface Goal {
  id: string;
  type: 'streak' | 'duration' | 'sessions';
  target: number;
  current: number;
  startValue: number; // Snapshot of the stat when goal was created
  label: string;
  isCompleted: boolean;
  completedAt?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats, sessions: TrainingSession[]) => boolean;
  unlockedAt?: number;
}

export type ColorTheme = 'violet' | 'emerald' | 'rose' | 'amber' | 'blue' | 'midnight' | 'neon' | 'custom';

export interface AppSettings {
  userName: string;
  trainingDays: number[];
  enableRecording: boolean;
  inputDeviceId: string;
  outputDeviceId: string;
  micGain: number;
  
  // Routine / Plan Settings
  planMode: 'structured' | 'simple';
  currentRoutine: Routine; 
  simplePlanText: string; 
  
  sessionFocus: string;
  
  // Appearance
  theme: 'dark' | 'light';
  colorTheme: ColorTheme; 
  customColors?: { primary: string; secondary: string }; // For Grand Master
  planFontSize: number;
  
  targetPitch: number;
  deleteSessionWithRecording: boolean;
  checkUpdatesOnStartup: boolean;
  retainAnalytics: boolean;
  
  // Progression
  disableLeveling: boolean; // "Unlock All" mode

  // Audio Feedback
  beepVolume: number; // 0.0 to 1.0
  skipPreflight: boolean;

  // Feature Toggles
  enableHistory: boolean;
  enableGoals: boolean;
  enableVisualizer: boolean;
  enableAchievements: boolean;
  enableStats: boolean;
}

export interface UserStats {
  totalSessions: number;
  totalTrainingTime: number;
  currentStreak: number;
  lastTrainingDate: number | null;
  history: { [dateString: string]: number }; // Date -> Duration
  sessionCounts: { [dateString: string]: number }; // Date -> Count
  healthTrends: { date: number; effort: number; duration: number }[]; // Persistent health data
  sickDays: { [dateString: string]: boolean };
  unlockedAchievements: string[];
  goalHistory: Goal[];
  xp: number; 
  level: number; 
}

export enum AppState {
  IDLE = 'IDLE',
  PRE_FLIGHT = 'PRE_FLIGHT',
  TRAINING = 'TRAINING',
  POST_SESSION = 'POST_SESSION',
  PAUSED = 'PAUSED',
}

export interface SetupData {
  installDir: string;
  createShortcut: boolean;
  completed: boolean;
}

export interface LevelReward {
  level: number;
  type: 'theme' | 'feature' | 'badge';
  label: string;
  value?: string; // e.g. theme id
  description: string;
}
