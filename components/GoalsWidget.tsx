
import React, { useState } from 'react';
import { Goal, UserStats } from '../types';
import { Plus, Trash2, Check, Target, History, Award, X } from 'lucide-react';
import { Button } from './Button';

interface GoalsWidgetProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onRemoveGoal: (id: string) => void;
  onClaimGoal: (id: string) => void;
  onDeleteHistoryEntry: (id: string) => void; // New prop
  stats: UserStats;
}

export const GoalsWidget: React.FC<GoalsWidgetProps> = ({ goals, onAddGoal, onRemoveGoal, onClaimGoal, onDeleteHistoryEntry, stats }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTarget, setNewTarget] = useState('10');
  const [newType, setNewType] = useState<Goal['type']>('sessions');

  const handleAdd = () => {
    if (!newLabel) return;
    
    let startValue = 0;
    switch(newType) {
        case 'sessions': startValue = stats.totalSessions; break;
        case 'duration': startValue = Math.floor(stats.totalTrainingTime / 60); break;
        case 'streak': startValue = stats.currentStreak; break;
    }

    const goal: Goal = {
      id: crypto.randomUUID(),
      label: newLabel,
      type: newType,
      target: parseInt(newTarget) || 1,
      current: startValue, 
      startValue: startValue,
      isCompleted: false
    };
    onAddGoal(goal);
    setNewLabel('');
    setIsAdding(false);
  };

  const completedGoals = stats.goalHistory || [];

  const getGoalTypeLabel = (type: string) => {
      switch(type) {
          case 'sessions': return 'Sessions';
          case 'duration': return 'Minutes';
          case 'streak': return 'Day Streak';
          default: return type;
      }
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/5 p-6 shadow-soft h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="font-bold text-lg flex items-center gap-2 text-text">
          <Target size={20} className="text-secondary" />
          {showHistory ? 'Goal History' : 'Active Goals'}
        </h3>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-primary text-white' : 'text-text-muted hover:bg-white/5'}`}
                title="Goal History"
            >
                <History size={16} />
            </button>
            {!showHistory && (
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
                    <Plus size={16} />
                </Button>
            )}
        </div>
      </div>

      {isAdding && !showHistory && (
        <div className="mb-4 p-4 bg-background rounded-xl border border-white/10 space-y-3 animate-in slide-in-from-top-2 shrink-0">
          <input 
            type="text" 
            placeholder="Goal description..." 
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
              <option value="sessions">Sessions</option>
              <option value="duration">Minutes</option>
              <option value="streak">Streak Days</option>
            </select>
            <input 
              type="number" 
              className="w-20 bg-surface p-2 rounded text-sm outline-none"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              min="1"
              placeholder="Qty"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleAdd}>Add Goal</Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
        {showHistory ? (
            completedGoals.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">No completed goals yet.</p>
            ) : (
                completedGoals.map(goal => (
                    <div key={goal.id} className="p-3 rounded-xl bg-surface-highlight/50 border border-white/5 flex justify-between items-center group">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <Award size={14} className="text-yellow-500 shrink-0" />
                                <span className="text-sm font-medium text-text truncate">{goal.label}</span>
                            </div>
                            <div className="text-[10px] text-text-muted flex gap-2">
                                <span>{new Date(goal.completedAt || 0).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>Target: {goal.target} {getGoalTypeLabel(goal.type)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => onDeleteHistoryEntry(goal.id)}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove Entry"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))
            )
        ) : (
            <>
                {goals.length === 0 && !isAdding && (
                <p className="text-sm text-text-muted text-center py-4">No goals set. Challenge yourself!</p>
                )}
                {goals.map(goal => {
                const progressValue = goal.current - goal.startValue;
                const progressPercent = Math.min(100, Math.max(0, (progressValue / goal.target) * 100));
                
                return (
                    <div key={goal.id} className="relative group p-1">
                        <div className="flex justify-between items-end mb-1 text-sm">
                            <span className={goal.isCompleted ? 'text-secondary font-bold' : 'text-text'}>
                            {goal.label}
                            </span>
                            <span className="text-xs text-text-muted">
                            {progressValue} / {goal.target}
                            </span>
                        </div>
                        
                        <div className="h-2 bg-background rounded-full overflow-hidden relative">
                            <div 
                            className={`h-full transition-all duration-1000 ${goal.isCompleted ? 'bg-secondary' : 'bg-primary'}`}
                            style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        {/* Actions */}
                        <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-surface/80 backdrop-blur-sm pl-2 rounded-l-lg">
                            {goal.isCompleted && (
                                <button
                                    onClick={() => onClaimGoal(goal.id)}
                                    className="p-1.5 bg-secondary text-white rounded-full hover:scale-110 transition-transform shadow-lg animate-pulse"
                                    title="Claim Reward"
                                >
                                    <Check size={14} strokeWidth={3} />
                                </button>
                            )}
                            <button 
                                onClick={() => onRemoveGoal(goal.id)}
                                className="p-1.5 text-danger hover:bg-danger/10 rounded-full transition-colors"
                                title="Delete Goal"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
                })}
            </>
        )}
      </div>
    </div>
  );
};
