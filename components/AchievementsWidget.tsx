import React from 'react';
import { Achievement } from '../types';
import { Trophy, Lock } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../constants';

interface AchievementsWidgetProps {
  unlockedIds: string[];
}

export const AchievementsWidget: React.FC<AchievementsWidgetProps> = ({ unlockedIds }) => {
  return (
    <div className="bg-surface rounded-2xl border border-white/5 p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-yellow-500" />
        <h3 className="font-bold text-lg text-text">Achievements</h3>
        <span className="ml-auto text-xs font-mono text-text-muted bg-background px-2 py-1 rounded-full">
          {unlockedIds.length} / {ACHIEVEMENTS_LIST.length}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACHIEVEMENTS_LIST.map(ach => {
          const isUnlocked = unlockedIds.includes(ach.id);
          return (
            <div 
              key={ach.id} 
              className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
                isUnlocked 
                  ? 'bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/20' 
                  : 'bg-background/50 border-white/5 opacity-60 grayscale'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-yellow-500 text-black' : 'bg-surface text-text-muted'}`}>
                {isUnlocked ? <Trophy size={18} /> : <Lock size={16} />}
              </div>
              <div>
                <div className="text-xs font-bold truncate w-full">{ach.title}</div>
                <div className="text-[10px] text-text-muted leading-tight mt-1">{ach.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};