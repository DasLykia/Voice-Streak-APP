import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  HelpCircle, 
  Mic, 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  Activity, 
  FolderOpen,
  ThermometerSnowflake,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Trash2,
  BarChart2,
  Moon,
  Sun,
  History,
  Target
} from 'lucide-react';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { StatsPanel } from './components/StatsPanel';
import { RecordingsManager } from './components/RecordingsManager';
import { PlanEditor } from './components/PlanEditor';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { PitchTracker } from './components/PitchTracker';
import { SessionHistory } from './components/SessionHistory';
import { GoalsWidget } from './components/GoalsWidget';
import { AchievementsWidget } from './components/AchievementsWidget';
import { CustomCalendar } from './components/CustomCalendar';
import { 
  AppSettings, 
  AppState, 
  Recording, 
  UserStats,
  TrainingSession,
  Goal,
  Achievement
} from './types';
import { 
  DEFAULT_SETTINGS, 
  DEFAULT_SESSION_FOCUS,
  INITIAL_STATS, 
  STORAGE_KEYS,
  ACHIEVEMENTS_LIST
} from './constants';
import { 
  loadFromStorage, 
  saveToStorage, 
  saveAudioBlob, 
  deleteAudioBlob 
} from './services/storage';
import { audioService, AudioService } from './services/audio';
import { calculateStreaks } from './services/stats';

// --- STYLES INJECTION ---
const GlobalStyles = ({ theme }: { theme: 'light' | 'dark' }) => (
  <style>{`
    :root {
      --bg-app: ${theme === 'dark' ? '#0f172a' : '#f1f5f9'};
      --bg-surface: ${theme === 'dark' ? '#1e293b' : '#ffffff'};
      --text-main: ${theme === 'dark' ? '#f8fafc' : '#0f172a'};
      --text-muted: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
      --col-primary: ${theme === 'dark' ? '#6366f1' : '#4f46e5'};
      --col-primary-hover: ${theme === 'dark' ? '#4f46e5' : '#4338ca'};
      --col-secondary: ${theme === 'dark' ? '#10b981' : '#059669'};
      --col-danger: ${theme === 'dark' ? '#ef4444' : '#dc2626'};
    }
    body {
      background-image: ${theme === 'dark' 
        ? 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.03) 0%, transparent 20%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 20%)'
        : 'radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.03) 0%, transparent 20%), radial-gradient(circle at 90% 80%, rgba(5, 150, 105, 0.03) 0%, transparent 20%)'
      };
    }
  `}</style>
);

// Helper for consistent date keys (YYYY-MM-DD Local)
const getLocalISODate = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper component for Settings
const SettingsForm: React.FC<{ settings: AppSettings; onSave: (s: AppSettings) => void; onReset: () => void }> = ({ settings, onSave, onReset }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const ORDERED_DAYS = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
    { id: 6, label: 'Saturday' },
    { id: 0, label: 'Sunday' },
  ];

  useEffect(() => {
    audioService.initialize().then(() => { 
        AudioService.getDevices().then(setDevices);
    }).catch(() => {});
  }, []);

  const toggleDay = (dayId: number) => {
    const current = localSettings.trainingDays;
    const next = current.includes(dayId) 
      ? current.filter(d => d !== dayId)
      : [...current, dayId].sort();
    setLocalSettings({ ...localSettings, trainingDays: next });
  };

  const toggleFeature = (key: keyof AppSettings) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8">
      {/* Appearance Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4 border-b border-text-muted/10 pb-2">Appearance</h3>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLocalSettings({...localSettings, theme: 'light'})}
            className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${localSettings.theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface text-text-muted hover:bg-black/5'}`}
          >
            <Sun size={24} />
            <span className="font-medium text-sm">Light Mode</span>
          </button>
          <button 
            onClick={() => setLocalSettings({...localSettings, theme: 'dark'})}
            className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${localSettings.theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface text-text-muted hover:bg-black/5'}`}
          >
            <Moon size={24} />
            <span className="font-medium text-sm">Dark Mode</span>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4 border-b border-text-muted/10 pb-2">Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'enableHistory', label: 'Training History' },
            { key: 'enableGoals', label: 'Goals & Milestones' },
            { key: 'enableVisualizer', label: 'Live Waveform' },
            { key: 'enableAchievements', label: 'Achievements' },
            { key: 'enableStats', label: 'Statistics' },
          ].map(feat => (
            <label key={feat.key} className="flex items-center justify-between p-3 bg-surface rounded-lg cursor-pointer border border-transparent hover:border-white/5">
              <span className="text-sm font-medium">{feat.label}</span>
              <input 
                type="checkbox" 
                checked={!!localSettings[feat.key as keyof AppSettings]} 
                onChange={() => toggleFeature(feat.key as keyof AppSettings)}
                className="accent-primary w-4 h-4"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Audio Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 border-b border-text-muted/10 pb-2">Audio Setup</h3>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-muted">Input Device</label>
          <select 
            className="w-full bg-surface border border-text-muted/20 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none transition-shadow"
            value={localSettings.inputDeviceId}
            onChange={(e) => setLocalSettings({...localSettings, inputDeviceId: e.target.value})}
          >
            <option value="default">Default System Input</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0,5)}...`}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-muted">Microphone Gain: {localSettings.micGain.toFixed(1)}x</label>
          <input 
            type="range" min="0" max="2" step="0.1" 
            value={localSettings.micGain}
            onChange={(e) => setLocalSettings({...localSettings, micGain: parseFloat(e.target.value)})}
            className="w-full accent-primary h-2 bg-surface rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between bg-surface p-3 rounded-lg border border-text-muted/10">
                <span className="font-medium text-sm">Record Sessions Automatically</span>
                <input 
                    type="checkbox" 
                    checked={localSettings.enableRecording}
                    onChange={(e) => setLocalSettings({...localSettings, enableRecording: e.target.checked})}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
            </div>

            <div className={`flex items-center justify-between bg-surface p-3 rounded-lg border border-text-muted/10 transition-opacity ${!localSettings.enableRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col">
                    <span className="font-medium text-sm">Sync Deletion</span>
                    <span className="text-xs text-text-muted">Delete session & recording together</span>
                </div>
                <input 
                    type="checkbox" 
                    checked={localSettings.deleteSessionWithRecording}
                    onChange={(e) => setLocalSettings({...localSettings, deleteSessionWithRecording: e.target.checked})}
                    disabled={!localSettings.enableRecording}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
            </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 border-b border-text-muted/10 pb-2">Schedule</h3>
        <label className="block text-sm font-medium text-text-muted">Training Days (Streak Logic)</label>
        <div className="flex flex-wrap gap-2">
          {ORDERED_DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                localSettings.trainingDays.includes(day.id) 
                  ? 'bg-secondary text-white shadow-secondary/30' 
                  : 'bg-surface text-text-muted hover:bg-black/5'
              }`}
            >
              {day.label.slice(0,3)}
            </button>
          ))}
        </div>
      </section>

      <div className="pt-6 flex gap-3 border-t border-text-muted/10">
        <Button className="flex-1 shadow-lg shadow-primary/20" onClick={() => onSave(localSettings)}>Save Changes</Button>
        <Button variant="danger" onClick={onReset} className="opacity-80 hover:opacity-100">Reset App</Button>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...loaded };
  });
  
  const [stats, setStats] = useState<UserStats>(() => loadFromStorage(STORAGE_KEYS.STATS, INITIAL_STATS));
  const [recordings, setRecordings] = useState<Recording[]>(() => loadFromStorage(STORAGE_KEYS.RECORDINGS, []));
  const [sessions, setSessions] = useState<TrainingSession[]>(() => loadFromStorage(STORAGE_KEYS.SESSIONS, []));
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage(STORAGE_KEYS.GOALS, []));

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSickDay, setShowSickDay] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Session Focus Editing
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [tempFocus, setTempFocus] = useState(settings.sessionFocus || DEFAULT_SESSION_FOCUS);

  // Timer
  const [sessionDuration, setSessionDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Status Message
  const [statusMessage, setStatusMessage] = useState("Ready to train.");

  // Update temp focus when settings change
  useEffect(() => {
    setTempFocus(settings.sessionFocus || DEFAULT_SESSION_FOCUS);
  }, [settings.sessionFocus]);

  // Effects for Persistence
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STATS, stats);
  }, [stats]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECORDINGS, recordings);
  }, [recordings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
  }, [sessions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.GOALS, goals);
  }, [goals]);

  // Validate and Repair Streak on Mount
  useEffect(() => {
    const { currentStreak } = calculateStreaks(stats.history, stats.sickDays);
    if (currentStreak !== stats.currentStreak) {
      setStats(prev => ({ ...prev, currentStreak }));
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    if (appState === AppState.TRAINING) {
      timerRef.current = window.setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [appState]);

  // Gamification Logic (Achievements & Goals)
  const checkProgress = (currentStats: UserStats, currentSessions: TrainingSession[]) => {
    if (!settings.enableAchievements) return;

    // Check Achievements
    const newUnlocked = [...(currentStats.unlockedAchievements || [])];
    let achievementUnlocked = false;

    ACHIEVEMENTS_LIST.forEach(ach => {
      if (!newUnlocked.includes(ach.id)) {
        if (ach.condition(currentStats, currentSessions)) {
          newUnlocked.push(ach.id);
          achievementUnlocked = true;
          setStatusMessage(`🏆 Achievement Unlocked: ${ach.title}`);
        }
      }
    });

    if (achievementUnlocked) {
      setStats(prev => ({ ...prev, unlockedAchievements: newUnlocked }));
    }

    // Check Goals
    if (!settings.enableGoals) return;
    
    const updatedGoals = goals.map(g => {
      let current = 0;
      if (g.type === 'sessions') current = currentStats.totalSessions;
      else if (g.type === 'duration') current = Math.floor(currentStats.totalTrainingTime / 60); // minutes
      else if (g.type === 'streak') current = currentStats.currentStreak;

      const isCompleted = current >= g.target;
      if (isCompleted && !g.isCompleted) {
        setStatusMessage(`🎯 Goal Reached: ${g.label}`);
      }
      return { ...g, current, isCompleted };
    });

    // Only update if changes
    if (JSON.stringify(updatedGoals) !== JSON.stringify(goals)) {
        setGoals(updatedGoals);
    }
  };

  // Actions
  const handleStartTraining = async () => {
    try {
      startTimeRef.current = Date.now();
      // Initialize audio for both recording and visualizer/pitch
      await audioService.initialize(settings.inputDeviceId);
      audioService.setGain(settings.micGain);
      
      if (settings.enableRecording) {
        audioService.startRecording();
      }
      
      setAppState(AppState.TRAINING);
      setStatusMessage("Training in progress... Keep it up!");
    } catch (e) {
      setStatusMessage("Error starting audio. Check permissions.");
    }
  };

  const handlePauseTraining = () => {
    setAppState(AppState.PAUSED);
    if (settings.enableRecording) audioService.pauseRecording();
    setStatusMessage("Session paused.");
  };

  const handleResumeTraining = () => {
    setAppState(AppState.TRAINING);
    if (settings.enableRecording) audioService.resumeRecording();
    setStatusMessage("Training resumed.");
  };

  const handleStopTraining = async () => {
    setAppState(AppState.IDLE);
    
    let recordingId: string | undefined;
    
    if (settings.enableRecording) {
      setStatusMessage("Saving recording...");
      const blob = await audioService.stopRecording();
      
      if (blob.size > 0) {
        recordingId = crypto.randomUUID();
        const now = Date.now();
        const filename = `Session_${new Date().toISOString().split('T')[0]}_${stats.totalSessions + 1}`;
        
        const newRec: Recording = {
          id: recordingId,
          filename,
          date: now,
          duration: sessionDuration,
          size: blob.size
        };
        
        await saveAudioBlob(recordingId, blob);
        setRecordings(prev => [newRec, ...prev]);
      }
    }
    
    // Stop Audio Context completely
    await audioService.close();

    const now = Date.now();
    // USE STANDARDIZED DATE FORMAT: YYYY-MM-DD
    const todayStr = getLocalISODate();
    
    // Create Session Log Entry
    if (settings.enableHistory) {
      const newSession: TrainingSession = {
        id: crypto.randomUUID(),
        startTime: startTimeRef.current,
        endTime: now,
        duration: sessionDuration,
        recordingId
      };
      setSessions(prev => [newSession, ...prev]);
      // Pass to checkProgress
      checkProgress({
          ...stats, 
          totalSessions: stats.totalSessions + 1,
          totalTrainingTime: stats.totalTrainingTime + sessionDuration
      }, [newSession, ...sessions]);
    } else {
        // Update stats but no session log
        checkProgress({
            ...stats, 
            totalSessions: stats.totalSessions + 1,
            totalTrainingTime: stats.totalTrainingTime + sessionDuration
        }, sessions);
    }

    // Update Stats
    const newHistory = { ...stats.history, [todayStr]: true };
    const { currentStreak } = calculateStreaks(newHistory, stats.sickDays);
    
    setStats(prev => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      totalTrainingTime: prev.totalTrainingTime + sessionDuration,
      currentStreak: currentStreak,
      lastTrainingDate: now,
      history: newHistory
    }));

    setSessionDuration(0);
    setStatusMessage("Session saved successfully!");
    setTimeout(() => setStatusMessage("Ready to train."), 3000);
  };

  const handleUpdateSession = (updatedSession: TrainingSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteSession = async (sessionId: string) => {
      // Sync Deletion Logic: Session -> Recording
      if (settings.deleteSessionWithRecording) {
          const session = sessions.find(s => s.id === sessionId);
          if (session?.recordingId) {
              await deleteAudioBlob(session.recordingId);
              setRecordings(prev => prev.filter(r => r.id !== session.recordingId));
          }
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const handleBulkDeleteSessions = async (sessionIds: string[]) => {
      const idsToDelete = new Set(sessionIds);
      
      // Sync Deletion Logic: Session -> Recording
      if (settings.deleteSessionWithRecording) {
          const recordingIdsToDelete: string[] = [];
          sessions.forEach(s => {
              if (idsToDelete.has(s.id) && s.recordingId) {
                  recordingIdsToDelete.push(s.recordingId);
              }
          });
          
          if (recordingIdsToDelete.length > 0) {
              // Delete actual blobs
              await Promise.all(recordingIdsToDelete.map(id => deleteAudioBlob(id)));
              // Update recordings state
              setRecordings(prev => prev.filter(r => !recordingIdsToDelete.includes(r.id)));
          }
      }

      setSessions(prev => prev.filter(s => !idsToDelete.has(s.id)));
  };

  const handleUpdateSickDays = (newSickDaysList: string[]) => {
    // newSickDaysList is already ['YYYY-MM-DD', ...] from CustomCalendar
    const newSickDaysMap: { [date: string]: boolean } = {};
    newSickDaysList.forEach(date => {
        newSickDaysMap[date] = true; 
    });

    const { currentStreak } = calculateStreaks(stats.history, newSickDaysMap);

    setStats(prev => ({
      ...prev,
      currentStreak,
      sickDays: newSickDaysMap
    }));
    setStatusMessage("Sick days updated.");
    setShowSickDay(false);
  };

  const deleteRecording = async (id: string) => {
    await deleteAudioBlob(id);
    setRecordings(prev => prev.filter(r => r.id !== id));
    
    // Sync Deletion Logic: Recording -> Session
    if (settings.deleteSessionWithRecording) {
        setSessions(prev => prev.filter(s => s.recordingId !== id));
    }
  };

  const handleResetApp = () => {
    if (confirm("This will delete all training history and settings. Are you sure?")) {
       localStorage.clear();
       window.location.reload();
    }
  };

  const saveFocus = () => {
    setSettings(prev => ({ ...prev, sessionFocus: tempFocus }));
    setIsEditingFocus(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
    <GlobalStyles theme={settings.theme || 'dark'} />
    <div className="h-screen bg-background text-text flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-700 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-72 bg-surface border-r border-text-muted/10 flex-col p-6 gap-6 shrink-0 shadow-soft z-20">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
             <Mic size={22} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-text">VoiceStride</span>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="px-2 pb-3 text-xs font-bold text-text-muted uppercase tracking-wider opacity-70">Menu</div>
          
          {settings.enableStats && (
            <Button variant="ghost" className="w-full justify-start text-base" onClick={() => setShowAnalytics(true)}>
              <BarChart2 size={20} className="mr-3 opacity-80" /> Analytics
            </Button>
          )}
          
          {settings.enableHistory && (
            <Button variant="ghost" className="w-full justify-start text-base" onClick={() => setShowHistory(true)}>
              <History size={20} className="mr-3 opacity-80" /> Session Log
            </Button>
          )}

          <Button variant="ghost" className="w-full justify-start text-base" onClick={() => setShowRecordings(true)}>
            <FolderOpen size={20} className="mr-3 opacity-80" /> Recordings
          </Button>
          
          <Button variant="ghost" className="w-full justify-start text-base" onClick={() => setShowSickDay(true)}>
            <ThermometerSnowflake size={20} className="mr-3 opacity-80" /> Register Sick Day
          </Button>
          
          <Button variant="ghost" className="w-full justify-start text-base" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={20} className="mr-3 opacity-80" /> Settings
          </Button>
          
          <Button variant="ghost" className="w-full justify-start text-base" onClick={() => setShowHelp(true)}>
            <HelpCircle size={20} className="mr-3 opacity-80" /> Help
          </Button>
        </nav>

        {settings.enableStats && (
          <div className="mt-auto pt-6 border-t border-text-muted/10">
             <StatsPanel stats={stats} />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 h-full">
        {/* Top Status Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-md sticky top-0 z-10 border-b border-text-muted/5 shrink-0">
           <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-text-muted/10 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${appState === AppState.TRAINING ? 'bg-danger animate-pulse' : 'bg-secondary'}`} />
              <span className="text-sm font-semibold text-text-muted">{statusMessage}</span>
           </div>
           
           {/* Mobile Menu Button (simplified for now) */}
           <div className="flex items-center gap-4">
             <div className="text-sm font-medium text-text-muted opacity-80 hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
             </div>
             <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setShowSettings(true)}>
               <SettingsIcon size={20} />
             </Button>
           </div>
        </header>

        {/* Dashboard Grid Container - Expanded to full width */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full h-full">
            
            {/* Column 1: Active Tools (Timer, Visualizer, Pitch) - Narrower */}
            <div className="xl:col-span-3 flex flex-col gap-6 shrink-0">
              {/* Timer Card */}
              <div className="bg-surface rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center shadow-soft relative overflow-hidden transition-all hover:shadow-lg group min-h-[250px]">
                 {/* Background Glow */}
                 <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] transition-opacity duration-1000 ${appState === AppState.TRAINING ? 'opacity-100' : 'opacity-30'}`} />
                 
                 <div className="relative z-10 text-center space-y-2">
                   <h2 className="text-text-muted uppercase tracking-[0.2em] text-xs font-bold">Session Duration</h2>
                   <div className="text-6xl lg:text-7xl font-black tabular-nums tracking-tighter text-text drop-shadow-sm">
                     {formatTime(sessionDuration)}
                   </div>
                 </div>

                 <div className="relative z-10 mt-8 flex flex-col items-center gap-3 w-full">
                   {appState === AppState.IDLE ? (
                     <Button 
                       size="lg" 
                       className="w-full h-14 text-lg rounded-2xl shadow-glow hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary-hover text-white border-0"
                       onClick={handleStartTraining}
                     >
                       <PlayCircle className="mr-2 w-6 h-6" /> Start
                     </Button>
                   ) : (
                     <>
                       {appState === AppState.TRAINING ? (
                         <Button variant="secondary" size="lg" className="w-full rounded-xl h-12 shadow-lg shadow-secondary/20" onClick={handlePauseTraining}>
                           <PauseCircle className="mr-2" /> Pause
                         </Button>
                       ) : (
                         <Button variant="primary" size="lg" className="w-full rounded-xl h-12 shadow-lg shadow-primary/20" onClick={handleResumeTraining}>
                           <PlayCircle className="mr-2" /> Resume
                         </Button>
                       )}
                       
                       <Button variant="danger" size="lg" className="w-full rounded-xl h-12 shadow-lg shadow-danger/20" onClick={handleStopTraining}>
                         <StopCircle className="mr-2" /> Stop & Save
                       </Button>
                     </>
                   )}
                 </div>
              </div>

              {/* Pitch Tracker */}
              <PitchTracker 
                isActive={appState === AppState.TRAINING} 
                targetPitch={settings.targetPitch || 220}
                onTargetChange={(pitch) => setSettings({...settings, targetPitch: pitch})}
              />

              {/* Audio Visualizer */}
              {settings.enableVisualizer && (
                  <AudioVisualizer />
              )}
            </div>

            {/* Column 2: Plan Editor (Central Workspace) - WIDER (50%) */}
            <div className="xl:col-span-6 flex flex-col h-full min-h-[600px]">
               <PlanEditor 
                 plan={settings.trainingPlan} 
                 fontSize={settings.planFontSize || 16}
                 isTraining={appState === AppState.TRAINING}
                 onSave={(newPlan) => setSettings({...settings, trainingPlan: newPlan})}
                 onFontSizeChange={(size) => setSettings({...settings, planFontSize: size})}
               />
            </div>

            {/* Column 3: Meta & Gamification - Narrower */}
            <div className="xl:col-span-3 flex flex-col gap-6 shrink-0">
              
              {/* Session Focus */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 flex flex-col shadow-soft">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-lg flex items-center gap-2 text-text">
                     <Activity size={20} className="text-primary" /> 
                     Focus
                   </h3>
                   {!isEditingFocus && appState === AppState.IDLE && (
                     <Button variant="ghost" size="sm" onClick={() => setIsEditingFocus(true)} className="h-8 w-8 p-0 rounded-full hover:bg-black/5">
                       <Edit2 size={16} />
                     </Button>
                   )}
                 </div>
                 
                 {isEditingFocus ? (
                   <div className="space-y-4">
                     <textarea 
                       className="w-full bg-background border border-text-muted/20 rounded-xl p-4 text-text text-sm focus:ring-2 focus:ring-primary outline-none resize-none transition-all shadow-inner"
                       rows={4}
                       value={tempFocus}
                       placeholder={DEFAULT_SESSION_FOCUS}
                       onChange={(e) => setTempFocus(e.target.value)}
                       autoFocus
                     />
                     <div className="flex gap-2 justify-end">
                       <Button variant="ghost" size="sm" onClick={() => { setTempFocus(settings.sessionFocus || DEFAULT_SESSION_FOCUS); setIsEditingFocus(false); }}>
                         <X size={16} className="mr-1" />
                       </Button>
                       <Button variant="primary" size="sm" onClick={saveFocus}>
                         <Save size={16} className="mr-1" />
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <p className="text-text-muted leading-relaxed whitespace-pre-wrap text-sm">
                     {settings.sessionFocus || DEFAULT_SESSION_FOCUS}
                   </p>
                 )}
              </div>

              {/* Goals Widget */}
              {settings.enableGoals && (
                  <GoalsWidget 
                      goals={goals} 
                      onAddGoal={(g) => setGoals(prev => [...prev, g])}
                      onRemoveGoal={(id) => setGoals(prev => prev.filter(g => g.id !== id))}
                  />
              )}

              {/* Achievements Widget */}
              {settings.enableAchievements && (
                  <AchievementsWidget unlockedIds={stats.unlockedAchievements || []} />
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={showAnalytics && settings.enableStats}
        onClose={() => setShowAnalytics(false)}
        title="Training Analytics"
        width="max-w-5xl"
      >
        <AnalyticsDashboard stats={stats} recordings={recordings} settings={settings} />
      </Modal>

      <Modal 
        isOpen={showHistory && settings.enableHistory}
        onClose={() => setShowHistory(false)}
        title="Session History"
        width="max-w-2xl"
      >
        <SessionHistory 
            sessions={sessions} 
            onUpdateSession={handleUpdateSession} 
            onDeleteSession={handleDeleteSession}
            onBulkDelete={handleBulkDeleteSessions}
        />
      </Modal>

      <Modal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        title="Settings"
        width="max-w-xl"
      >
        <SettingsForm 
          settings={settings} 
          onSave={(s) => { setSettings(s); setShowSettings(false); setStatusMessage("Settings saved."); }} 
          onReset={handleResetApp}
        />
      </Modal>

      <Modal 
        isOpen={showRecordings} 
        onClose={() => setShowRecordings(false)} 
        title="Recording Manager"
        width="max-w-4xl"
      >
        <RecordingsManager recordings={recordings} onDelete={deleteRecording} />
      </Modal>

      <Modal
        isOpen={showSickDay}
        onClose={() => setShowSickDay(false)}
        title="Manage Sick Days"
        width="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">Select days where you were unable to train due to illness. These days will preserve your streak.</p>
          <CustomCalendar 
            initialSelectedDates={stats.sickDays}
            onSave={handleUpdateSickDays}
            onCancel={() => setShowSickDay(false)}
          />
        </div>
      </Modal>
      
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Help & Guide">
        <div className="space-y-6 text-text-muted leading-relaxed">
          <div>
            <strong className="text-text block mb-1">Training</strong>
            <p>Click "Start Training" to begin. This will start the timer and recording (if enabled in settings). Pause anytime.</p>
          </div>
          <div>
            <strong className="text-text block mb-1">Pitch Tracker</strong>
            <p>Use the pitch tracker to monitor your voice frequency in real-time. Set a target Hz to see if you are too high or too low.</p>
          </div>
          <div>
            <strong className="text-text block mb-1">Session Log</strong>
            <p>Click on any past session in the log to add personal notes or observations.</p>
          </div>
          <div>
            <strong className="text-text block mb-1">Plan Editor</strong>
            <p>Customize your routine in the text editor on the right. Hit "Edit Plan" to make changes.</p>
          </div>
          <div className="pt-6 border-t border-text-muted/10 text-xs text-center font-mono opacity-50">
            VoiceStride v1.1.0
          </div>
        </div>
      </Modal>

    </div>
    </>
  );
};

export default App;