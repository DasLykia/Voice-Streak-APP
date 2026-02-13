
import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Settings as SettingsIcon, HelpCircle, Mic, Play, Pause, Square, Activity, 
  FolderOpen, ThermometerSnowflake, BarChart2, Moon, Sun, History, Target, 
  Menu, ChevronLeft, LayoutDashboard, Zap, Award, Flame, User, Clock, FileText, Blocks, Info, Volume2, Calendar, Trash2, RefreshCw, Power, Edit3, ArrowUpCircle, AlertTriangle, Lock, Palette, Unlock
} from 'lucide-react';
import type { UpdateInfo } from 'velopack';

import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { StatsPanel } from './components/StatsPanel';
import { RecordingsManager } from './components/RecordingsManager';
import { RoutineEditor } from './components/RoutineEditor';
import { PlanEditor } from './components/PlanEditor';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { PitchTracker } from './components/PitchTracker';
import { SessionHistory } from './components/SessionHistory';
import { GoalsWidget } from './components/GoalsWidget';
import { AchievementsWidget } from './components/AchievementsWidget';
import { CustomCalendar } from './components/CustomCalendar';
import { PreFlightCheck } from './components/PreFlightCheck';
import { SessionPlayer } from './components/SessionPlayer';
import { PostSessionModal } from './components/PostSessionModal';
import { VocalHealthChart } from './components/VocalHealthChart';
import { LevelProgressModal } from './components/LevelProgressModal';

import { 
  AppSettings, AppState, Recording, UserStats, TrainingSession, Goal, 
  PitchDataPoint, VocalHealthLog, ColorTheme 
} from './types';
import { 
  DEFAULT_SETTINGS, INITIAL_STATS, STORAGE_KEYS, ACHIEVEMENTS_LIST, 
  XP_PER_MINUTE, XP_PER_SESSION, XP_LEVEL_BASE, THEMES, DEFAULT_ROUTINE 
} from './constants';
import { 
  loadFromStorage, saveToStorage, saveAudioBlob, deleteAudioBlob 
} from './services/storage';
import { audioService, AudioService } from './services/audio';
import { calculateStreaks } from './services/stats';

// --- THEME ENGINE ---
const GlobalStyles = ({ theme, mode, customColors }: { theme: ColorTheme, mode: 'light' | 'dark', customColors?: { primary: string; secondary: string } }) => {
  // Fallback to violet if theme definition is missing
  const basePalette = THEMES[theme] || THEMES.violet;
  
  // Logic: Only use custom colors if the active theme is explicitly set to 'custom' AND customColors exist
  const useCustom = theme === 'custom' && customColors;

  const primary = useCustom ? customColors.primary : basePalette.primary;
  const secondary = useCustom ? customColors.secondary : basePalette.secondary;

  const isDark = mode === 'dark';
  
  // Clean & Bright Light Mode
  const bgApp = isDark ? '#09090b' : '#f8f9fa'; 
  const bgSurface = isDark ? '#18181b' : '#ffffff'; 
  const bgPanel = isDark ? '#27272a' : '#f1f3f5'; 
  const borderColor = isDark ? '#27272a' : '#dee2e6'; 
  
  const textMain = isDark ? '#fafafa' : '#212529'; 
  const textMuted = isDark ? '#a1a1aa' : '#868e96';
  const primaryHover = isDark ? '#7c3aed' : primary; 

  // Selection Colors
  const selectionBg = primary;
  const selectionText = '#ffffff';

  return (
  <style>{`
    :root {
      --bg-app: ${bgApp};
      --bg-surface: ${bgSurface};
      --bg-panel: ${bgPanel};
      --border-color: ${borderColor};
      --text-main: ${textMain};
      --text-muted: ${textMuted};
      --col-primary: ${primary};
      --col-primary-hover: ${primaryHover};
      --col-secondary: ${secondary};
      --col-danger: ${isDark ? '#ef4444' : '#fa5252'};
    }
    ::selection {
      background-color: ${selectionBg};
      color: ${selectionText};
    }
    .shadow-soft {
      box-shadow: ${isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0,0,0,0.05), 0 5px 15px rgba(0,0,0,0.02)'};
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: ${isDark ? '#3f3f46' : '#ced4da'};
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background-color: transparent;
    }
    .drop-shadow-glow {
        filter: drop-shadow(0 0 8px rgba(var(--col-primary), 0.5));
    }
  `}</style>
)};

// Helper for consistent date keys (YYYY-MM-DD Local)
const getLocalISODate = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Color Picker Component (Defined outside to prevent re-render issues) ---
const ColorPickerInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="flex-1 space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</label>
      <div className="relative h-10 w-full rounded-lg border border-white/10 bg-black/20 flex items-center px-3 gap-3 hover:border-white/20 transition-colors group cursor-pointer overflow-hidden">
          <div 
              className="w-5 h-5 rounded-full shadow-sm border border-white/20 shrink-0" 
              style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono text-text-muted group-hover:text-text transition-colors uppercase truncate">
              {value}
          </span>
          <input 
              type="color" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={value}
              onChange={(e) => onChange(e.target.value)}
          />
      </div>
  </div>
);

// --- Settings Form ---
const SettingsForm: React.FC<{ settings: AppSettings; stats: UserStats; onSave: (s: AppSettings) => void; onReset: () => void; appVersion: string }> = ({ settings, stats, onSave, onReset, appVersion }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    AudioService.getDevices().then(setDevices);
  }, []);

  const toggleDay = (dayIndex: number) => {
    const current = localSettings.trainingDays;
    const next = current.includes(dayIndex) 
        ? current.filter(d => d !== dayIndex)
        : [...current, dayIndex].sort();
    setLocalSettings({...localSettings, trainingDays: next});
  };

  const toggleLevelingMode = () => {
      const newValue = !localSettings.disableLeveling;
      const msg = newValue 
        ? "Enable 'Unlock All' Mode?\n\nYou will unlock all themes instantly, but you will STOP earning XP and leveling up while this mode is active."
        : "Re-enable Leveling?\n\nXP earning will resume. Your theme will be reset if your level is not high enough.";
      
      if (confirm(msg)) {
          let nextSettings = {...localSettings, disableLeveling: newValue};
          
          if (!newValue) {
              // We are turning OFF "Unlock All".
              // Check if current theme is allowed at current level.
              const currentThemeDef = THEMES[nextSettings.colorTheme];
              const isGrandMasterTheme = nextSettings.colorTheme === 'custom';
              
              // Logic: If using custom theme but level < 50 -> Reset to violet
              // Logic: If using standard theme but level < unlockLevel -> Reset to violet
              if (isGrandMasterTheme && stats.level < 50) {
                   nextSettings.colorTheme = 'violet';
              } else if (currentThemeDef && stats.level < currentThemeDef.unlockLevel) {
                   nextSettings.colorTheme = 'violet';
              }
          }
          
          setLocalSettings(nextSettings);
      }
  };

  const checkUpdates = async () => {
      setCheckingUpdate(true);
      try {
          if (!window.velopackApi) {
              alert("Update system not available in web mode.");
              return;
          }
          const update = await window.velopackApi.checkForUpdates();
          if (update) {
              if (confirm(`New version ${update.TargetFullRelease.Version} available. Download and install?`)) {
                  await window.velopackApi.downloadUpdates(update);
                  await window.velopackApi.applyUpdates(update);
              }
          } else {
              alert("You are on the latest version.");
          }
      } catch (e) {
          alert(`Update check failed: ${e}`);
      } finally {
          setCheckingUpdate(false);
      }
  };

  const handleDeleteAll = () => {
      if (confirm("WARNING: This will permanently delete ALL session history, recordings, goals, and settings.\n\nAre you absolutely sure you want to reset everything?")) {
          onReset();
      }
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const isGrandMaster = stats.level >= 50 || localSettings.disableLeveling;

  return (
    <div className="space-y-8">
      {/* Theme Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Appearance</h3>
        <div className="space-y-4">
            <div className="flex gap-4">
                <button 
                    onClick={() => setLocalSettings({...localSettings, theme: 'light'})}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${localSettings.theme === 'light' ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text'}`}
                >
                    <Sun size={16} /> Light
                </button>
                <button 
                    onClick={() => setLocalSettings({...localSettings, theme: 'dark'})}
                    className={`flex-1 p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${localSettings.theme === 'dark' ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text'}`}
                >
                    <Moon size={16} /> Dark
                </button>
            </div>

            <div>
                <label className="block text-xs font-bold text-text-muted mb-3 uppercase">Accent Color</label>
                <div className="flex flex-wrap gap-3">
                    {(Object.keys(THEMES) as ColorTheme[]).filter(k => k !== 'custom').map(themeKey => {
                        const theme = THEMES[themeKey];
                        const isLocked = !localSettings.disableLeveling && stats.level < theme.unlockLevel;
                        
                        return (
                            <button
                                key={themeKey}
                                onClick={() => !isLocked && setLocalSettings({...localSettings, colorTheme: themeKey})}
                                className={`w-8 h-8 rounded-full border-2 transition-all relative group flex items-center justify-center ${localSettings.colorTheme === themeKey ? 'border-text scale-110' : 'border-transparent'} ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-110'}`}
                                style={{ backgroundColor: theme.primary }}
                                title={isLocked ? `Unlocks at Lvl ${theme.unlockLevel}` : theme.name}
                            >
                                {isLocked && <Lock size={12} className="text-white drop-shadow-md" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Grandmaster Custom Color Picker */}
            {isGrandMaster && (
                <div className="bg-surface p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-primary mb-3 flex items-center gap-2">
                        <Palette size={14} /> Grand Master Custom Theme
                    </h4>
                    <div className="flex gap-4">
                        <ColorPickerInput 
                            label="Primary Color" 
                            value={localSettings.customColors?.primary || '#ffffff'}
                            onChange={(val) => setLocalSettings(prev => ({
                                ...prev, 
                                colorTheme: 'custom',
                                customColors: { 
                                    primary: val, 
                                    secondary: prev.customColors?.secondary || '#ffffff' 
                                }
                            }))}
                        />
                        <ColorPickerInput 
                            label="Secondary Color" 
                            value={localSettings.customColors?.secondary || '#ffffff'}
                            onChange={(val) => setLocalSettings(prev => ({
                                ...prev, 
                                colorTheme: 'custom',
                                customColors: { 
                                    primary: prev.customColors?.primary || '#ffffff', 
                                    secondary: val
                                }
                            }))}
                        />
                    </div>
                </div>
            )}
        </div>
      </section>

      {/* Progression Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Progression</h3>
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50">
             <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${localSettings.disableLeveling ? 'bg-yellow-500/20 text-yellow-500' : 'bg-surface text-text-muted'}`}>
                    {localSettings.disableLeveling ? <Unlock size={16} /> : <Lock size={16} />}
                </div>
                <div>
                    <div className="text-sm font-bold text-text">Unlock All Rewards</div>
                    <div className="text-[10px] text-text-muted">Disable XP gain to unlock all themes immediately.</div>
                </div>
             </div>
             <button 
               onClick={toggleLevelingMode}
               className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.disableLeveling ? 'bg-yellow-500' : 'bg-border'}`}
             >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.disableLeveling ? 'left-6' : 'left-1'}`} />
             </button>
        </div>
      </section>

      {/* Schedule Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Training Schedule</h3>
        <div className="p-4 rounded-xl border border-border bg-background/50">
            <p className="text-xs text-text-muted mb-3">Select your target training days. Off days will not break your streak.</p>
            <div className="flex justify-between gap-1">
                {DAYS.map((day, i) => {
                    const isActive = localSettings.trainingDays.includes(i);
                    return (
                        <button
                            key={day}
                            onClick={() => toggleDay(i)}
                            className={`flex-1 aspect-square rounded flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-border text-text-muted hover:bg-white/5'}`}
                        >
                            {day[0]}
                        </button>
                    )
                })}
            </div>
        </div>
      </section>

      {/* Mode Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Training Mode</h3>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setLocalSettings({...localSettings, planMode: 'structured'})}
                className={`p-4 rounded-xl border text-left transition-all ${localSettings.planMode === 'structured' ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-surface border-border hover:border-primary/50'}`}
            >
                <div className={`mb-2 ${localSettings.planMode === 'structured' ? 'text-primary' : 'text-text-muted'}`}><Blocks size={20} /></div>
                <div className="font-bold text-sm text-text">Guided Routine</div>
                <div className="text-[10px] text-text-muted mt-1">Timed blocks & prompts</div>
            </button>
            <button 
                onClick={() => setLocalSettings({...localSettings, planMode: 'simple'})}
                className={`p-4 rounded-xl border text-left transition-all ${localSettings.planMode === 'simple' ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-surface border-border hover:border-primary/50'}`}
            >
                <div className={`mb-2 ${localSettings.planMode === 'simple' ? 'text-primary' : 'text-text-muted'}`}><FileText size={20} /></div>
                <div className="font-bold text-sm text-text">Simple Plan</div>
                <div className="text-[10px] text-text-muted mt-1">Free text editor & timer</div>
            </button>
        </div>
      </section>

      {/* Audio & Workflow Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Hardware & Workflow</h3>
        <div className="space-y-4 p-4 rounded-xl border border-border bg-background/50">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">Input Device</label>
            <select 
              className="w-full bg-surface border border-border rounded-lg p-2 text-sm outline-none focus:border-primary text-text"
              value={localSettings.inputDeviceId}
              onChange={(e) => setLocalSettings({...localSettings, inputDeviceId: e.target.value})}
            >
              <option value="default">System Default</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,4)}...`}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">Mic Gain: {localSettings.micGain.toFixed(1)}x</label>
            <input 
              type="range" min="0" max="2" step="0.1" 
              value={localSettings.micGain}
              onChange={(e) => setLocalSettings({...localSettings, micGain: parseFloat(e.target.value)})}
              className="w-full h-1 bg-border rounded-full appearance-none accent-primary cursor-pointer"
            />
          </div>

          <div className="space-y-1 pt-2 border-t border-border">
            <label className="text-xs font-medium text-text-muted flex items-center gap-2">
                <Volume2 size={12} /> Routine Beep Volume: {Math.round(localSettings.beepVolume * 100)}%
            </label>
            <input 
              type="range" min="0" max="1" step="0.1" 
              value={localSettings.beepVolume}
              onChange={(e) => setLocalSettings({...localSettings, beepVolume: parseFloat(e.target.value)})}
              className="w-full h-1 bg-border rounded-full appearance-none accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
             <span className="text-sm text-text">Skip Pre-Flight Check</span>
             <button 
               onClick={() => setLocalSettings(s => ({...s, skipPreflight: !s.skipPreflight}))}
               className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.skipPreflight ? 'bg-primary' : 'bg-border'}`}
             >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.skipPreflight ? 'left-6' : 'left-1'}`} />
             </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
             <span className="text-sm text-text">Enable Recording</span>
             <button 
               onClick={() => setLocalSettings(s => ({...s, enableRecording: !s.enableRecording}))}
               className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.enableRecording ? 'bg-primary' : 'bg-border'}`}
             >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.enableRecording ? 'left-6' : 'left-1'}`} />
             </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
             <span className="text-sm text-text">Auto Update on Startup</span>
             <button 
               onClick={() => setLocalSettings(s => ({...s, checkUpdatesOnStartup: !s.checkUpdatesOnStartup}))}
               className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.checkUpdatesOnStartup ? 'bg-primary' : 'bg-border'}`}
             >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.checkUpdatesOnStartup ? 'left-6' : 'left-1'}`} />
             </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
             <div className="flex items-center gap-2">
                <span className="text-sm text-text">Sync Delete</span>
                <div className="group relative">
                    <Info size={14} className="text-text-muted cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface border border-border rounded text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Automatically delete the associated audio recording when you delete a session log.
                    </div>
                </div>
             </div>
             <button 
               onClick={() => setLocalSettings(s => ({...s, deleteSessionWithRecording: !s.deleteSessionWithRecording}))}
               className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.deleteSessionWithRecording ? 'bg-danger' : 'bg-border'}`}
             >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.deleteSessionWithRecording ? 'left-6' : 'left-1'}`} />
             </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
             <div className="flex items-center gap-2">
                <span className="text-sm text-text">Persist Analytics</span>
                <div className="group relative">
                    <Info size={14} className="text-text-muted cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface border border-border rounded text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Keep stats and health trends even if session logs are deleted.
                    </div>
                </div>
             </div>
             <button 
               onClick={() => setLocalSettings(s => ({...s, retainAnalytics: !s.retainAnalytics}))}
               className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.retainAnalytics ? 'bg-primary' : 'bg-border'}`}
             >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localSettings.retainAnalytics ? 'left-6' : 'left-1'}`} />
             </button>
          </div>
        </div>
      </section>

      {/* System Section */}
      <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">System</h3>
          <div className="flex flex-col gap-3">
            <Button 
                variant="outline" 
                className="w-full justify-between" 
                onClick={checkUpdates}
                disabled={checkingUpdate}
            >
                <span className="flex items-center gap-2">
                    <RefreshCw size={16} className={checkingUpdate ? "animate-spin" : ""} />
                    {checkingUpdate ? "Checking..." : "Check for Updates"}
                </span>
                <span className="text-xs text-text-muted">v{appVersion}</span>
            </Button>

            <Button variant="danger" className="w-full" onClick={handleDeleteAll}>
                <Trash2 size={16} className="mr-2" /> Reset & Delete All Data
            </Button>
          </div>
      </section>

      <div className="pt-4 border-t border-border">
        <Button onClick={() => onSave(localSettings)} className="w-full">Save Configuration</Button>
      </div>
    </div>
  );
};

// --- Focus Block Component ---
const SessionFocusBlock: React.FC<{ focusText: string; onUpdate: (text: string) => void }> = ({ focusText, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempText, setTempText] = useState(focusText);

    const handleSave = () => {
        onUpdate(tempText);
        setIsEditing(false);
    };

    return (
        <div className="bg-surface rounded-2xl border border-white/5 p-4 shadow-soft flex flex-col gap-2 relative group w-full transition-all duration-300">
            <div className="flex justify-between items-center mb-1 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" /> Session Focus
                </h3>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 size={14} />
                    </button>
                )}
            </div>
            
            {isEditing ? (
                <div className="flex flex-col gap-2 w-full">
                    <textarea 
                        className="w-full bg-black/20 rounded p-2 text-sm text-text outline-none resize-none focus:ring-1 focus:ring-primary/50 border border-white/5"
                        value={tempText}
                        onChange={(e) => setTempText(e.target.value)}
                        autoFocus
                        rows={4}
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSave}>Save</Button>
                    </div>
                </div>
            ) : (
                <div className="w-full text-sm text-text leading-relaxed whitespace-pre-wrap italic opacity-90 overflow-y-auto custom-scrollbar max-h-32 min-h-[4rem]">
                    {focusText || "Set a focus for your practice sessions..."}
                </div>
            )}
        </div>
    );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { 
        ...DEFAULT_SETTINGS, 
        ...loaded, 
        currentRoutine: loaded.currentRoutine?.blocks ? loaded.currentRoutine : DEFAULT_SETTINGS.currentRoutine 
    };
  });
  
  const [stats, setStats] = useState<UserStats>(() => loadFromStorage(STORAGE_KEYS.STATS, INITIAL_STATS));
  const [recordings, setRecordings] = useState<Recording[]>(() => loadFromStorage(STORAGE_KEYS.RECORDINGS, []));
  const [sessions, setSessions] = useState<TrainingSession[]>(() => loadFromStorage(STORAGE_KEYS.SESSIONS, []));
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage(STORAGE_KEYS.GOALS, []));
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Update State
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);

  // Modals & UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showSickDay, setShowSickDay] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  
  // Navigation State
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [highlightedRecordingId, setHighlightedRecordingId] = useState<string | null>(null);

  // Session State
  const [sessionDuration, setSessionDuration] = useState(0); 
  const timerRef = useRef<number | null>(null); 
  const startTimeRef = useRef<number>(0);
  const pitchDataRef = useRef<PitchDataPoint[]>([]);
  const pitchIntervalRef = useRef<number | null>(null);
  const [livePitchData, setLivePitchData] = useState<PitchDataPoint[]>([]);
  const [tempRecordingBlob, setTempRecordingBlob] = useState<Blob | null>(null);
  
  // Simple Mode Pause State
  const [simpleModePaused, setSimpleModePaused] = useState(false);

  // Status
  const [statusMessage, setStatusMessage] = useState("Ready");

  //XP Event Logic
  const dailyXpBonus = useMemo(() => {
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
          hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
          hash |= 0;
      }
      const rand = Math.abs(hash % 100);
      
      // 1% Chance for 5x
      if (rand < 1) return 5;
      // 5% Chance for 3x (1 to 6)
      if (rand < 6) return 3;
      // 15% Chance for 2x (6 to 21)
      if (rand < 21) return 2;
      
      return 1;
  }, []);

  useEffect(() => {
    if (window.velopackApi) {
        window.velopackApi.getVersion().then(setAppVersion);
        if (settings.checkUpdatesOnStartup) {
            window.velopackApi.checkForUpdates().then(update => {
                if (update) setUpdateAvailable(update);
            }).catch(console.error);
        }
    }

    // Check Welcome
    const welcomeShown = localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN);
    if (!welcomeShown) {
        setShowWelcome(true);
        localStorage.setItem(STORAGE_KEYS.WELCOME_SHOWN, 'true');
    }
  }, []);

  // Persistence
  useEffect(() => { saveToStorage(STORAGE_KEYS.SETTINGS, settings); }, [settings]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.STATS, stats); }, [stats]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.RECORDINGS, recordings); }, [recordings]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SESSIONS, sessions); }, [sessions]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.GOALS, goals); }, [goals]);

  // Recalc Streak on Load
  useEffect(() => {
    const { currentStreak } = calculateStreaks(
        Object.fromEntries(Object.keys(stats.history).map(k => [k, true])), 
        stats.sickDays,
        settings.trainingDays
    );
    if (currentStreak !== stats.currentStreak) {
      setStats(prev => ({ ...prev, currentStreak }));
    }
  }, [settings.trainingDays]);

  // --- XP & Level System ---
  const levelProgress = useMemo(() => {
    const xpForNextLevel = stats.level * XP_LEVEL_BASE;
    if (xpForNextLevel <= 0) return 0;
    return Math.min(100, (stats.xp / xpForNextLevel) * 100);
  }, [stats.xp, stats.level]);

  // --- Navigation Helpers ---
  const jumpToSession = (sessionId: string) => {
      setHighlightedSessionId(sessionId);
      setShowHistory(true);
      setShowRecordings(false); // Close others
  };

  const jumpToRecording = (recordingId: string) => {
      setHighlightedRecordingId(recordingId);
      setShowRecordings(true);
      setShowHistory(false); // Close others
  };

  // --- Session Flow ---

  const initiateSession = () => {
    if (settings.skipPreflight) {
        startWorkout();
    } else {
        setAppState(AppState.PRE_FLIGHT);
    }
  };

  const startWorkout = async () => {
    try {
        await audioService.initialize(settings.inputDeviceId);
        audioService.setGain(settings.micGain);
        await audioService.resume(); 
        
        startTimeRef.current = Date.now();
        pitchDataRef.current = [];
        setLivePitchData([]);
        setSimpleModePaused(false);
        
        if (settings.enableRecording) {
            audioService.startRecording();
        }

        if (pitchIntervalRef.current) clearInterval(pitchIntervalRef.current);
        pitchIntervalRef.current = window.setInterval(() => {
            if (simpleModePaused) return; 
            const p = audioService.getPitch();
            const time = Date.now() - startTimeRef.current;
            const newPoint = { time, pitch: p };
            pitchDataRef.current.push(newPoint);
            setLivePitchData(prev => [...prev, newPoint].filter(dp => (time - dp.time) < 60000));
        }, 50);

        if (settings.planMode === 'simple') {
            setSessionDuration(0);
            timerRef.current = window.setInterval(() => {
                // Check current state in closure or ref? 
                // Since this closure captures initial state, we need to use ref or state callback logic.
                // But setInterval won't see updated state. 
                // Better approach: Use a ref for paused state inside interval.
            }, 1000);
        }

        setAppState(AppState.TRAINING);
        setStatusMessage("Training Active");
    } catch (e) {
        console.error("Failed to start session:", e);
        setStatusMessage("Audio Error - Restart App");
        setAppState(AppState.IDLE);
    }
  };

  // Dedicated effect for timer to handle pause state cleanly
  useEffect(() => {
      if (appState === AppState.TRAINING && settings.planMode === 'simple') {
          const interval = setInterval(() => {
              if (!simpleModePaused) {
                  setSessionDuration(prev => prev + 1);
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [appState, simpleModePaused, settings.planMode]);

  const finishWorkout = async () => {
    if (pitchIntervalRef.current) clearInterval(pitchIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (settings.enableRecording) {
        const blob = await audioService.stopRecording();
        setTempRecordingBlob(blob);
    }
    
    audioService.close();
    setAppState(AppState.POST_SESSION);
  };

  const saveSessionLog = async (healthLog: VocalHealthLog) => {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTimeRef.current) / 1000);
    const todayStr = getLocalISODate();

    let recordingId: string | undefined;

    if (tempRecordingBlob && tempRecordingBlob.size > 0) {
        recordingId = crypto.randomUUID();
        const filename = `Session_${todayStr}_${stats.totalSessions + 1}`;
        const newRec: Recording = {
            id: recordingId,
            filename,
            date: endTime,
            duration,
            size: tempRecordingBlob.size,
            pitchData: pitchDataRef.current,
            targetPitch: settings.targetPitch
        };
        await saveAudioBlob(recordingId, tempRecordingBlob);
        setRecordings(prev => [newRec, ...prev]);
    }

    // --- XP Calculation ---
    // Formula: (Base + (Level * Scaling)) + (Mins * PerMin)
    // Scaling: 10 XP per level
    let xpGained = 0;
    
    if (!settings.disableLeveling) {
        const levelBonus = stats.level * 10;
        const sessionBase = XP_PER_SESSION + levelBonus;
        const durationBonus = Math.round((duration / 60) * XP_PER_MINUTE);
        
        xpGained = sessionBase + durationBonus;
        
        // Apply Daily Multiplier
        xpGained *= dailyXpBonus;
    }

    let newXp = stats.xp + xpGained;
    let newLevel = stats.level;
    const xpNeeded = newLevel * XP_LEVEL_BASE;
    
    if (!settings.disableLeveling && newXp >= xpNeeded) {
        newLevel++;
        newXp -= xpNeeded;
        // Level Up Effect
        confetti({ 
            particleCount: 200, 
            spread: 100, 
            shapes: ['star'], 
            colors: ['#FFD700', '#FFA500', '#FFFFFF'] 
        });
        setStatusMessage(`LEVEL UP! ${newLevel}`);
    }

    const newSession: TrainingSession = {
        id: crypto.randomUUID(),
        startTime: startTimeRef.current,
        endTime,
        duration,
        recordingId,
        pitchData: pitchDataRef.current,
        targetPitch: settings.targetPitch,
        routineUsed: settings.planMode === 'structured' ? settings.currentRoutine.id : undefined,
        healthLog,
        mode: settings.planMode
    };

    const updatedSessions = [newSession, ...sessions];
    
    // Update Stats & Persistent History
    const tempHistory = { ...stats.history };
    tempHistory[todayStr] = (tempHistory[todayStr] || 0) + duration;
    
    // Update Session Counts (New Persistent Store)
    const tempSessionCounts = { ...stats.sessionCounts };
    tempSessionCounts[todayStr] = (tempSessionCounts[todayStr] || 0) + 1;

    // Update Health Trends (New Persistent Store)
    const newHealthTrend = { date: endTime, effort: healthLog.effort, duration };
    const tempHealthTrends = [...(stats.healthTrends || []), newHealthTrend];

    const streakMap: {[key:string]: boolean} = {};
    Object.keys(tempHistory).forEach(k => streakMap[k] = true);
    const { currentStreak } = calculateStreaks(streakMap, stats.sickDays, settings.trainingDays);

    if (currentStreak > stats.currentStreak) {
        confetti({ particleCount: 150, spread: 100 });
    }

    const tempStats: UserStats = {
        ...stats,
        totalSessions: stats.totalSessions + 1,
        totalTrainingTime: stats.totalTrainingTime + duration,
        currentStreak,
        lastTrainingDate: endTime,
        history: tempHistory,
        sessionCounts: tempSessionCounts,
        healthTrends: tempHealthTrends,
        xp: newXp,
        level: newLevel
    };

    // Update Goals - Relative Tracking Logic
    const updatedGoals = goals.map(g => {
        let currentTotal = 0;
        switch(g.type) {
            case 'sessions': currentTotal = tempStats.totalSessions; break;
            case 'duration': currentTotal = Math.floor(tempStats.totalTrainingTime / 60); break;
            case 'streak': currentTotal = tempStats.currentStreak; break;
        }
        
        const startVal = g.startValue || 0; 
        const relativeProgress = currentTotal - startVal;
        
        return {
            ...g,
            current: currentTotal,
            isCompleted: relativeProgress >= g.target
        };
    });
    setGoals(updatedGoals);

    // Achievement Check
    const newUnlocks: string[] = [];
    ACHIEVEMENTS_LIST.forEach(ach => {
        if (!stats.unlockedAchievements.includes(ach.id)) {
            if (ach.condition(tempStats, updatedSessions)) {
                newUnlocks.push(ach.id);
                confetti({ particleCount: 100, spread: 60 });
            }
        }
    });

    tempStats.unlockedAchievements = [...stats.unlockedAchievements, ...newUnlocks];

    setSessions(updatedSessions);
    setStats(tempStats);
    setRecordings(prev => prev); 

    setAppState(AppState.IDLE);
    setTempRecordingBlob(null);
    setStatusMessage(settings.disableLeveling ? "Session Saved" : `Session Saved (+${xpGained} XP)`);
  };

  const handleClaimGoal = (goalId: string) => {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      // Confetti Effect
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 } });

      // Move to history
      const completedGoal = { ...goal, completedAt: Date.now() };
      const newHistory = [completedGoal, ...(stats.goalHistory || [])];
      
      setStats(prev => ({ ...prev, goalHistory: newHistory }));
      setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  const handleDeleteHistoryEntry = (goalId: string) => {
      if (confirm("Remove this goal from history?")) {
          const newHistory = (stats.goalHistory || []).filter(g => g.id !== goalId);
          setStats(prev => ({ ...prev, goalHistory: newHistory }));
      }
  };

  const handleSaveSickDays = (days: string[]) => {
      const newSickDays: { [key: string]: boolean } = {};
      days.forEach(d => newSickDays[d] = true);
      setStats({...stats, sickDays: newSickDays});
      setShowSickDay(false);
  };

  // Delete Session
  const handleDeleteSession = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    if (settings.deleteSessionWithRecording && session.recordingId) {
        try {
            await deleteAudioBlob(session.recordingId);
            setRecordings(prev => prev.filter(r => r.id !== session.recordingId));
        } catch(e) {
            console.error("Failed to delete sync recording", e);
        }
    }
    
    if (!settings.retainAnalytics) {
        const newTrends = (stats.healthTrends || []).filter(t => t.date !== session.endTime);
        setStats(prev => ({ ...prev, healthTrends: newTrends }));
    }

    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // Delete Recording
  const handleDeleteRecording = async (id: string) => {
      try {
          await deleteAudioBlob(id);
          setRecordings(prev => prev.filter(r => r.id !== id));
          
          if (settings.deleteSessionWithRecording) {
              const session = sessions.find(s => s.recordingId === id);
              if (session && !settings.retainAnalytics) {
                  const newTrends = (stats.healthTrends || []).filter(t => t.date !== session.endTime);
                  setStats(prev => ({ ...prev, healthTrends: newTrends }));
              }
              setSessions(prev => prev.filter(s => s.recordingId !== id));
          }
      } catch(e) {
          console.error("Failed to delete recording", e);
      }
  };

  const handleBulkDeleteSessions = async (ids: string[]) => {
    const sessionsToDelete = sessions.filter(s => ids.includes(s.id));
    
    if (settings.deleteSessionWithRecording) {
        for (const s of sessionsToDelete) {
            if (s.recordingId) {
                try { await deleteAudioBlob(s.recordingId); } catch(e) {}
            }
        }
        const recordingIds = sessionsToDelete.map(s => s.recordingId).filter(Boolean) as string[];
        setRecordings(prev => prev.filter(r => !recordingIds.includes(r.id)));
    }

    if (!settings.retainAnalytics) {
        const timestamps = sessionsToDelete.map(s => s.endTime);
        const newTrends = (stats.healthTrends || []).filter(t => !timestamps.includes(t.date));
        setStats(prev => ({ ...prev, healthTrends: newTrends }));
    }

    setSessions(prev => prev.filter(s => !ids.includes(s.id)));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleUpdateClick = async () => {
      if (updateAvailable && window.velopackApi) {
          if (confirm(`New version ${updateAvailable.TargetFullRelease.Version} available. Update now?`)) {
              await window.velopackApi.downloadUpdates(updateAvailable);
              await window.velopackApi.applyUpdates(updateAvailable);
          }
      }
  };

  const handleResetApp = () => {
      if (window.velopackApi) {
          window.velopackApi.clearAppData();
          localStorage.clear();
          window.location.reload();
      } else {
          localStorage.clear();
          window.location.reload();
      }
  };

  // UI Components mapping
  const isTraining = appState === AppState.TRAINING;

  return (
    <>
    <GlobalStyles theme={settings.colorTheme} mode={settings.theme} customColors={settings.customColors} />
    <div className="h-screen w-full flex bg-background text-text overflow-hidden selection:bg-primary/30 selection:text-white transition-colors duration-300 font-sans">
      
      {/* Sidebar - Compact */}
      <nav className="w-16 bg-surface border-r border-border flex flex-col items-center py-4 gap-4 z-50 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-2 shrink-0">
           <Mic size={20} className="text-white" />
        </div>

        <NavButton icon={<LayoutDashboard size={20} />} active={!showAnalytics && !showHistory} onClick={() => {setShowAnalytics(false); setShowHistory(false); setShowRecordings(false);}} tooltip="Dashboard" />
        <NavButton icon={<BarChart2 size={20} />} active={showAnalytics} onClick={() => setShowAnalytics(true)} tooltip="Analytics" />
        <NavButton icon={<History size={20} />} active={showHistory} onClick={() => setShowHistory(true)} tooltip="History" />
        <NavButton icon={<FolderOpen size={20} />} active={showRecordings} onClick={() => setShowRecordings(true)} tooltip="Recordings" />
        
        <div className="flex-1" />
        <NavButton icon={<ThermometerSnowflake size={20} />} onClick={() => setShowSickDay(true)} tooltip="Sick Days" />
        <NavButton icon={<SettingsIcon size={20} />} onClick={() => setShowSettings(true)} tooltip="Settings" />
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-background">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface/50 backdrop-blur-sm shrink-0 z-40">
           <div className="flex items-center gap-4">
              <div className="flex flex-col">
                 <h1 className="font-bold text-sm leading-tight tracking-tight text-text">VoiceStride <span className="text-primary text-xs align-top">v{appVersion}</span></h1>
                 <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{statusMessage}</span>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
               {/* Update Notification Banner */}
               {updateAvailable && (
                   <button 
                        onClick={handleUpdateClick}
                        className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all animate-pulse"
                   >
                       <ArrowUpCircle size={14} /> Update Found
                   </button>
               )}

               {/* XP Event Indicator */}
               {dailyXpBonus > 1 && !settings.disableLeveling && (
                   <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold animate-pulse border ${
                       dailyXpBonus >= 5 ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]' :
                       dailyXpBonus >= 3 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                       'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                   }`}>
                       <Flame size={12} className="fill-current" /> {dailyXpBonus}X XP
                   </div>
               )}

               {/* Level Bar - Hidden if Disabled */}
               {!settings.disableLeveling && (
                   <button 
                        onClick={() => setShowLevelModal(true)}
                        className="flex items-center gap-4 bg-surface rounded-full p-1 pr-4 border border-border shadow-sm group relative cursor-pointer hover:bg-surface-highlight transition-colors"
                   >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                        {stats.level}
                      </div>
                      <div className="flex flex-col gap-0.5 w-20">
                        <div className="flex justify-between text-[8px] text-text-muted">
                            <span>LVL</span>
                            <span>{Math.floor(levelProgress)}%</span>
                        </div>
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${levelProgress}%` }} />
                        </div>
                      </div>
                   </button>
               )}
           </div>
        </header>

        {/* --- DYNAMIC CONTENT AREA --- */}
        <div className={`w-full h-full p-4 overflow-hidden relative flex flex-col`}>
           
           <div className={`w-full h-full grid grid-cols-1 xl:grid-cols-12 gap-4 ${!isTraining ? 'overflow-y-auto custom-scrollbar pr-2' : ''}`}>
              
              {/* --- LEFT COL --- */}
              <div className={`xl:col-span-8 flex flex-col gap-4 h-full min-h-0`}>
                 
                 {/* 1. MAIN ACTION / DASHBOARD AREA */}
                 {isTraining ? (
                    settings.planMode === 'structured' ? (
                        <div className="flex-1 min-h-0">
                            <SessionPlayer 
                                routine={settings.currentRoutine} 
                                onComplete={finishWorkout} 
                                onStop={finishWorkout} 
                                beepVolume={settings.beepVolume}
                            />
                        </div>
                    ) : (
                        // Simple Mode Training
                        <div className="flex-1 flex flex-col h-full bg-surface rounded-2xl border border-border p-4 relative overflow-hidden shadow-sm gap-4">
                            <div className="flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-text"><Clock className="text-primary" /> Free Training</h2>
                                <div className="text-3xl font-mono font-bold text-text tabular-nums">{formatTime(sessionDuration)}</div>
                            </div>
                            
                            <div className="flex-1 min-h-0 bg-background/50 rounded-xl border border-border overflow-hidden">
                                <PlanEditor 
                                    plan={settings.simplePlanText} 
                                    fontSize={settings.planFontSize}
                                    isTraining={true}
                                    onSave={() => {}}
                                    onFontSizeChange={(s) => setSettings(prev => ({...prev, planFontSize: s}))}
                                />
                            </div>
                            
                            <div className="shrink-0 flex justify-center gap-4">
                                <Button variant={simpleModePaused ? 'primary' : 'secondary'} size="lg" onClick={() => setSimpleModePaused(!simpleModePaused)}>
                                    {simpleModePaused ? <Play size={24} /> : <Pause size={24} />}
                                </Button>
                                <Button variant="danger" size="lg" onClick={finishWorkout} className="w-32 text-xs font-bold whitespace-normal leading-tight">
                                    Stop Session
                                </Button>
                            </div>
                        </div>
                    )
                 ) : (
                    // DASHBOARD (IDLE) - Maximize Space
                    <div className="flex flex-col gap-4 h-full">
                        {/* Top Summary Bar - Compact */}
                        <div className="flex gap-4 h-28 shrink-0">
                            {/* Start Card - Wide */}
                            <div className="flex-1 bg-gradient-to-br from-surface to-background border border-border rounded-2xl p-4 flex justify-between items-center shadow-soft relative overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col justify-center relative z-10">
                                    <h2 className="text-2xl font-black mb-1 text-text">Ready to Train?</h2>
                                    <p className="text-xs text-text-muted">{settings.planMode === 'structured' ? settings.currentRoutine.name : "Free-form Session"}</p>
                                </div>
                                <div className="relative z-10 w-40">
                                    <Button size="lg" className="w-full text-base font-bold shadow-lg shadow-primary/25" onClick={initiateSession}>
                                        <Play size={20} className="mr-2 fill-current" /> Start
                                    </Button>
                                </div>
                            </div>

                            {/* Mini Stats Summary - Compact Grid */}
                            <div className="w-64 bg-surface rounded-2xl border border-white/5 p-3 flex flex-col justify-center gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center text-orange-500"><Flame size={16} /></div>
                                    <div className="leading-tight"><div className="text-lg font-bold text-text">{stats.currentStreak}</div><div className="text-[9px] text-text-muted uppercase">Streak</div></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-500"><Clock size={16} /></div>
                                    <div className="leading-tight"><div className="text-lg font-bold text-text">{Math.floor(stats.totalTrainingTime / 60)}</div><div className="text-[9px] text-text-muted uppercase">Mins</div></div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Row: Focus Block (Dynamic Height) */}
                        <div className="shrink-0">
                             <SessionFocusBlock 
                                focusText={settings.sessionFocus}
                                onUpdate={(txt) => setSettings(s => ({...s, sessionFocus: txt}))} 
                            />
                        </div>

                        {/* Bottom: Plan Editor - Expanded */}
                        <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-border shadow-soft bg-surface">
                            {settings.planMode === 'structured' ? (
                                <RoutineEditor 
                                    routine={settings.currentRoutine} 
                                    onUpdate={(r) => setSettings({...settings, currentRoutine: r})} 
                                />
                            ) : (
                                <PlanEditor 
                                    plan={settings.simplePlanText} 
                                    fontSize={settings.planFontSize}
                                    isTraining={false}
                                    onSave={(txt) => setSettings({...settings, simplePlanText: txt})}
                                    onFontSizeChange={(s) => setSettings({...settings, planFontSize: s})}
                                />
                            )}
                        </div>
                    </div>
                 )}
                 
                 {/* 2. VISUALIZER ROW (Only in Training Mode) */}
                 {isTraining && (
                    <div className="flex-1 min-h-[200px] max-h-[350px] shrink-0">
                        <div className="grid grid-cols-2 gap-4 h-full">
                            <PitchTracker 
                                isActive={true} 
                                targetPitch={settings.targetPitch} 
                                onTargetChange={(val) => setSettings({...settings, targetPitch: val})} 
                                livePitchData={livePitchData} 
                            />
                            <AudioVisualizer />
                        </div>
                    </div>
                 )}

              </div>

              {/* --- RIGHT COL: Always Visible (Expanded) --- */}
              <div className={`xl:col-span-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar`}>
                    
                    {/* Vocal Health Chart Moved to Right Col Top */}
                    <div className="bg-surface rounded-2xl border border-border p-4 shadow-soft relative group shrink-0 h-52">
                        <VocalHealthChart sessions={sessions} stats={stats} />
                    </div>

                    <AchievementsWidget unlockedIds={stats.unlockedAchievements} />
                    
                    <div className="flex-1 min-h-[300px]">
                        <GoalsWidget 
                            goals={goals} 
                            onAddGoal={g => setGoals(p => [...p, g])} 
                            onRemoveGoal={id => setGoals(p => p.filter(g => g.id !== id))} 
                            onClaimGoal={handleClaimGoal}
                            onDeleteHistoryEntry={handleDeleteHistoryEntry}
                            stats={stats}
                        />
                    </div>
              </div>
              
           </div>
        </div>
      </main>

      {/* --- MODALS & OVERLAYS --- */}
      
      {appState === AppState.PRE_FLIGHT && (
        <PreFlightCheck 
            onReady={startWorkout} 
            onCancel={() => setAppState(AppState.IDLE)} 
            gain={settings.micGain}
            setGain={(g) => setSettings({...settings, micGain: g})}
            deviceId={settings.inputDeviceId}
        />
      )}

      {appState === AppState.POST_SESSION && (
        <PostSessionModal onSave={saveSessionLog} />
      )}

      <Modal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} title="Analytics" width="max-w-6xl">
        <AnalyticsDashboard stats={stats} recordings={recordings} settings={settings} sessions={sessions} />
      </Modal>

      <Modal isOpen={showHistory} onClose={() => {setShowHistory(false); setHighlightedSessionId(null);}} title="History" width="max-w-4xl">
        <SessionHistory 
            sessions={sessions} 
            onUpdateSession={(s) => setSessions(prev => prev.map(old => old.id === s.id ? s : old))} 
            onDeleteSession={handleDeleteSession} 
            onBulkDelete={handleBulkDeleteSessions}
            highlightedId={highlightedSessionId}
            onJumpToRecording={jumpToRecording}
        />
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Configuration" width="max-w-md">
        <SettingsForm settings={settings} stats={stats} onSave={(s) => { setSettings(s); setShowSettings(false); }} onReset={handleResetApp} appVersion={appVersion} />
      </Modal>

      <Modal isOpen={showRecordings} onClose={() => {setShowRecordings(false); setHighlightedRecordingId(null);}} title="Recordings" width="max-w-5xl">
        <RecordingsManager 
            recordings={recordings} 
            onDelete={handleDeleteRecording} 
            highlightedId={highlightedRecordingId}
            onJumpToSession={jumpToSession}
            sessions={sessions}
        />
      </Modal>

      <Modal isOpen={showSickDay} onClose={() => setShowSickDay(false)} title="Manage Sick Days" width="max-w-lg">
        <div className="p-2">
            <p className="text-sm text-text-muted mb-4">Mark days where you rested due to illness or vocal fatigue. These days won't break your streak.</p>
            <CustomCalendar 
                initialSelectedDates={stats.sickDays} 
                onSave={handleSaveSickDays} 
                onCancel={() => setShowSickDay(false)} 
            />
        </div>
      </Modal>

      <Modal isOpen={showWelcome} onClose={() => setShowWelcome(false)} title="Welcome to VoiceStride!" width="max-w-lg">
        <div className="p-2 space-y-4">
            <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Mic size={32} className="text-white" />
                </div>
            </div>
            
            <h3 className="text-lg font-bold text-center">Let's set up your training!</h3>
            
            <p className="text-sm text-text-muted leading-relaxed">
                By default, <strong>no specific training days are selected</strong>. This means you can train whenever you want!
            </p>
            
            <div className="bg-surface border border-white/5 p-4 rounded-xl flex gap-3">
                <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                <div className="text-xs text-text-muted">
                    <strong className="text-text block mb-1">Tip: Set a Schedule</strong>
                    Go to <strong className="text-primary">Settings</strong> to select your target practice days. This helps the streak counter know which days are "off days" so you don't lose your streak when resting!
                </div>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
                If you are ill, use the <strong>Sick Day</strong> button in the sidebar to mark the day. This preserves your streak without training.
            </p>

            <Button className="w-full mt-4" onClick={() => setShowWelcome(false)}>Get Started</Button>
        </div>
      </Modal>

      <LevelProgressModal isOpen={showLevelModal} onClose={() => setShowLevelModal(false)} stats={stats} />

    </div>
    </>
  );
};

const NavButton = ({ icon, onClick, active, tooltip }: any) => (
    <button 
        onClick={onClick}
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-text'}`}
    >
        {icon}
        <div className="absolute left-12 bg-surface border border-border px-2 py-1 rounded text-xs font-bold text-text opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {tooltip}
        </div>
    </button>
);

export default App;
