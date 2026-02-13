
import React, { useEffect, useRef } from 'react';
import { audioService } from '../services/audio';
import { Activity } from 'lucide-react';

export const AudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas.parentElement) {
          canvas.width = entry.contentRect.width;
          canvas.height = entry.contentRect.height;
        }
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const renderFrame = () => {
      animationFrameId = requestAnimationFrame(renderFrame);
      
      const analyser = audioService.getAnalyser();
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Theme Colors
      const computedStyle = getComputedStyle(document.body);
      const primaryColor = computedStyle.getPropertyValue('--col-primary').trim() || '#8b5cf6';
      const secondaryColor = computedStyle.getPropertyValue('--col-secondary').trim() || '#10b981';

      if (!analyser) {
        // Idle Animation - subtle pulse line
        const time = Date.now() / 1000;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let x = 0; x < width; x+=5) {
            const y = (height / 2) + Math.sin(x * 0.05 + time) * 5;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Focus on voice frequencies (approx 0 - 4000Hz). 
      // bufferLength corresponds to Nyquist (half sample rate ~24kHz).
      // So we only need the first ~1/6th of bins for a cleaner vocal visualizer.
      const usefulBinCount = Math.floor(bufferLength * 0.15); 
      
      const barCount = 32; // Cleaner, fewer bars
      const step = Math.ceil(usefulBinCount / barCount);
      const gapRatio = 0.3;
      const totalBarWidth = width / barCount;
      const barWidth = totalBarWidth * (1 - gapRatio);
      const gap = totalBarWidth * gapRatio;

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
            // Safe access
            const idx = (i * step) + j;
            if (idx < bufferLength) {
                sum += dataArray[idx];
            }
        }
        const avg = sum / step;
        
        // Logarithmic-ish scaling for better visual response to volume
        // Normalize 0-255 to 0-1
        let val = avg / 255;
        
        // Apply threshold to cut low noise
        if (val < 0.05) val = 0;
        
        // Non-linear boost for visibility but limit max height
        // Using a curve that flattens out to avoid "too big" bars for high volume/tones
        val = Math.pow(val, 1.5); 
        
        // Add a base height for aesthetic if sound is present
        const renderedHeight = val > 0 ? Math.max(4, val * height * 0.8) : 2; 

        // Rounded bars logic
        const xPos = (i * (barWidth + gap)) + (gap / 2); // Center distributed
        const yPos = (height - renderedHeight) / 2; // Center vertically
        
        ctx.beginPath();
        // Modern rounded pill shape
        ctx.roundRect(xPos, yPos, barWidth, renderedHeight, barWidth / 2);
        ctx.fill();
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="glass-panel rounded-2xl p-0 flex flex-col relative overflow-hidden transition-colors duration-300 w-full h-full bg-black/20 border border-white/5">
      
      {/* Label Overlay */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
          <Activity size={12} className="text-primary animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">Spectrum</span>
      </div>

      <div className="flex-1 relative z-10 w-full h-full">
         <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
    </div>
  );
};
