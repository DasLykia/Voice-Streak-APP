
import React, { useState, useEffect, useRef } from 'react';
import { Recording, TrainingSession } from '../types';
import { Trash2, Play, Pause, Search, Calendar, Volume2, CheckSquare, Square, Eye, EyeOff, FileText, X } from 'lucide-react';
import { Button } from './Button';
import { getAudioBlob } from '../services/storage';
import { PitchGraph } from './PitchGraph';

interface RecordingsManagerProps {
  recordings: Recording[];
  onDelete: (id: string) => void;
  highlightedId?: string | null;
  onJumpToSession?: (sessionId: string) => void;
  sessions?: TrainingSession[];
}

export const RecordingsManager: React.FC<RecordingsManagerProps> = ({ 
    recordings, onDelete, highlightedId, onJumpToSession, sessions 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // playingId refers to the recording that is currently OPEN/Active in the UI
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  // isPlaying refers to whether the audio is actively running
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [volume, setVolume] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPitchGraph, setShowPitchGraph] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio object once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
            setPlaybackTime(audioRef.current.currentTime * 1000); // convert to ms
        }
      };

      audioRef.current.onpause = () => {
          setIsPlaying(false);
      };
      audioRef.current.onplay = () => {
          setIsPlaying(true);
      };
    }
    
    return () => {
        if(audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    }
  }, []);

  // Handle volume changes separately to avoid re-initializing audio
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  // Handle highlighting
  useEffect(() => {
      if (highlightedId) {
          const rec = recordings.find(r => r.id === highlightedId);
          if (rec) {
              setSearchTerm(rec.filename);
              handlePlay(rec, true); 
              setTimeout(() => {
                  const el = document.getElementById(`recording-${highlightedId}`);
                  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
          }
      }
  }, [highlightedId]);

  const handlePlay = async (rec: Recording, forcePlay = false) => {
    if (!audioRef.current) return;

    if (playingId === rec.id) {
      // Toggle Play/Pause for the currently open recording
      if (isPlaying && !forcePlay) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Play error:", e));
      }
    } else {
      // Switch to new recording
      try {
        // Clean up previous
        if (audioRef.current.src) {
            URL.revokeObjectURL(audioRef.current.src);
        }
        
        const blob = await getAudioBlob(rec.id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPlaybackTime(0);
          audioRef.current.src = url;
          // IMPORTANT: Set volume before playing
          audioRef.current.volume = volume;
          audioRef.current.play().catch(e => console.error("Play error:", e));
          setPlayingId(rec.id);
        } else {
          alert('Audio file not found in database.');
        }
      } catch (e) {
        console.error("Failed to load audio", e);
      }
    }
  };

  const handleClosePlayer = () => {
      if (audioRef.current) {
          audioRef.current.pause();
      }
      setPlayingId(null);
      setIsPlaying(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this recording permanently?")) {
      if (playingId === id) {
        handleClosePlayer();
      }
      onDelete(id);
      if (selectedIds.has(id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
    }
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>, duration: number) => {
    if (!audioRef.current) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = progressBar.clientWidth;
    const seekRatio = Math.max(0, Math.min(1, clickX / width));
    const newTime = seekRatio * duration;

    if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime;
        setPlaybackTime(newTime * 1000); 
    }
  };

  const filtered = recordings
    .filter(r => r.filename.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortOrder === 'desc' ? b.date - a.date : a.date - b.date);

  const formatDate = (ts: number) => new Date(ts).toLocaleString();
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} recordings?`)) {
        if (playingId && selectedIds.has(playingId)) {
            handleClosePlayer();
        }
        selectedIds.forEach(id => onDelete(id));
        setSelectedIds(new Set());
    }
  };

  const findSessionForRecording = (recId: string) => {
      return sessions?.find(s => s.recordingId === recId);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search recordings..."
            className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <Volume2 size={20} className="text-text-muted" />
           <input 
             type="range" 
             min="0" max="1" step="0.1" 
             value={volume}
             onChange={(e) => setVolume(parseFloat(e.target.value))}
             className="w-24 accent-primary"
           />
        </div>
        <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
          Sort Date {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      <div className="flex items-center justify-between bg-surface/50 p-3 rounded-lg border border-white/5 h-12">
         <div className="flex items-center gap-3">
            <button 
                onClick={toggleSelectAll}
                className="text-text-muted hover:text-text transition-colors flex items-center gap-2 text-sm font-medium"
            >
                {selectedIds.size > 0 && selectedIds.size === filtered.length ? (
                    <CheckSquare size={20} className="text-primary" />
                ) : (
                    <Square size={20} className={selectedIds.size > 0 ? "text-primary opacity-50" : ""} />
                )}
                <span className="hidden sm:inline">Select All</span>
            </button>
            {selectedIds.size > 0 && (
                <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-full">
                    {selectedIds.size} Selected
                </span>
            )}
         </div>

         {selectedIds.size > 0 && (
             <Button variant="danger" size="sm" onClick={handleBulkDelete} className="shadow-lg shadow-danger/20">
                 <Trash2 size={16} className="mr-2" /> Delete Selected
             </Button>
         )}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-text-muted">No recordings found.</div>
        ) : (
          filtered.map(rec => {
            const isSelected = selectedIds.has(rec.id);
            const isOpen = playingId === rec.id;
            const hasGraphData = rec.pitchData && rec.pitchData.length > 0;
            const linkedSession = findSessionForRecording(rec.id);

            return (
                <div key={rec.id} id={`recording-${rec.id}`}> 
                    <div 
                        className={`flex items-center justify-between p-3 border transition-all duration-200 ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-surface border-white/5 hover:border-white/10'} ${isOpen ? 'rounded-t-lg border-b-0 bg-surface' : 'rounded-lg'}`}
                    >
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                            <button 
                                onClick={() => toggleSelection(rec.id)}
                                className={`shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                            >
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                            </button>

                            <Button 
                                size="icon" 
                                variant={isOpen && isPlaying ? 'primary' : 'secondary'}
                                className="shrink-0"
                                onClick={() => handlePlay(rec)}
                            >
                                {isOpen && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </Button>
                            <div className="min-w-0 flex-1">
                                <div className={`font-medium truncate ${isSelected ? 'text-primary' : ''}`}>{rec.filename}</div>
                                <div className="text-xs text-text-muted flex items-center gap-2">
                                    <Calendar size={12} />
                                    {formatDate(rec.date)}
                                    <span className="w-1 h-1 bg-text-muted rounded-full" />
                                    {formatSeconds(rec.duration)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {linkedSession && onJumpToSession && (
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => onJumpToSession(linkedSession.id)}
                                    title="View Session History"
                                >
                                    <FileText size={18} />
                                </Button>
                            )}
                            <Button size="icon" variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger shrink-0" onClick={() => handleDelete(rec.id)}>
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    </div>

                    {isOpen && (
                      <div className="bg-surface border border-white/5 border-t-0 rounded-b-lg p-4 space-y-4 animate-in fade-in duration-300 relative">
                        {/* Header Controls inside Open Card */}
                        <div className="flex justify-between items-center text-xs text-text-muted">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowPitchGraph(!showPitchGraph)} className="hover:text-text flex items-center gap-1">
                                    {showPitchGraph ? <EyeOff size={14} /> : <Eye size={14} />} {showPitchGraph ? 'Hide' : 'Show'} Analysis
                                </button>
                            </div>
                            <button onClick={handleClosePlayer} className="hover:text-text p-1 bg-white/5 rounded">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Combined Player Area */}
                        <div className="relative w-full">
                            
                            {/* Pitch Graph Container */}
                            {showPitchGraph && hasGraphData && (
                                <div className="w-full bg-black/20 rounded border border-white/5 mb-8">
                                    <PitchGraph 
                                        data={rec.pitchData!}
                                        targetPitch={rec.targetPitch}
                                        height={150}
                                        currentTime={playbackTime}
                                        containerClassName="w-full"
                                        maxTime={rec.duration * 1000} // Synchronize X-axis scale with scrubber
                                    />
                                </div>
                            )}

                            {/* Scrubber Area - Aligned to graph padding (Left 40px, Right 10px) */}
                            <div className={`relative h-8 w-full ${showPitchGraph && hasGraphData ? '-mt-6' : ''}`}>
                                
                                {/* Timestamps aligned to graph padding */}
                                <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1 pl-[40px] pr-[10px]">
                                    <span className="w-10 text-left">{formatSeconds(playbackTime / 1000)}</span>
                                    <span className="w-10 text-right">{formatSeconds(rec.duration)}</span>
                                </div>

                                {/* Actual Bar Container with specific padding to match graph */}
                                <div className="w-full pl-[40px] pr-[10px] h-3 flex items-center">
                                    <div 
                                        className="w-full h-1.5 bg-background rounded-full cursor-pointer group relative"
                                        onClick={(e) => handleSeek(e, rec.duration)}
                                    >
                                        {/* Progress Fill */}
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-primary rounded-full"
                                            style={{ width: `${(playbackTime / (rec.duration * 1000)) * 100}%` }}
                                        />
                                        
                                        {/* Handle */}
                                        <div 
                                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                            style={{ left: `${(playbackTime / (rec.duration * 1000)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                      </div>
                    )}
                </div>
            );
          })
        )}
      </div>
    </div>
  );
};
