import React, { useMemo } from 'react';
import { UserStats, Recording, AppSettings } from '../types';
import { BarChart3, Calendar, Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import { calculateStreaks } from '../services/stats';

interface AnalyticsDashboardProps {
  stats: UserStats;
  recordings: Recording[];
  settings: AppSettings;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext?: string; color: string }> = ({ 
  icon, label, value, subtext, color 
}) => (
  <div className="bg-surface/50 p-5 rounded-xl border border-white/5 flex flex-col gap-2 relative overflow-hidden group hover:bg-surface transition-colors">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color} transform scale-150`}>
      {icon}
    </div>
    <div className={`flex items-center gap-2 ${color} z-10`}>
      {icon}
      <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{label}</span>
    </div>
    <div className="text-3xl font-black text-text z-10 tracking-tight">{value}</div>
    {subtext && <div className="text-xs text-text-muted z-10">{subtext}</div>}
  </div>
);

const SimpleBarChart: React.FC<{ data: { label: string; value: number; color?: string; tooltip?: string }[]; height?: number }> = ({ data, height = 220 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 5); 
  const steps = 4;
  // Create nice round ticks
  const ticks = Array.from({length: steps + 1}, (_, i) => Math.round((maxValue / steps) * i)).reverse();

  return (
    <div className="w-full flex flex-col select-none" style={{ height: `${height}px` }}>
      <div className="flex-1 relative">
        
        {/* Grid and Y-Axis */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {ticks.map((tick, i) => (
            <div key={i} className="flex items-center w-full h-0 relative">
               {/* Y-Label */}
               <div className="w-8 text-[10px] font-mono text-text-muted text-right pr-3 absolute right-full -translate-y-1/2 flex items-center justify-end h-4">
                 {tick}
               </div>
               {/* Grid Line */}
               <div className="w-full h-px bg-black/5 dark:bg-white/5 border-t border-dashed border-black/5 dark:border-white/10" />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="absolute inset-0 flex items-end justify-between pl-2 pb-[1px]">
           {data.map((d, i) => (
             <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative px-1 z-10">
                {/* The Bar */}
                {d.value > 0 && (
                  <div 
                    className={`w-full max-w-[28px] rounded-t-sm transition-all duration-500 ease-out ${d.color} opacity-90 group-hover:opacity-100 group-hover:shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]`}
                    style={{ height: `${(d.value / Math.max(maxValue, 1)) * 100}%` }}
                  >
                    {/* Hover Tooltip - High Contrast (Inverse of theme) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border border-transparent px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none whitespace-nowrap -translate-y-2 group-hover:translate-y-0">
                      {d.tooltip || d.value}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800 dark:border-t-slate-100" />
                    </div>
                  </div>
                )}
             </div>
           ))}
        </div>
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between pl-2 mt-3 border-t border-black/5 dark:border-white/5 pt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center flex justify-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate px-1">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ stats, recordings, settings }) => {
  
  // 1. Calculate Longest Streak
  const longestStreak = useMemo(() => {
    const { longestStreak } = calculateStreaks(stats.history, stats.sickDays);
    return longestStreak;
  }, [stats.history, stats.sickDays]);

  // 2. Day of Week Frequency (Mon-Sun)
  const dayFrequency = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Normalize date keys for lookup
    const normalize = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    const freq = new Array(7).fill(0);
    
    Object.keys(stats.history).forEach(dateStr => {
      const date = normalize(dateStr);
      if (date) {
        const jsDay = date.getDay(); // 0-6 Sun-Sat
        // Convert to Mon-Sun index (0-6) -> Mon(1)->0, ..., Sat(6)->5, Sun(0)->6
        const index = jsDay === 0 ? 6 : jsDay - 1;
        freq[index]++;
      }
    });

    return days.map((label, i) => {
      const jsDay = i === 6 ? 0 : i + 1;
      const isScheduled = settings.trainingDays.includes(jsDay);
      
      return {
        label,
        fullLabel: fullDays[i],
        value: freq[i],
        tooltip: `${freq[i]} Sessions`,
        // Stronger colors for better visibility
        color: isScheduled 
            ? 'bg-secondary' // Scheduled days = Green (Emerald)
            : 'bg-slate-400 dark:bg-white/10' // Off days = Slate 400 (visible in light mode) / Dark Transparent
      };
    });
  }, [stats.history, settings.trainingDays]);

  // 3. Last 7 Days Recording Volume
  const weeklyVolume = useMemo(() => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      // Local ISO string match for comparison
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      
      const duration = recordings
        .filter(r => {
            const rDate = new Date(r.date);
            const rYear = rDate.getFullYear();
            const rMonth = String(rDate.getMonth() + 1).padStart(2, '0');
            const rDay = String(rDate.getDate()).padStart(2, '0');
            return `${rYear}-${rMonth}-${rDay}` === isoDate;
        })
        .reduce((acc, curr) => acc + curr.duration, 0);
      
      const mins = Math.round(duration / 60);

      last7Days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: mins, 
        tooltip: `${mins} mins`,
        // Primary color for volume bars
        color: duration > 0 ? 'bg-primary' : 'bg-slate-400 dark:bg-white/10',
        fullDate: isoDate
      });
    }
    return last7Days;
  }, [recordings]);

  // Insights Helper
  const getMostActiveDay = () => {
    const max = dayFrequency.reduce((a, b) => a.value > b.value ? a : b);
    return max.value > 0 ? max.fullLabel + 's' : 'any specific day yet';
  };

  const getLeastActiveDay = () => {
    const min = dayFrequency.reduce((a, b) => a.value < b.value ? a : b);
    return min.fullLabel + 's';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Trophy />} 
          label="Longest Streak" 
          value={`${longestStreak} Days`} 
          color="text-yellow-500" 
          subtext="Personal Best"
        />
        <StatCard 
          icon={<Clock />} 
          label="Practice Volume" 
          value={`${Math.round(stats.totalTrainingTime / 60)} m`} 
          color="text-blue-500" 
          subtext="Total recorded time"
        />
        <StatCard 
          icon={<Target />} 
          label="Completion" 
          value={`${Object.keys(stats.history).length}`} 
          color="text-emerald-500" 
          subtext="Total active days"
        />
        <StatCard 
          icon={<Calendar />} 
          label="Recordings" 
          value={`${recordings.length}`} 
          color="text-purple-500" 
          subtext={`${(recordings.reduce((a,c)=>a+c.size,0)/1024/1024).toFixed(1)} MB Used`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="bg-surface rounded-xl p-6 border border-black/5 dark:border-white/5 pl-10">
          <div className="flex items-center justify-between mb-6 -ml-4">
            <h3 className="font-bold flex items-center gap-2 text-text">
              <TrendingUp size={18} className="text-primary" />
              Recording Volume
            </h3>
            <span className="text-xs text-text-muted font-mono bg-background/50 px-2 py-1 rounded">Minutes</span>
          </div>
          <SimpleBarChart data={weeklyVolume} height={200} />
        </div>

        {/* Day Preference Chart */}
        <div className="bg-surface rounded-xl p-6 border border-black/5 dark:border-white/5 pl-10">
          <div className="flex items-center justify-between mb-6 -ml-4">
            <h3 className="font-bold flex items-center gap-2 text-text">
              <BarChart3 size={18} className="text-secondary" />
              Training Frequency
            </h3>
            <span className="text-xs text-text-muted font-mono bg-background/50 px-2 py-1 rounded">Sessions</span>
          </div>
          <SimpleBarChart data={dayFrequency} height={200} />
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-text-muted border-t border-black/5 dark:border-white/5 pt-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary shadow-sm"></div> 
                <span className="font-medium">Scheduled</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-white/10 border border-black/5 dark:border-white/10"></div> 
                <span className="font-medium">Off Day</span>
             </div>
          </div>
        </div>
      </div>

      {/* Insight Strip */}
      <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg border border-primary/20 flex items-start gap-4">
        <div className="p-2 bg-primary/20 rounded-lg text-primary shadow-lg shadow-primary/10">
          <Target size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sm mb-1 text-primary-hover">Training Insight</h4>
          <p className="text-sm text-text-muted">
            You tend to train most on <strong className="text-text capitalize">{getMostActiveDay()}</strong>. 
            Consider adding a light session on {getLeastActiveDay()} to balance your weekly load.
          </p>
        </div>
      </div>

    </div>
  );
};