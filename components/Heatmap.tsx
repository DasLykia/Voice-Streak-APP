
import React, { useState, useMemo } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { UserStats } from '../types';
import { AlignLeft, Clock } from 'lucide-react';

interface HeatmapProps {
  stats: UserStats;
}

export const Heatmap: React.FC<HeatmapProps> = ({ stats }) => {
  const [hoverInfo, setHoverInfo] = useState<{date: string, value: string, x: number, y: number} | null>(null);
  const [metric, setMetric] = useState<'minutes' | 'sessions'>('sessions');

  // 2. Grid Generation (Last 52 weeks like GitHub)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysToRender = 364; // 52 weeks * 7 days

  // Calculate start date manually (today - 52 weeks)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToRender);
  
  // Calculate start of week manually (Align to Sunday)
  const calendarStart = new Date(startDate);
  const dayOfWeek = calendarStart.getDay(); // 0 (Sun) to 6 (Sat)
  calendarStart.setDate(calendarStart.getDate() - dayOfWeek);

  const endDate = today;

  const allDays = eachDayOfInterval({ start: calendarStart, end: endDate });

  // Group into weeks [Sun...Sat]
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  allDays.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
      }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // 3. Style Logic
  const getStyle = (value: number) => {
    if (!value || value <= 0) return { className: 'bg-slate-200 dark:bg-white/5' };
    
    if (metric === 'minutes') {
        const mins = value / 60;
        // Gradual scaling: 0 to 30 mins -> 0.2 to 1.0 opacity equivalent
        // We use primary color and adjust opacity via inline style for granularity
        const ratio = Math.min(1, mins / 30);
        const opacity = 0.2 + (ratio * 0.8); // Min visibility 0.2, max 1.0
        
        return {
            className: 'bg-primary',
            style: { opacity }
        };
    } else {
        // Sessions: Simple On/Off or tiers
        if (value >= 1) return { className: 'bg-primary' };
        return { className: 'bg-slate-200 dark:bg-white/5' };
    }
  };

  // 4. Month Labels
  const monthLabels: { label: string, index: number }[] = [];
  weeks.forEach((week, i) => {
      const firstDay = week[0];
      if (getDate(firstDay) <= 7 && i > 0 && weeks[i-1][0].getMonth() !== firstDay.getMonth()) {
          monthLabels.push({ label: format(firstDay, 'MMM'), index: i });
      } else if (i===0) {
          monthLabels.push({ label: format(firstDay, 'MMM'), index: i });
      }
  });

  function getDate(d: Date) { return d.getDate(); }

  return (
    <div className="flex flex-col w-full h-full">
        {/* Header Control */}
        <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold uppercase text-text-muted flex items-center gap-2">
                Activity
            </h4>
            <div className="flex bg-surface-highlight rounded-lg p-0.5 border border-border">
                <button 
                    onClick={() => setMetric('minutes')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${metric === 'minutes' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <Clock size={10} /> Mins
                </button>
                <button 
                    onClick={() => setMetric('sessions')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${metric === 'sessions' ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <AlignLeft size={10} /> Sess
                </button>
            </div>
        </div>
        
        {/* Graph Container */}
        <div className="flex-1 flex flex-col justify-center overflow-x-auto custom-scrollbar pb-2 relative">
            <div className="min-w-max flex gap-1">
                {/* Day Labels (Left) */}
                <div className="flex flex-col gap-[3px] pr-2 pt-5 text-[9px] text-text-muted font-mono leading-[10px]">
                    <div className="h-[10px]"></div> {/* Sun */}
                    <div className="h-[10px]">Mon</div>
                    <div className="h-[10px]"></div>
                    <div className="h-[10px]">Wed</div>
                    <div className="h-[10px]"></div>
                    <div className="h-[10px]">Fri</div>
                    <div className="h-[10px]"></div>
                </div>

                {/* The Grid */}
                <div className="flex flex-col gap-1">
                    {/* Month Labels Row */}
                    <div className="flex h-4 relative mb-1">
                        {monthLabels.map((m, i) => (
                            <div 
                                key={i} 
                                className="absolute text-[9px] text-text-muted font-bold uppercase"
                                style={{ left: `${m.index * 14}px` }} 
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>

                    {/* Boxes */}
                    <div className="flex gap-[3px]">
                        {weeks.map((week, wIndex) => (
                            <div key={wIndex} className="flex flex-col gap-[3px]">
                                {week.map((day, dIndex) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    let val = 0;
                                    
                                    if (metric === 'minutes') {
                                        val = stats.history[dateKey] || 0;
                                    } else {
                                        val = stats.sessionCounts?.[dateKey] || 0;
                                    }

                                    const displayVal = metric === 'minutes' ? `${Math.round(val/60)}m` : `${val}`;
                                    const { className, style } = getStyle(val);
                                    
                                    return (
                                        <div 
                                            key={dateKey}
                                            className={`w-[10px] h-[10px] rounded-[2px] transition-colors relative group ${className}`}
                                            style={style}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoverInfo({
                                                    date: format(day, 'MMM do, yyyy'),
                                                    value: displayVal,
                                                    x: rect.left + rect.width / 2,
                                                    y: rect.top
                                                });
                                            }}
                                            onMouseLeave={() => setHoverInfo(null)}
                                        >
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Tooltip Overlay */}
        {hoverInfo && (
            <div 
                className="fixed z-[9999] pointer-events-none bg-surface border border-border px-2 py-1 rounded text-xs shadow-xl flex flex-col items-center -translate-x-1/2 -translate-y-full mt-[-6px]"
                style={{ left: hoverInfo.x, top: hoverInfo.y }}
            >
                <span className="font-bold text-text whitespace-nowrap">{hoverInfo.value}</span>
                <span className="text-[10px] text-text-muted whitespace-nowrap">{hoverInfo.date}</span>
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-b border-r border-border rotate-45"></div>
            </div>
        )}
    </div>
  );
};
