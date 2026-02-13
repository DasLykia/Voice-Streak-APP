
import React, { useState, useEffect, useRef } from 'react';
import { Routine, ExerciseBlock } from '../types';
import { Play, Pause, SkipForward, SkipBack, CheckCircle2, ChevronLeft, ChevronRight, Infinity } from 'lucide-react';
import { Button } from './Button';

interface SessionPlayerProps {
  routine: Routine;
  onComplete: () => void;
  onStop: () => void;
  beepVolume: number;
}

export const SessionPlayer: React.FC<SessionPlayerProps> = ({ routine, onComplete, onStop, beepVolume }) => {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(routine.blocks[0]?.duration || 60);
  const [elapsedInBlock, setElapsedInBlock] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const block = routine.blocks[currentBlockIndex];
  const nextBlock = routine.blocks[currentBlockIndex + 1];
  const isInfinite = block.duration === 0;

  // Filter out empty lines from editing
  const activePrompts = (block.prompts || []).filter(p => p.trim().length > 0);

  const totalRoutineTime = routine.blocks.reduce((acc, b) => acc + b.duration, 0);
  const elapsedPrev = routine.blocks.slice(0, currentBlockIndex).reduce((acc, b) => acc + b.duration, 0);
  const totalElapsed = elapsedPrev + (isInfinite ? 0 : (block.duration - timeLeft));
  const progress = totalRoutineTime > 0 ? Math.min(100, (totalElapsed / totalRoutineTime) * 100) : 0;

  useEffect(() => {
    // Reset prompt index and elapsed time when block changes
    setCurrentPromptIndex(0);
    setElapsedInBlock(0);
  }, [currentBlockIndex]);

  useEffect(() => {
    // Handle Timed & Infinite Blocks
    let interval: number;
    if (!isPaused) {
        interval = window.setInterval(() => {
            if (isInfinite) {
                setElapsedInBlock(prev => prev + 1);
            } else {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleNextBlock();
                        return 0; 
                    }
                    return prev - 1;
                });
            }
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, currentBlockIndex, isInfinite]);

  // Audio Cue
  const playBeep = () => {
    if (beepVolume <= 0) return;
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = 440; // A4
        gain.gain.value = beepVolume;
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
        console.error("Beep error", e);
    }
  };

  const handleNextBlock = () => {
    if (currentBlockIndex < routine.blocks.length - 1) {
        playBeep();
        const nextIndex = currentBlockIndex + 1;
        setCurrentBlockIndex(nextIndex);
        setTimeLeft(routine.blocks[nextIndex].duration);
    } else {
        playBeep();
        setTimeout(playBeep, 250); 
        onComplete();
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) {
        const prevIndex = currentBlockIndex - 1;
        setCurrentBlockIndex(prevIndex);
        setTimeLeft(routine.blocks[prevIndex].duration);
    }
  };

  const nextPrompt = () => {
      setCurrentPromptIndex((prev) => (prev + 1) % activePrompts.length);
  };

  const prevPrompt = () => {
      setCurrentPromptIndex((prev) => (prev - 1 + activePrompts.length) % activePrompts.length);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-surface/50 rounded-2xl border border-white/5 p-6 relative overflow-hidden">
        {/* Progress Bar Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 z-10">
            <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Current Exercise</span>
                <h2 className="text-4xl font-black text-text">{block.title}</h2>
            </div>

            <div className="flex flex-col items-center justify-center h-[140px]">
                {isInfinite ? (
                    <>
                        <div className="text-[100px] font-mono font-bold leading-none tracking-tighter text-text tabular-nums drop-shadow-2xl">
                            {formatTime(elapsedInBlock)}
                        </div>
                        <div className="flex items-center gap-2 text-secondary animate-pulse mt-2">
                            <Infinity size={24} />
                            <span className="text-xs font-bold uppercase tracking-widest">Open Mode</span>
                        </div>
                    </>
                ) : (
                    <div className="text-[120px] font-mono font-bold leading-none tracking-tighter text-text tabular-nums drop-shadow-2xl">
                        {formatTime(timeLeft)}
                    </div>
                )}
            </div>

            {(block.description || activePrompts.length > 0) && (
                <div className="bg-black/10 dark:bg-black/30 p-4 rounded-xl max-w-xl border border-white/5 w-full relative group">
                    {block.description && (
                        <p className="text-text-muted text-sm italic mb-4">"{block.description}"</p>
                    )}
                    
                    {activePrompts.length > 0 && (
                        <>
                            <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-4">
                                <button 
                                    onClick={prevPrompt}
                                    className="p-2 text-text-muted hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                
                                <div className="flex-1 min-h-[3rem] flex items-center justify-center">
                                    <p className="text-lg font-medium text-primary break-words leading-tight transition-all">
                                        "{activePrompts[currentPromptIndex]}"
                                    </p>
                                </div>

                                <button 
                                    onClick={nextPrompt}
                                    className="p-2 text-text-muted hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            
                            <div className="absolute bottom-2 right-4 text-[9px] text-text-muted opacity-50">
                                {currentPromptIndex + 1} / {activePrompts.length}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Next Up Preview */}
        {nextBlock && (
            <div className="absolute bottom-24 right-6 text-right opacity-50 hidden md:block">
                <div className="text-xs uppercase font-bold text-text-muted">Up Next</div>
                <div className="font-bold text-text">{nextBlock.title}</div>
            </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center pt-6 border-t border-white/5 z-10">
            <Button variant="danger" onClick={onStop}>Stop Session</Button>
            
            <div className="flex gap-4">
                <Button variant="outline" onClick={handlePrevBlock} disabled={currentBlockIndex === 0}>
                    <SkipBack size={20} />
                </Button>
                
                <Button variant="primary" size="lg" className="w-32" onClick={() => setIsPaused(!isPaused)}>
                    {isPaused ? <Play size={24} className="fill-current" /> : <Pause size={24} className="fill-current" />}
                </Button>

                <Button variant={isInfinite ? "primary" : "outline"} onClick={handleNextBlock} className={isInfinite ? "shadow-glow" : ""}>
                    {isInfinite ? "Done / Next" : <SkipForward size={20} />}
                </Button>
            </div>

            <div className="text-xs text-text-muted font-mono w-[100px] text-right">
                BLOCK {currentBlockIndex + 1}/{routine.blocks.length}
            </div>
        </div>
    </div>
  );
};
