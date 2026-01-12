
import React, { useState, useEffect, useRef } from 'react';
import { Recording } from '../types';
import { Trash2, Play, Pause, Search, Calendar, Volume2, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
import { Button } from './Button';
import { getAudioBlob } from '../services/storage';
import { PitchGraph } from './PitchGraph';

interface RecordingsManagerProps {
  recordings: Recording[];
  onDelete: (id: string) => void;
}

export const RecordingsManager: React.FC<RecordingsManagerProps> = ({ recordings, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPitchGraph, setShowPitchGraph] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setPlayingId(null);
        setPlaybackTime(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
            setPlaybackTime(audioRef.current.currentTime * 1000); // convert to ms
        }
      };
    }
    audioRef.current.volume = volume;
    
    // Cleanup audio on unmount
    return () => {
        if(audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    }
  }, [volume]);

  const handlePlay = async (rec: Recording) => {
    if (!audioRef.current) return;

    if (playingId === rec.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      try {
        const blob = await getAudioBlob(rec.id);
        if (blob) {
          if (audioRef.current.src) {
              URL.revokeObjectURL(audioRef.current.src);
          }
          const url = URL.createObjectURL(blob);
          setPlaybackTime(0);
          audioRef.current.src = url;
          audioRef.current.play();
          setPlayingId(rec.id);
        } else {
          alert('Audio file not found in database.');
        }
      } catch (e) {
        console.error("Failed to load audio", e);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this recording permanently?")) {
      if (playingId === id && audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
        setPlaybackTime(0);
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

    audioRef.current.currentTime = newTime;
    setPlaybackTime(newTime * 1000); // Update state immediately for better responsiveness
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

  // Bulk Actions
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
    
    if (confirm(`Are you sure you want to delete ${selectedIds.size} recordings? This action cannot be undone.`)) {
        if (playingId && selectedIds.has(playingId) && audioRef.current) {
            audioRef.current.pause();
            setPlayingId(null);
        }
        
        selectedIds.forEach(id => onDelete(id));
        setSelectedIds(new Set());
    }
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
        <Button variant="outline" onClick={() => setShowPitchGraph(prev => !prev)} title="Toggle Pitch Graph">
            {showPitchGraph ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}
            Graph
        </Button>
      </div>

      {/* Bulk Actions Header */}
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
            const isPlaying = playingId === rec.id;
            const hasGraphData = rec.pitchData && rec.pitchData.length > 0;
            return (
                <div key={rec.id}> 
                    <div 
                        className={`flex items-center justify-between p-3 border transition-all duration-200 ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-surface border-white/5 hover:border-white/10'} ${isPlaying ? 'rounded-t-lg border-b-0' : 'rounded-lg'}`}
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <button 
                                onClick={() => toggleSelection(rec.id)}
                                className={`shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                            >
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                            </button>

                            <Button 
                            size="icon" 
                            variant={isPlaying ? 'primary' : 'secondary'}
                            className="shrink-0"
                            onClick={() => handlePlay(rec)}
                            >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </Button>
                            <div className="min-w-0">
                            <div className={`font-medium truncate ${isSelected ? 'text-primary' : ''}`}>{rec.filename}</div>
                            <div className="text-xs text-text-muted flex items-center gap-2">
                                <Calendar size={12} />
                                {formatDate(rec.date)}
                                <span className="w-1 h-1 bg-text-muted rounded-full" />
                                {formatSeconds(rec.duration)}
                            </div>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger shrink-0" onClick={() => handleDelete(rec.id)}>
                            <Trash2 size={18} />
                        </Button>
                    </div>

                    {isPlaying && (
                      <div className="bg-surface border border-white/5 border-t-0 rounded-b-lg p-3 space-y-3 animate-in fade-in duration-300">
                        {/* Scrubber */}
                        <div className="w-full group flex items-center gap-3">
                          <span className="text-xs font-mono text-text-muted w-12 text-center">{formatSeconds(playbackTime / 1000)}</span>
                          <div 
                            className="flex-1 h-1.5 bg-background rounded-full cursor-pointer group relative"
                            onClick={(e) => handleSeek(e, rec.duration)}
                          >
                            <div 
                              className="absolute top-0 left-0 h-full bg-primary rounded-full"
                              style={{ width: `${(playbackTime / (rec.duration * 1000)) * 100}%` }}
                            />
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                              style={{ left: `${(playbackTime / (rec.duration * 1000)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-text-muted w-12 text-center">{formatSeconds(rec.duration)}</span>
                        </div>
    
                        {/* Graph (if toggled) */}
                        {showPitchGraph && hasGraphData && (
                          <div className="pt-2">
                            <PitchGraph 
                              data={rec.pitchData!}
                              targetPitch={rec.targetPitch}
                              height={150}
                              currentTime={playbackTime}
                            />
                          </div>
                        )}
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
