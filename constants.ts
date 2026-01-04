import { AppSettings, UserStats, Achievement } from './types';

export const DEFAULT_PLAN = `(Default Plan)
Daily Plan (30-45 minutes)

1. Warm-up (5-10 minutes)
   - Diaphragmatic Breathing: 3x diaphragmatic breaths (in through the nose and out through the mouth). Breathe in to full capacity for 4 seconds, hold for 4 seconds, and breathe out for 6 seconds.
   - Light SOVTEs (Lip Trill or Straw Blowing): 3 minutes. Focus on a relaxed sound, not straining.
   - Lip Trill Explanation: To do a lip trill, gently close your lips together without pressing them tightly. Relax your cheeks. Purse your lips slightly, as if you were about to give a kiss. Then, push air through your lips, causing them to vibrate and create a "brrr" sound. The key is to keep your lips relaxed, so the air can move them freely. It's almost like making a motorboat sound.

2. Pitch Training (15-20 minutes)
   - Pitch Matching Exercise: Use a pitch tracker app (like Voice Tools on Android/iOS or Szimanski Generator on the web).
   - Goal: Aim for C4 as a starting point for pitch (look at pitch ranges in the document).
   - Method:
     - Use your pitch tracker to check the pitch of your voice.
     - Match the pitch that is shown in the program
   - Scales on SOVTEs: Use a lip trill (brrr) or a straw (see SOVTE's) while singing scales.
   - Focus: Smooth transitions between notes. Use a scale that is comfortable for you.
   - Duration: 5-10 minutes.

3. Resonance Training (10-15 minutes)
   - Big Dog/Small Dog Exercise: This is a key exercise for resonance.
   - Big Dog: Imagine panting like a large dog. This lowers the larynx and often results in a darker sound.
   - Small Dog: Imagine panting like a small dog. This raises the larynx and encourages a brighter sound. Aim for the raised larynx, more forward-placed sound of the small dog panting.
   - Focus: Feel the difference in the space inside your mouth and throat. Aim for the raised larynx, more forward-placed sound of the small dog panting.
   - Duration: 5-10 minutes.

4. Cool-down (2-3 minutes)
   - Gentle humming or lip trills at a comfortable pitch to relax your vocal cords.

Important Considerations:
- Hydration: Drink water before and after your practice. Staying hydrated is essential.
- Listen to Your Body: If you experience any pain or discomfort, STOP.
- Consistency is Key: Even 15-20 minutes of daily practice is better than a long session once a week.
- Record Yourself: Record yourself when doing these exercises.

Progression (What comes next after a few weeks):
- Vocal Weight:
  - Introduce the "Fawning" exercise. This helps thin the vocal weight. Focus on achieving a lighter, softer sound.
  - Fawning Exercise Explanation: The Fawning Exercise is about imitating the voice you have when fawning (imagining seeing a cute kitty and saying "Awww!"). It is essentially trying to make your voice sound "cuter."
  - Start by saying "aaaaaah" in a fawning voice, trying to keep your vocal cords lighter.
  - Then try saying "ah uh oh", focusing on maintaining the light vocal weight as you change the vowel sounds.
  - Finally, try saying "Pass the salt" with a fawning quality. The goal is to change the sentence to "pass it please".
- Reading Practice:
  - Once you feel more comfortable with pitch and resonance, incorporate reading practice using simple sentences like "Today I went to the park to see a balloon." (mentioned in the documents). Focus on maintaining your target pitch and resonance throughout the sentence.

Important Notes on the provided documents:
- "No voice is 'too deep' for voice feminization": This is crucial to remember. Progress is possible regardless of your starting point.
- Safety: Prioritize safety by avoiding overdoing it and paying attention to your body.
- Consistency is KEY: Just as the documents mention, keep doing the excercise everyday and record the progress.`;

export const DEFAULT_SESSION_FOCUS = "Remember to maintain good posture. Keep your shoulders relaxed and breathe from your diaphragm.\nHydrate frequently!";

export const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Vocalist',
  trainingDays: [1, 2, 3, 4, 5], // Mon-Fri
  enableRecording: true,
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  micGain: 1.0,
  trainingPlan: DEFAULT_PLAN,
  sessionFocus: DEFAULT_SESSION_FOCUS,
  theme: 'dark',
  planFontSize: 12,
  targetPitch: 261, // Middle C (C4)
  deleteSessionWithRecording: false,
  
  // Feature Defaults
  enableHistory: true,
  enableGoals: true,
  enableVisualizer: true,
  enableAchievements: true,
  enableStats: true,
};

export const INITIAL_STATS: UserStats = {
  totalSessions: 0,
  totalTrainingTime: 0,
  currentStreak: 0,
  lastTrainingDate: null,
  history: {},
  sickDays: {},
  unlockedAchievements: []
};

export const STORAGE_KEYS = {
  SETTINGS: 'voicestride_settings',
  STATS: 'voicestride_stats',
  RECORDINGS: 'voicestride_recordings_meta',
  SESSIONS: 'voicestride_sessions',
  GOALS: 'voicestride_goals',
  SETUP: 'voicestride_setup',
};



export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Complete your first training session.',
    icon: 'Kv',
    condition: (stats) => stats.totalSessions >= 1
  },
  {
    id: 'consistency_week',
    title: 'Consistent',
    description: 'Reach a 7-day streak.',
    icon: 'Fe',
    condition: (stats) => stats.currentStreak >= 7
  },
  {
    id: 'marathoner',
    title: 'Marathoner',
    description: 'Accumulate 10 hours of total practice.',
    icon: 'Au',
    condition: (stats) => stats.totalTrainingTime >= 36000
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Complete 50 sessions.',
    icon: 'Zr',
    condition: (stats) => stats.totalSessions >= 50
  }
];