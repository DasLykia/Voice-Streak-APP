
import React, { useState, useEffect, useRef } from 'react';
import { TrainingSession } from '../types';
import { Clock, Calendar, FileText, ChevronDown, Edit2, Save, X, Trash2, CheckSquare, Square, Mic, Search, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import { PitchGraph } from './PitchGraph';

interface SessionHistoryProps {
  sessions: TrainingSession[];
  onUpdateSession: (session: TrainingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onBulkDelete: (sessionIds: string[]) => void;
  highlightedId?: string | null;
  onJumpToRecording?: (recordingId: string) => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ 
    sessions, onUpdateSession, onDeleteSession, onBulkDelete, highlightedId, onJumpToRecording 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted session
  useEffect(() => {
      if (highlightedId) {
          setExpandedId(highlightedId);
          // Small delay to allow render
          setTimeout(() => {
              const el = document.getElementById(`session-${highlightedId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
      }
  }, [highlightedId]);

  const filteredSessions = sessions.filter(s => {
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      const dateStr = new Date(s.startTime).toLocaleDateString().toLowerCase();
      const notesMatch = s.notes?.toLowerCase().includes(lowerTerm);
      return dateStr.includes(lowerTerm) || notesMatch;
  }).sort((a, b) => b.startTime - a.startTime);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const startEditing = (session: TrainingSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setNoteText(session.notes || '');
    setExpandedId(session.id);
  };

  const saveNote = (session: TrainingSession, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateSession({ ...session, notes: noteText });
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const toggleExpand = (id: string) => {
    if (editingId === id) return; // Don't collapse if editing
    setExpandedId(prev => prev === id ? null : id);
  };

  // Selection Logic
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSessions.length && filteredSessions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} log entries?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this session log entry?")) {
        onDeleteSession(id);
        if (selectedIds.has(id)) {
            const newSelected = new Set(selectedIds);
            newSelected.delete(id);
            setSelectedIds(newSelected);
        }
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center p-8 text-text-muted border border-dashed border-text-muted/20 rounded-xl">
        <p>No training history yet. Start a session to see it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-surface/50 p-2 rounded-lg border border-white/5">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input 
                type="text" 
                placeholder="Search notes or dates..." 
                className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:border-primary outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex items-center gap-2">
            <button 
                onClick={toggleSelectAll}
                className="text-text-muted hover:text-text transition-colors flex items-center gap-2 text-xs font-medium px-2 py-1 rounded hover:bg-white/5"
            >
                {selectedIds.size > 0 && selectedIds.size === filteredSessions.length ? (
                    <CheckSquare size={16} className="text-primary" />
                ) : (
                    <Square size={16} className={selectedIds.size > 0 ? "text-primary opacity-50" : ""} />
                )}
                <span className="hidden sm:inline">Select All</span>
            </button>
            {selectedIds.size > 0 && (
                <Button variant="danger" size="sm" onClick={handleBulkDelete} className="h-7 text-xs px-2">
                    <Trash2 size={14} className="mr-1" /> Delete ({selectedIds.size})
                </Button>
            )}
         </div>
      </div>

      <div ref={listRef} className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No matching sessions found.</div>
        ) : (
            filteredSessions.map((session) => {
            const isSelected = selectedIds.has(session.id);
            const isExpanded = expandedId === session.id;
            const isHighlighted = highlightedId === session.id;

            return (
                <div 
                    id={`session-${session.id}`}
                    key={session.id} 
                    className={`bg-surface rounded-xl border overflow-hidden transition-all duration-200 ${
                        isHighlighted ? 'ring-2 ring-primary border-primary' : ''
                    } ${
                        isSelected ? 'border-primary/30 bg-primary/5' : 'border-white/5 hover:border-white/10'
                    }`}
                >
                    <div className="p-4 flex gap-3 cursor-pointer" onClick={() => toggleExpand(session.id)}>
                        {/* Checkbox Column */}
                        <div className="flex items-start pt-1">
                            <button 
                                onClick={(e) => toggleSelection(session.id, e)}
                                className={`shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                            >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 text-text font-medium">
                                <Calendar size={16} className="text-primary" />
                                {new Date(session.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-text-muted text-sm">
                                        <Clock size={14} />
                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    
                                    {session.recordingId && onJumpToRecording && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onJumpToRecording(session.recordingId!); }}
                                            className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                            title="Go to Recording"
                                        >
                                            <Mic size={14} />
                                        </button>
                                    )}

                                    <button 
                                        onClick={(e) => handleDeleteOne(session.id, e)}
                                        className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                                        title="Delete Entry"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-muted">Duration: <span className="text-text">{formatDuration(session.duration)}</span></span>
                                {!editingId && (
                                    <ChevronDown size={16} className={`text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expandable Section */}
                    {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-300">
                        <div className="w-full h-px bg-white/5 mb-3 ml-8" />
                        <div className="pl-8 space-y-4">
                        {session.pitchData && session.pitchData.length > 0 && (
                            <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Pitch Analysis</h4>
                            <div className="bg-background/50 rounded-lg border border-white/5 p-2">
                                <PitchGraph
                                data={session.pitchData}
                                targetPitch={session.targetPitch}
                                height={150}
                                isScrollable={true}
                                />
                            </div>
                            </div>
                        )}

                        {editingId === session.id ? (
                        <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <textarea
                            className="w-full bg-surface text-text p-3 rounded-lg border border-white/10 focus:ring-2 focus:ring-primary outline-none resize-none text-sm"
                            rows={3}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Add session notes..."
                            autoFocus
                            />
                            <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={cancelEditing}>
                                <X size={14} className="mr-1" /> Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={(e) => saveNote(session, e)}>
                                <Save size={14} className="mr-1" /> Save
                            </Button>
                            </div>
                        </div>
                        ) : (
                        <div className="flex justify-between items-start gap-2 group">
                            <div className="flex-1 text-sm text-text-muted leading-relaxed">
                            {session.notes ? (
                                <div className="flex gap-2">
                                <FileText size={14} className="mt-1 shrink-0 opacity-70" />
                                <span className="whitespace-pre-wrap">{session.notes}</span>
                                </div>
                            ) : (
                                <span className="italic opacity-50">No notes for this session.</span>
                            )}
                            </div>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => startEditing(session, e)}>
                            <Edit2 size={14} />
                            </Button>
                        </div>
                        )}
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
