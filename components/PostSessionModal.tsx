
import React, { useState } from 'react';
import { Button } from './Button';
import { VocalHealthLog } from '../types';
import { Frown, Meh, Smile, AlertCircle } from 'lucide-react';

interface PostSessionModalProps {
  onSave: (log: VocalHealthLog) => void;
}

export const PostSessionModal: React.FC<PostSessionModalProps> = ({ onSave }) => {
  const [effort, setEffort] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSave({ effort, clarity, notes });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-8">
        
        <div className="text-center">
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            <p className="text-text-muted">Take a moment to check in with your voice.</p>
        </div>

        {/* Effort Slider */}
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold uppercase text-text-muted">Vocal Effort</label>
                <span className={`text-xl font-bold ${effort > 7 ? 'text-danger' : 'text-primary'}`}>{effort}/10</span>
            </div>
            <input 
                type="range" min="1" max="10" step="1"
                value={effort}
                onChange={(e) => setEffort(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted px-1">
                <span>Effortless</span>
                <span>Strained</span>
            </div>
            {effort >= 8 && (
                <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 p-2 rounded border border-danger/20">
                    <AlertCircle size={14} /> Warning: High effort detected. Rest recommended.
                </div>
            )}
        </div>

        {/* Clarity Scale */}
        <div className="space-y-3">
            <label className="text-sm font-bold uppercase text-text-muted block">Vocal Clarity</label>
            <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                    <button
                        key={val}
                        onClick={() => setClarity(val)}
                        className={`flex-1 h-12 rounded-lg border flex items-center justify-center transition-all ${
                            clarity === val 
                            ? 'bg-secondary text-white border-secondary' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                    >
                        {val === 1 && <Frown size={20} />}
                        {val === 3 && <Meh size={20} />}
                        {val === 5 && <Smile size={20} />}
                        {!([1,3,5].includes(val)) && <span className="font-bold">{val}</span>}
                    </button>
                ))}
            </div>
        </div>

        {/* Journal */}
        <div>
            <label className="text-sm font-bold uppercase text-text-muted block mb-2">Journal Notes</label>
            <textarea 
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none resize-none h-24"
                placeholder="How did it feel? Any soreness or phlegm?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
        </div>

        <Button size="lg" className="w-full" onClick={handleSubmit}>Save Log</Button>

      </div>
    </div>
  );
};
