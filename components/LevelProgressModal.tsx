
import React, { useEffect, useRef } from 'react';
import { UserStats } from '../types';
import { XP_LEVEL_BASE, LEVEL_REWARDS, THEMES } from '../constants';
import { CheckCircle2, Lock, Palette, Trophy, Star } from 'lucide-react';
import { Button } from './Button';

interface LevelProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
}

export const LevelProgressModal: React.FC<LevelProgressModalProps> = ({ isOpen, onClose, stats }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentLevel = stats.level;
  const currentXP = stats.xp;
  const nextLevelXP = currentLevel * XP_LEVEL_BASE;
  const progress = Math.min(100, (currentXP / nextLevelXP) * 100);

  // Generate levels 1 to 50
  const levels = Array.from({ length: 50 }, (_, i) => i + 1);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const currentEl = document.getElementById(`level-${currentLevel}`);
      if (currentEl) {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen, currentLevel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent shrink-0">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-3xl font-black text-text italic">LEVEL PROGRESS</h2>
                    <p className="text-text-muted text-sm">Earn XP by training to unlock themes and badges!</p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-black text-primary drop-shadow-glow">Lvl {currentLevel}</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
                    <span>Current Progress</span>
                    <span>{Math.floor(currentXP)} / {nextLevelXP} XP</span>
                </div>
                <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                    <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 relative" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Scrollable Timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 relative">
            <div className="absolute left-[2.25rem] top-0 bottom-0 w-1 bg-white/5 -z-10"></div>
            
            {levels.map((lvl) => {
                const isReached = lvl <= currentLevel;
                const isCurrent = lvl === currentLevel;
                const isNext = lvl === currentLevel + 1;
                
                const reward = LEVEL_REWARDS.find(r => r.level === lvl);
                
                return (
                    <div key={lvl} id={`level-${lvl}`} className={`flex gap-6 items-center relative ${isReached ? 'opacity-100' : 'opacity-60'}`}>
                        {/* Level Circle */}
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm z-10 transition-all ${
                            isReached 
                                ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(var(--col-primary),0.5)]' 
                                : 'bg-surface border-white/10 text-text-muted'
                        }`}>
                            {lvl}
                        </div>

                        {/* Card */}
                        <div className={`flex-1 p-4 rounded-xl border transition-all ${
                            isCurrent 
                                ? 'bg-primary/10 border-primary/50 shadow-soft ring-1 ring-primary/30' 
                                : 'bg-surface border-white/5'
                        }`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className={`text-sm font-bold ${isReached ? 'text-text' : 'text-text-muted'}`}>
                                        {isReached ? 'Level Reached' : 'Locked'}
                                    </div>
                                    {reward ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            {reward.type === 'theme' ? <Palette size={16} className="text-secondary" /> : <Trophy size={16} className="text-yellow-500" />}
                                            <span className="font-medium text-secondary">{reward.label}</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-text-muted mt-1">Standard Level Up</div>
                                    )}
                                </div>

                                <div className="text-right">
                                    {isReached ? (
                                        <CheckCircle2 className="text-primary" size={24} />
                                    ) : (
                                        <Lock className="text-text-muted" size={20} />
                                    )}
                                </div>
                            </div>
                            
                            {reward && (
                                <div className="mt-2 text-xs text-text-muted bg-black/20 p-2 rounded border border-white/5">
                                    {reward.description}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="p-4 border-t border-white/5 flex justify-center bg-surface">
            <Button onClick={onClose} className="w-full max-w-sm">Close</Button>
        </div>

      </div>
    </div>
  );
};
