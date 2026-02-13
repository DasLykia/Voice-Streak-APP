
import React, { useEffect, useState, useRef } from 'react';
import { audioService } from '../services/audio';
import { Mic, Volume2, Play } from 'lucide-react';
import { Button } from './Button';

interface PreFlightCheckProps {
  onReady: () => void;
  onCancel: () => void;
  gain: number;
  setGain: (val: number) => void;
  deviceId: string;
}

export const PreFlightCheck: React.FC<PreFlightCheckProps> = ({ onReady, onCancel, gain, setGain, deviceId }) => {
  const [volume, setVolume] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [noiseChecked, setNoiseChecked] = useState(false);
  const [isCheckingNoise, setIsCheckingNoise] = useState(false);
  
  useEffect(() => {
    // Start Audio with specific device
    const initAudio = async () => {
        try {
            await audioService.initialize(deviceId);
            audioService.setGain(gain);
            await audioService.resume(); // Explicit resume
        } catch (err) {
            console.error("Mic access denied or error:", err);
        }
    };
    initAudio();

    const interval = setInterval(() => {
        const vol = audioService.getVolume();
        setVolume(Math.min(1, vol * 5)); // Amplify for visual scaling
    }, 50);

    return () => clearInterval(interval);
  }, [gain, deviceId]);

  const checkAmbientNoise = async () => {
    setIsCheckingNoise(true);
    await audioService.resume();
    
    let samples = 0;
    let totalVol = 0;
    const start = Date.now();
    
    const check = () => {
        if (Date.now() - start > 3000) {
            const avg = totalVol / samples;
            setNoiseLevel(avg);
            setNoiseChecked(true);
            setIsCheckingNoise(false);
            return;
        }
        totalVol += audioService.getVolume();
        samples++;
        requestAnimationFrame(check);
    };
    check();
  };

  const handleStart = () => {
    onReady();
  };

  // Sensitivity Threshold lowered to 0.02 for better noise detection
  const NOISE_THRESHOLD = 0.02;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold flex items-center gap-2 text-text">
                <Mic className="text-primary" /> Pre-Flight Check
            </h2>
            <p className="text-sm text-text-muted mt-1">Verify your environment before recording.</p>
        </div>

        <div className="p-6 space-y-6">
            
            {/* 1. Mic Check */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-text-muted">Microphone Input</span>
                    <span className="font-mono text-xs text-text">{Math.round(volume * 100)}%</span>
                </div>
                <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div 
                        className={`h-full transition-all duration-75 ${volume > 0.9 ? 'bg-danger' : 'bg-secondary'}`}
                        style={{ width: `${volume * 100}%` }}
                    />
                    {/* Clipping Marker */}
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500/50" />
                </div>
                <input 
                    type="range" min="0" max="2" step="0.1" 
                    value={gain} 
                    onChange={(e) => setGain(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1 bg-white/10 rounded cursor-pointer"
                />
            </div>

            {/* 2. Noise Check */}
            <div className="bg-surface-highlight p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold flex items-center gap-2 text-text">
                        <Volume2 size={16} /> Ambient Noise
                    </span>
                    {noiseChecked && (
                        <span className={`text-xs px-2 py-1 rounded font-bold ${noiseLevel < NOISE_THRESHOLD ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                            {noiseLevel < NOISE_THRESHOLD ? 'Low' : 'High'}
                        </span>
                    )}
                </div>
                
                {!noiseChecked ? (
                    <Button variant="outline" size="sm" onClick={checkAmbientNoise} disabled={isCheckingNoise} className="w-full">
                        {isCheckingNoise ? 'Analyzing Room...' : 'Check Room Noise'}
                    </Button>
                ) : (
                    <div className="text-xs text-text-muted leading-relaxed">
                        {noiseLevel < NOISE_THRESHOLD 
                            ? "Room is quiet. Ready for high-quality recording."
                            : "Background noise detected. Move to a quieter spot for better results."}
                        <button onClick={() => setNoiseChecked(false)} className="ml-2 text-primary hover:underline">Retry</button>
                    </div>
                )}
            </div>

        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
            <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={handleStart} className="flex-[2] text-base" disabled={false}>
                <Play size={18} className="mr-2 fill-current" /> Start Session
            </Button>
        </div>

      </div>
    </div>
  );
};
