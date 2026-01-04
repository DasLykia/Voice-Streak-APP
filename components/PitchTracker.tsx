import React, { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audio';
import { Activity, Target } from 'lucide-react';

interface PitchTrackerProps {
  targetPitch: number;
  onTargetChange: (pitch: number) => void;
  isActive: boolean;
}

export const PitchTracker: React.FC<PitchTrackerProps> = ({ targetPitch, onTargetChange, isActive }) => {
  const [pitch, setPitch] = useState<number>(0);
  const animationRef = useRef<number | null>(null);
  
  // Smoothing
  const historyRef = useRef<number[]>([]);
  const HISTORY_SIZE = 5;

  useEffect(() => {
    if (!isActive) {
      setPitch(0);
      return;
    }

    const updatePitch = () => {
      const detected = audioService.getPitch();
      
      if (detected > 0 && detected < 2000) { // Filter unrealistic values
        const history = historyRef.current;
        history.push(detected);
        if (history.length > HISTORY_SIZE) history.shift();
        
        // Simple moving average
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        setPitch(avg);
      }

      animationRef.current = requestAnimationFrame(updatePitch);
    };

    updatePitch();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive]);

  const difference = Math.abs(pitch - targetPitch);
  const isGood = pitch > 0 && difference <= 5; // Within 5Hz
  const isClose = pitch > 0 && difference <= 15 && !isGood;

  // Visuals
  const getColor = () => {
    if (!isActive) return 'text-text-muted';
    if (pitch <= 0) return 'text-text-muted';
    if (isGood) return 'text-secondary';
    if (isClose) return 'text-yellow-500';
    return 'text-danger';
  };

  const getStatusText = () => {
    if (!isActive) return 'Waiting to start';
    if (pitch <= 0) return 'Listening...';
    if (isGood) return 'Perfect!';
    if (difference < 15) return pitch < targetPitch ? 'Too Low' : 'Too High';
    return pitch < targetPitch ? 'Low' : 'High';
  };

  return (
    <div className="bg-surface rounded-2xl shadow-soft border border-white/5 p-6 flex flex-col gap-4 relative transition-colors duration-300">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-background rounded-lg text-primary shadow-sm">
             <Activity size={18} />
          </div>
          <div>
              <h3 className="font-bold text-sm text-text">Pitch Tracker</h3>
              <p className="text-xs text-text-muted">Real-time Hz monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-white/5">
           <Target size={14} className="text-text-muted ml-2" />
           <input 
             type="number" 
             className="w-12 bg-transparent text-xs font-mono text-center outline-none text-text"
             value={targetPitch}
             onChange={(e) => onTargetChange(Number(e.target.value))}
           />
           <span className="text-[10px] text-text-muted mr-2">Hz</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-2">
         <div className={`text-5xl font-black tabular-nums tracking-tighter transition-colors duration-200 ${getColor()}`}>
           {pitch > 0 ? Math.round(pitch) : '--'}
           <span className="text-lg font-medium text-text-muted ml-1">Hz</span>
         </div>
         <div className={`text-xs font-bold uppercase tracking-wider mt-1 px-3 py-1 rounded-full bg-background/50 ${getColor()}`}>
           {getStatusText()}
         </div>
      </div>

      {/* Visual Bar Indicator */}
      <div className="h-2 w-full bg-background rounded-full overflow-hidden relative">
         {/* Center Marker */}
         <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2 z-10"></div>
         
         {/* Pitch Marker */}
         {pitch > 0 && (
           <div 
             className={`absolute top-0 bottom-0 w-2 rounded-full transition-all duration-100 ${isGood ? 'bg-secondary' : 'bg-primary'}`}
             style={{ 
               left: '50%', 
               transform: `translateX(calc(-50% + ${(pitch - targetPitch) * 2}px))` 
             }}
           />
         )}
      </div>
    </div>
  );
};