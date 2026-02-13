
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

      const usedBins = Math.floor(bufferLength * 0.7); 
      const barCount = 40; 
      const step = Math.floor(usedBins / barCount);
      const barWidth = (width / barCount) / 1.5; 
      const gap = (width - (barWidth * barCount)) / (barCount + 1);

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
            sum += dataArray[(i * step) + j];
        }
        const avg = sum / step;
        
        // Increased Sensitivity:
        // Use a more aggressive scaling factor. 
        // Normalizing avg (0-255) to 0-1, then applying power curve, then scaling up.
        // Multiply by 1.8 to utilize more height for lower volumes.
        const val = Math.pow(avg / 255, 1.0) * 1.8; 
        const barHeight = Math.min(height, val * height);

        // Stronger Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = primaryColor;

        const xPos = gap + (i * (barWidth + gap));
        
        if (barHeight > 2) {
            const yPos = (height - barHeight) / 2;
            ctx.beginPath();
            ctx.roundRect(xPos, yPos, barWidth, barHeight, barWidth/2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
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
