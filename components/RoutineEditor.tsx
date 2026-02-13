
import React, { useState } from 'react';
import { Routine, ExerciseBlock } from '../types';
import { Plus, Trash2, GripVertical, Clock } from 'lucide-react';
import { Button } from './Button';

interface RoutineEditorProps {
  routine: Routine;
  onUpdate: (routine: Routine) => void;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({ routine, onUpdate }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const updateBlock = (index: number, field: keyof ExerciseBlock, value: any) => {
    const newBlocks = [...routine.blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    onUpdate({ ...routine, blocks: newBlocks });
  };

  const addBlock = () => {
    const newBlock: ExerciseBlock = {
        id: crypto.randomUUID(),
        title: 'New Exercise',
        duration: 60,
        description: ''
    };
    onUpdate({ ...routine, blocks: [...routine.blocks, newBlock] });
  };

  const removeBlock = (index: number) => {
    const newBlocks = routine.blocks.filter((_, i) => i !== index);
    onUpdate({ ...routine, blocks: newBlocks });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Slight transparency for drag ghost
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
    <div className="h-full flex flex-col bg-surface border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <div>
                <h3 className="font-bold text-text">Routine Builder</h3>
                <div className="text-xs text-text-muted flex items-center gap-2">
                    <Clock size={12} /> Total Duration: {Math.floor(totalTime / 60)}m {totalTime % 60}s
                </div>
            </div>
            <Button size="sm" onClick={addBlock}>
                <Plus size={16} className="mr-1" /> Add Block
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {routine.blocks.map((block, i) => (
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
                                <div className="flex items-center gap-1 bg-black/30 px-2 rounded border border-white/5">
                                    <Clock size={12} className="text-text-muted" />
                                    <input 
                                        type="number"
                                        className="w-12 bg-transparent text-right text-xs outline-none"
                                        value={block.duration}
                                        onChange={(e) => updateBlock(i, 'duration', parseInt(e.target.value) || 0)}
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
                        </div>

                        <button onClick={() => removeBlock(i)} className="text-text-muted hover:text-danger p-1">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
