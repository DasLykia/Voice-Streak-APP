
import React, { useState } from 'react';
import { Routine, ExerciseBlock } from '../types';
import { Plus, Trash2, GripVertical, Clock, MessageSquare, Infinity, Coffee, Timer } from 'lucide-react';
import { Button } from './Button';

interface RoutineEditorProps {
  routine: Routine;
  onUpdate: (routine: Routine) => void;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({ routine, onUpdate }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedPromptsIndex, setExpandedPromptsIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const updateBlock = (index: number, field: keyof ExerciseBlock, value: any) => {
    const newBlocks = [...routine.blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    onUpdate({ ...routine, blocks: newBlocks });
  };

  const updatePrompts = (index: number, text: string) => {
      // Allow raw splitting to preserve empty lines while typing (Fixes Enter key issue)
      const prompts = text.split('\n');
      updateBlock(index, 'prompts', prompts);
  };

  const addBlock = (type: 'timed' | 'infinite' | 'rest') => {
    let title = 'New Exercise';
    let duration = 60;
    
    if (type === 'infinite') {
        title = 'Open Practice';
        duration = 0; // 0 represents infinite
    } else if (type === 'rest') {
        title = 'Rest Break';
        duration = 30;
    }

    const newBlock: ExerciseBlock = {
        id: crypto.randomUUID(),
        title,
        duration,
        description: '',
        prompts: []
    };
    onUpdate({ ...routine, blocks: [...routine.blocks, newBlock] });
    setShowAddMenu(false);
  };

  const removeBlock = (index: number) => {
    const newBlocks = routine.blocks.filter((_, i) => i !== index);
    onUpdate({ ...routine, blocks: newBlocks });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    e.currentTarget.classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBlocks = [...routine.blocks];
    const item = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, item);
    
    onUpdate({ ...routine, blocks: newBlocks });
    setDraggedIndex(index);
  };

  const totalTime = routine.blocks.reduce((acc, b) => acc + b.duration, 0);

  return (
    <div className="h-full flex flex-col bg-surface border border-white/5 rounded-xl overflow-hidden relative" onClick={() => setShowAddMenu(false)}>
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
            <div>
                <h3 className="font-bold text-text">Routine Builder</h3>
                <div className="text-xs text-text-muted flex items-center gap-2">
                    <Clock size={12} /> Total Duration: {Math.floor(totalTime / 60)}m {totalTime % 60}s
                </div>
            </div>
            
            <div className="relative">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}>
                    <Plus size={16} className="mr-1" /> Add Block
                </Button>
                {showAddMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col p-1 animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => addBlock('timed')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left text-sm text-text">
                            <div className="bg-primary/20 p-1.5 rounded text-primary"><Timer size={16} /></div>
                            <div>
                                <div className="font-bold">Timed Exercise</div>
                                <div className="text-[10px] text-text-muted">Standard timer</div>
                            </div>
                        </button>
                        <button onClick={() => addBlock('infinite')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left text-sm text-text">
                            <div className="bg-secondary/20 p-1.5 rounded text-secondary"><Infinity size={16} /></div>
                            <div>
                                <div className="font-bold">Open Practice</div>
                                <div className="text-[10px] text-text-muted">Manual advance</div>
                            </div>
                        </button>
                        <button onClick={() => addBlock('rest')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left text-sm text-text">
                            <div className="bg-blue-500/20 p-1.5 rounded text-blue-500"><Coffee size={16} /></div>
                            <div>
                                <div className="font-bold">Rest Break</div>
                                <div className="text-[10px] text-text-muted">Cooldown period</div>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {routine.blocks.map((block, i) => {
                const isInfinite = block.duration === 0;
                
                return (
                    <div 
                        key={block.id} 
                        className={`bg-surface-highlight/50 border border-white/5 rounded-lg p-3 group hover:border-white/10 transition-colors ${draggedIndex === i ? 'border-primary/50 bg-primary/5' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, i)}
                    >
                        <div className="flex gap-3 items-start">
                            {/* Drag Handle */}
                            <div className="flex flex-col gap-1 pt-2 text-text-muted cursor-grab active:cursor-grabbing hover:text-text">
                                <GripVertical size={16} />
                            </div>
                            
                            <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-transparent border-b border-transparent focus:border-primary outline-none font-medium text-sm"
                                        value={block.title}
                                        onChange={(e) => updateBlock(i, 'title', e.target.value)}
                                        placeholder="Exercise Name"
                                    />
                                    <div className="flex items-center gap-1 bg-black/30 px-2 rounded border border-white/5" title={isInfinite ? "Infinite Duration (Manual Advance)" : "Duration in seconds"}>
                                        {isInfinite ? <Infinity size={12} className="text-secondary" /> : <Clock size={12} className="text-text-muted" />}
                                        <input 
                                            type="number"
                                            className={`w-12 bg-transparent text-right text-xs outline-none ${isInfinite ? 'text-secondary font-bold' : ''}`}
                                            value={block.duration}
                                            onChange={(e) => updateBlock(i, 'duration', Math.max(0, parseInt(e.target.value) || 0))}
                                            min={0}
                                        />
                                        <span className="text-xs text-text-muted">s</span>
                                    </div>
                                </div>
                                <textarea 
                                    className="w-full bg-black/20 text-xs text-text-muted p-2 rounded resize-none outline-none focus:ring-1 focus:ring-primary/50"
                                    value={block.description}
                                    onChange={(e) => updateBlock(i, 'description', e.target.value)}
                                    placeholder="Instructions..."
                                    rows={2}
                                />
                                
                                {/* Prompts Toggle */}
                                <div className="pt-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setExpandedPromptsIndex(expandedPromptsIndex === i ? null : i); }}
                                        className={`text-[10px] flex items-center gap-1 font-bold uppercase transition-colors ${expandedPromptsIndex === i ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                                    >
                                        <MessageSquare size={12} /> 
                                        {block.prompts && block.prompts.length > 0 ? `${block.prompts.length} Custom Phrases` : 'Add Phrases'}
                                    </button>
                                    
                                    {expandedPromptsIndex === i && (
                                        <div className="mt-2 animate-in slide-in-from-top-1">
                                            <textarea 
                                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-text outline-none focus:border-primary resize-y"
                                                rows={4}
                                                placeholder="Enter practice phrases, one per line..."
                                                value={block.prompts ? block.prompts.join('\n') : ''}
                                                onChange={(e) => updatePrompts(i, e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <div className="text-[9px] text-text-muted mt-1 text-right">One phrase per line.</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={() => removeBlock(i)} className="text-text-muted hover:text-danger p-1">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
