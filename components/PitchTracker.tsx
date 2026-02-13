
import React, { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audio';
import { Radio, Volume2, Maximize2 } from 'lucide-react';
import { PitchGraph } from './PitchGraph';
import { PitchDataPoint } from '../types';

interface PitchTrackerProps {
  targetPitch: number;
  onTargetChange: (pitch: number) => void;
  isActive: boolean;
  livePitchData: PitchDataPoint[];
}

export const PitchTracker: React.FC<PitchTrackerProps> = ({ targetPitch, onTargetChange, isActive, livePitchData }) => {
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
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (oscRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetPitch, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);

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
      historyRef.current = [];
      return;
    }

    const updatePitch = () => {
      const detected = audioService.getPitch();
      
      if (detected > 0 && detected < 2000) {
        const history = historyRef.current;
        history.push(detected);
        if (history.length > HISTORY_SIZE) history.shift();
        
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        setPitch(avg);
      } else {
        setPitch(-1);
      }

      animationRef.current = requestAnimationFrame(updatePitch);
    };

    updatePitch();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive]);

  const difference = Math.abs(pitch - targetPitch);
  const isGood = pitch > 0 && difference <= 5;
  const isClose = pitch > 0 && difference <= 15 && !isGood;

  const getColor = () => {
    if (!isActive) return 'text-text-muted';
    if (pitch <= 0) return 'text-text-muted';
    if (isGood) return 'text-secondary drop-shadow-[0_0_8px_rgba(var(--col-secondary),0.5)]';
    if (isClose) return 'text-yellow-500';
    return 'text-danger';
  };

  const getStatusText = () => {
    if (!isActive) return 'STANDBY';
    if (pitch <= 0) return 'LISTENING';
    if (isGood) return 'LOCKED';
    if (difference < 15) return pitch < targetPitch ? 'LOW' : 'HIGH';
    return pitch < targetPitch ? 'TOO LOW' : 'TOO HIGH';
  };

  return (
    <div className="glass-panel rounded-2xl p-0 flex flex-col relative overflow-hidden h-full w-full border border-border bg-surface/50">
      
      {/* Deviation Bar - Moved to Top */}
      <div className="h-1.5 w-full bg-black/20 dark:bg-black/60 relative shrink-0">
         <div className="absolute left-1/2 top-0 bottom-0 w-px bg-text/20 -translate-x-1/2 z-10"></div>
         {pitch > 0 && (
           <div 
             className={`absolute top-0 bottom-0 w-8 h-1.5 rounded-full transition-transform duration-100 ease-linear shadow-sm ${isGood ? 'bg-secondary' : 'bg-primary'}`}
             style={{ 
               left: '50%', 
               marginLeft: '-16px', // Center the bar width
               transform: `translateX(${(pitch - targetPitch) * 3}px)` 
             }}
           />
         )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background/20 shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={14} className={`text-primary ${isActive ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">Pitch</span>
        </div>
        
        <div className="flex items-center gap-2">
           <button
             onMouseDown={startTone}
             onMouseUp={stopTone}
             onMouseLeave={stopTone}
             onTouchStart={(e) => { e.preventDefault(); startTone(); }}
             onTouchEnd={(e) => { e.preventDefault(); stopTone(); }}
             className="text-[10px] font-mono text-primary hover:text-white transition-colors bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded"
           >
             REF TONE
           </button>
           <div className="flex items-center bg-black/40 rounded px-2 py-0.5 border border-white/5 relative z-20">
             <span className="text-[10px] text-text-muted mr-1">TARGET</span>
             <input 
               type="number" 
               className="w-8 bg-transparent text-[10px] font-mono text-center outline-none text-white font-bold appearance-none"
               value={targetPitch}
               onChange={(e) => onTargetChange(parseInt(e.target.value) || 0)}
             />
             <span className="text-[8px] text-primary ml-0.5">HZ</span>
           </div>
        </div>
      </div>

      {/* Main Display Container */}
      <div className="flex-1 flex flex-col relative min-h-0">
        <div className="absolute inset-0 z-0 opacity-50">
            <PitchGraph 
                data={livePitchData}
                targetPitch={targetPitch}
                height="100%"
                timeWindow={30000}
                isLive={true}
            />
        </div>
        
        {/* HUD Overlay - Centered with text */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 gap-1 pointer-events-none">
            <div className={`text-5xl lg:text-6xl font-mono font-bold tracking-tighter transition-all duration-100 ${getColor()}`}>
                {pitch > 0 ? Math.round(pitch) : '---'}
            </div>
            <div className={`text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full border border-border bg-surface/80 backdrop-blur-sm ${isActive ? (isGood ? 'text-secondary border-secondary/30' : 'text-text-muted') : 'text-text-muted'}`}>
                {getStatusText()}
            </div>
        </div>
      </div>
    </div>
  );
};
