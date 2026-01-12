
import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { PitchDataPoint } from '../types';

interface PitchGraphProps {
  data: PitchDataPoint[];
  targetPitch?: number;
  height?: number;
  timeWindow?: number; // in ms
  currentTime?: number; // in ms for playback cursor
  isLive?: boolean;
  isScrollable?: boolean;
  containerClassName?: string;
}

const PITCH_MIN = 50; // Min Hz to display
const PITCH_MAX = 500; // Max Hz to display
const PADDING = { top: 10, right: 10, bottom: 20, left: 40 };

export const PitchGraph: React.FC<PitchGraphProps> = ({
  data,
  targetPitch,
  height = 150,
  timeWindow = 60000,
  currentTime,
  isLive = false,
  isScrollable = false,
  containerClassName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // For scrollable graph, width is based on data length. Otherwise, it fits the container.
  const canvasWidth = isScrollable
    ? Math.max(containerRef.current?.clientWidth || 0, (data[data.length - 1]?.time || 0) / 10)
    : containerRef.current?.clientWidth || 0;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return;
    
    // For non-scrollable, fit to container width on resize
    if (!isScrollable) {
      const resizeObserver = new ResizeObserver(() => {
        // Trigger a re-render by updating a dummy state or by re-calling the draw logic
        // This is simplified here; a state update would be more robust.
        drawGraph();
      });
      resizeObserver.observe(container);
      
      // Cleanup
      return () => resizeObserver.disconnect();
    }
  }, [isScrollable]);


  const drawGraph = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const currentWidth = isScrollable ? canvasWidth : container.clientWidth;

    canvas.width = currentWidth * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${currentWidth}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const graphWidth = currentWidth - PADDING.left - PADDING.right;
    const graphHeight = height - PADDING.top - PADDING.bottom;

    const now = data.length > 0 ? data[data.length - 1].time : 0;
    const timeMin = isLive ? Math.max(0, now - timeWindow) : 0;
    const timeMax = isLive ? timeMin + timeWindow : (data[data.length - 1]?.time || timeWindow);

    const toX = (time: number) => PADDING.left + ((time - timeMin) / (timeMax - timeMin)) * graphWidth;
    const toY = (pitch: number) => PADDING.top + graphHeight - ((Math.max(0, pitch) - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * graphHeight;

    ctx.clearRect(0, 0, currentWidth, height);
    
    const style = getComputedStyle(document.documentElement);
    const mutedColor = style.getPropertyValue('--text-muted').trim();
    const primaryColor = style.getPropertyValue('--col-primary').trim();
    const secondaryColor = style.getPropertyValue('--col-secondary').trim();

    // 1. Draw Grid & Labels
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = mutedColor;

    const pitchLines = [100, 200, 300, 400];
    pitchLines.forEach(p => {
        if (p >= PITCH_MIN && p <= PITCH_MAX) {
            const y = toY(p);
            ctx.fillText(`${p}Hz`, PADDING.left - 8, y + 3);
            ctx.beginPath();
            ctx.moveTo(PADDING.left, y);
            ctx.lineTo(PADDING.left + graphWidth, y);
            ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    });

    // 2. Draw Target Pitch Line
    if (targetPitch && targetPitch >= PITCH_MIN && targetPitch <= PITCH_MAX) {
      const y = toY(targetPitch);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + graphWidth, y);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Pitch Data Line
    ctx.beginPath();
    let firstPoint = true;
    const visibleData = isLive ? data.filter(p => p.time >= timeMin) : data;
    for (const point of visibleData) {
        if (point.pitch > 0) {
          if (firstPoint) {
            ctx.moveTo(toX(point.time), toY(point.pitch));
            firstPoint = false;
          } else {
            ctx.lineTo(toX(point.time), toY(point.pitch));
          }
        } else {
          firstPoint = true; 
        }
    }
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 4. Draw Playback Cursor
    if (currentTime !== undefined) {
        const x = toX(currentTime);
        if (x >= PADDING.left && x <= PADDING.left + graphWidth) {
          ctx.beginPath();
          ctx.moveTo(x, PADDING.top);
          ctx.lineTo(x, PADDING.top + graphHeight);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
    }
  };

  useEffect(() => {
    drawGraph();
  }, [data, targetPitch, canvasWidth, height, timeWindow, isLive, currentTime, isScrollable]);
  
  // Auto-scroll for live graph
  useEffect(() => {
      if(isLive && containerRef.current) {
          containerRef.current.scrollLeft = containerRef.current.scrollWidth;
      }
  }, [data, isLive]);

  return (
    <div
      ref={containerRef}
      className={`${containerClassName || ''} ${isScrollable ? 'overflow-x-auto custom-scrollbar' : 'overflow-hidden'}`}
      style={{ height: `${height}px` }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
