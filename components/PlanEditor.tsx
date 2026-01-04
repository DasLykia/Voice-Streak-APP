import React, { useState } from 'react';
import { Button } from './Button';
import { Edit2, Save, X, Type, Minus, Plus } from 'lucide-react';

interface PlanEditorProps {
  plan: string;
  fontSize: number;
  onSave: (newPlan: string) => void;
  onFontSizeChange: (newSize: number) => void;
  isTraining: boolean;
}

export const PlanEditor: React.FC<PlanEditorProps> = ({ plan, fontSize, onSave, onFontSizeChange, isTraining }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(plan);

  const handleSave = () => {
    onSave(text);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(plan);
    setIsEditing(false);
  };

  // Font size handlers
  const increaseFont = () => onFontSizeChange(Math.min(32, fontSize + 2));
  const decreaseFont = () => onFontSizeChange(Math.max(12, fontSize - 2));

  return (
    <div className="h-full flex flex-col bg-surface border border-white/5 rounded-2xl shadow-soft overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-white/5 bg-background/30 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-text">Training Plan</h2>
          
          {/* Font Controls */}
          <div className="flex items-center gap-1 bg-surface/50 rounded-lg p-1 border border-white/5">
            <button onClick={decreaseFont} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-text transition-colors">
              <Minus size={14} />
            </button>
            <div className="flex items-center gap-1 px-2 text-xs font-mono text-text-muted select-none min-w-[3rem] justify-center">
              <Type size={12} /> {fontSize}px
            </div>
            <button onClick={increaseFont} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-text transition-colors">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X size={16} className="mr-2" /> Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                <Save size={16} className="mr-2" /> Save
              </Button>
            </div>
          ) : (
            !isTraining && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} className="mr-2" /> Edit
              </Button>
            )
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-surface/50 min-h-0">
        {isEditing ? (
          <textarea
            className="w-full h-full bg-transparent text-text p-6 font-mono leading-relaxed outline-none resize-none focus:bg-surface/80 transition-colors custom-scrollbar overflow-y-auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontSize: `${fontSize}px` }}
            autoFocus
          />
        ) : (
          <div 
            className="w-full h-full overflow-y-auto p-6 whitespace-pre-wrap font-sans leading-relaxed text-text/90 custom-scrollbar"
            style={{ fontSize: `${fontSize}px` }}
          >
            {plan}
          </div>
        )}
      </div>
    </div>
  );
};