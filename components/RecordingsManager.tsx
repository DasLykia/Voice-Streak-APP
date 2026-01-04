import React, { useState, useEffect, useRef } from 'react';
import { Recording } from '../types';
import { Trash2, Play, Pause, Search, Calendar, Volume2, CheckSquare, Square, Check } from 'lucide-react';
import { Button } from './Button';
import { getAudioBlob } from '../services/storage';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingId(null);
    }
    audioRef.current.volume = volume;
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
          const url = URL.createObjectURL(blob);
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
      }
      onDelete(id);
      if (selectedIds.has(id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
    }
  };

  const filtered = recordings
    .filter(r => r.filename.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortOrder === 'desc' ? b.date - a.date : a.date - b.date);

  const formatDate = (ts: number) => new Date(ts).toLocaleString();
  const formatDuration = (sec: number) => {
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
        // Stop playback if playing one of the deleted items
        if (playingId && selectedIds.has(playingId) && audioRef.current) {
            audioRef.current.pause();
            setPlayingId(null);
        }
        
        // Execute deletions
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
            return (
                <div 
                    key={rec.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-surface border-white/5 hover:border-white/10'}`}
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
                    variant={playingId === rec.id ? 'primary' : 'secondary'}
                    className="shrink-0"
                    onClick={() => handlePlay(rec)}
                    >
                    {playingId === rec.id ? <Pause size={18} /> : <Play size={18} />}
                    </Button>
                    <div className="min-w-0">
                    <div className={`font-medium truncate ${isSelected ? 'text-primary' : ''}`}>{rec.filename}</div>
                    <div className="text-xs text-text-muted flex items-center gap-2">
                        <Calendar size={12} />
                        {formatDate(rec.date)}
                        <span className="w-1 h-1 bg-text-muted rounded-full" />
                        {formatDuration(rec.duration)}
                    </div>
                    </div>
                </div>
                <Button size="icon" variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger shrink-0" onClick={() => handleDelete(rec.id)}>
                    <Trash2 size={18} />
                </Button>
                </div>
            );
          })
        )}
      </div>
    </div>
  );
};