import React, { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audio';
import { Activity, Target, Volume2 } from 'lucide-react';

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

  // Tone generation refs
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Cleanup tone on unmount
    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch(e) {}
        oscRef.current.disconnect();
      }
      if (gainRef.current) gainRef.current.disconnect();
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close();
      }
    };
  }, []);

  const startTone = () => {
    if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (oscRef.current) return; // Already playing

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetPitch, ctx.currentTime);

    // Smooth attack to avoid clicking
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); // Moderate volume

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    oscRef.current = osc;
    gainRef.current = gain;
  };

  const stopTone = () => {
    if (oscRef.current && gainRef.current && ctxRef.current) {
        const osc = oscRef.current;
        const gain = gainRef.current;
        const ctx = ctxRef.current;

        // Smooth release
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.stop(now + 0.05);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 60);

        oscRef.current = null;
        gainRef.current = null;
    }
  };

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
        
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-white/5">
           <button
             onMouseDown={startTone}
             onMouseUp={stopTone}
             onMouseLeave={stopTone}
             onTouchStart={(e) => { e.preventDefault(); startTone(); }}
             onTouchEnd={(e) => { e.preventDefault(); stopTone(); }}
             className="p-1.5 text-text-muted hover:text-primary hover:bg-white/5 rounded-md transition-colors active:scale-95 active:text-primary focus:outline-none"
             title="Hold to play target tone"
           >
             <Volume2 size={16} />
           </button>
           <div className="w-px h-4 bg-white/10 mx-1"></div>
           <Target size={14} className="text-text-muted ml-1" />
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