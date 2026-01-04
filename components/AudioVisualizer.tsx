import React, { useEffect, useRef } from 'react';
import { audioService } from '../services/audio';
import { Waves } from 'lucide-react';

export const AudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    // Handle resizing
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

      // Clear with transparency
      ctx.clearRect(0, 0, width, height);

      if (!analyser) {
        // Draw idle line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        
        // Use CSS variable for color adaptation
        const idleColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
        ctx.strokeStyle = idleColor || '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Dynamic Gradient based on CSS variables
      const computedStyle = getComputedStyle(document.body);
      const colorStart = computedStyle.getPropertyValue('--col-primary').trim() || '#6366f1';
      const colorEnd = computedStyle.getPropertyValue('--col-secondary').trim() || '#10b981';

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);

      ctx.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;

        // Rounded top bars look modern
        if (barHeight > 0) {
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        }

        x += barWidth + 1;
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-surface rounded-2xl shadow-soft border border-white/5 p-6 flex flex-col gap-4 min-h-[200px] relative overflow-hidden transition-colors duration-300">
      <div className="flex items-center gap-2 mb-2 z-10">
        <div className="p-1.5 bg-background rounded-lg text-primary shadow-sm">
           <Waves size={18} />
        </div>
        <div>
            <h3 className="font-bold text-sm text-text">Audio Visualizer</h3>
            <p className="text-xs text-text-muted">Live frequency spectrum</p>
        </div>
      </div>
      
      <div className="flex-1 relative z-10 min-h-0">
         <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Background Decor */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
    </div>
  );
};