import React, { useState } from 'react';
import { Goal } from '../types';
import { Plus, Trash2, CheckCircle2, Target } from 'lucide-react';
import { Button } from './Button';

interface GoalsWidgetProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onRemoveGoal: (id: string) => void;
}

export const GoalsWidget: React.FC<GoalsWidgetProps> = ({ goals, onAddGoal, onRemoveGoal }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTarget, setNewTarget] = useState('10');
  const [newType, setNewType] = useState<Goal['type']>('sessions');

  const handleAdd = () => {
    if (!newLabel) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      label: newLabel,
      type: newType,
      target: parseInt(newTarget) || 1,
      current: 0,
      isCompleted: false
    };
    onAddGoal(goal);
    setNewLabel('');
    setIsAdding(false);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/5 p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2 text-text">
          <Target size={20} className="text-secondary" />
          Goals
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={16} />
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-background rounded-xl border border-white/10 space-y-3 animate-in slide-in-from-top-2">
          <input 
            type="text" 
            placeholder="Goal description (e.g. 'Hit 50 sessions')" 
            className="w-full bg-surface p-2 rounded text-sm outline-none border border-transparent focus:border-primary"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <div className="flex gap-2">
            <select 
              className="bg-surface p-2 rounded text-sm flex-1 outline-none"
              value={newType}
              onChange={e => setNewType(e.target.value as any)}
            >
              <option value="sessions">Total Sessions</option>
              <option value="duration">Minutes (Total)</option>
              <option value="streak">Streak (Days)</option>
            </select>
            <input 
              type="number" 
              className="w-20 bg-surface p-2 rounded text-sm outline-none"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              min="1"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleAdd}>Add Goal</Button>
        </div>
      )}

      <div className="space-y-3">
        {goals.length === 0 && !isAdding && (
          <p className="text-sm text-text-muted text-center py-4">No goals set. Challenge yourself!</p>
        )}
        {goals.map(goal => {
          const progress = Math.min(100, (goal.current / goal.target) * 100);
          return (
            <div key={goal.id} className="relative group">
              <div className="flex justify-between items-end mb-1 text-sm">
                <span className={goal.isCompleted ? 'text-secondary font-medium' : 'text-text'}>
                  {goal.label}
                </span>
                <span className="text-xs text-text-muted">
                  {goal.current} / {goal.target} {goal.type === 'duration' ? 'm' : ''}
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${goal.isCompleted ? 'bg-secondary' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button 
                onClick={() => onRemoveGoal(goal.id)}
                className="absolute -right-2 -top-2 p-1 bg-surface rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:bg-danger/10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};