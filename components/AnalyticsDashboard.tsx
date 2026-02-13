
import React, { useMemo } from 'react';
import { UserStats, Recording, AppSettings, TrainingSession } from '../types';
import { BarChart3, Calendar, Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import { calculateStreaks } from '../services/stats';
import { Heatmap } from './Heatmap';

interface AnalyticsDashboardProps {
  stats: UserStats;
  recordings: Recording[];
  settings: AppSettings;
  sessions: TrainingSession[];
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext?: string; color: string }> = ({ 
  icon, label, value, subtext, color 
}) => (
  <div className="bg-surface/50 p-5 rounded-xl border border-border flex flex-col gap-2 relative overflow-hidden group hover:bg-surface transition-colors shadow-soft">
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
  const ticks = Array.from({length: steps + 1}, (_, i) => Math.round((maxValue / steps) * i)).reverse();

  return (
    <div className="w-full flex flex-col select-none" style={{ height: `${height}px` }}>
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {ticks.map((tick, i) => (
            <div key={i} className="flex items-center w-full h-0 relative">
               <div className="w-8 text-[10px] font-mono text-text-muted text-right pr-3 absolute right-full -translate-y-1/2 flex items-center justify-end h-4">
                 {tick}
               </div>
               <div className="w-full h-px bg-border border-t border-dashed border-border" />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-end justify-between pl-2 pb-[1px]">
           {data.map((d, i) => (
             <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative px-1 z-10">
                {d.value > 0 && (
                  <div 
                    className={`w-full max-w-[28px] rounded-t-sm transition-all duration-500 ease-out ${d.color} opacity-90 group-hover:opacity-100 shadow-sm`}
                    style={{ height: `${(d.value / Math.max(maxValue, 1)) * 100}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-text text-surface border border-transparent px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none whitespace-nowrap -translate-y-2 group-hover:translate-y-0">
                      {d.tooltip || d.value}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-text" />
                    </div>
                  </div>
                )}
             </div>
           ))}
        </div>
      </div>

      <div className="flex justify-between pl-2 mt-3 border-t border-border pt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center flex justify-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate px-1">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ stats, recordings, settings, sessions }) => {
  const longestStreak = useMemo(() => {
    const { longestStreak } = calculateStreaks(stats.history, stats.sickDays);
    return longestStreak;
  }, [stats.history, stats.sickDays]);

  const dayFrequency = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Use consistent local date parsing
    const normalize = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        if(!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    const freq = new Array(7).fill(0);
    
    Object.keys(stats.history).forEach(dateStr => {
      const date = normalize(dateStr);
      if (date) {
        const jsDay = date.getDay(); // 0 = Sun
        const index = jsDay === 0 ? 6 : jsDay - 1; // 0 = Mon
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
        color: isScheduled ? 'bg-secondary' : 'bg-slate-300 dark:bg-white/10' 
      };
    });
  }, [stats.history, settings.trainingDays]);

  const weeklyVolume = useMemo(() => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      
      // Use persisted history for volume if available, fallback to recordings for backward compatibility
      // Note: stats.history is aggregated all-time, so we can check if the key exists.
      // But stats.history is cumulative for the day.
      
      const duration = stats.history[isoDate] || 0;
      
      const mins = Math.round(duration / 60);

      last7Days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: mins, 
        tooltip: `${mins} mins`,
        color: duration > 0 ? 'bg-primary' : 'bg-slate-300 dark:bg-white/10',
        fullDate: isoDate
      });
    }
    return last7Days;
  }, [stats.history]);

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

      {/* Heatmap Section */}
      <div className="bg-surface rounded-xl p-6 border border-border shadow-soft">
         <Heatmap stats={stats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl p-6 border border-border shadow-soft pl-10">
          <div className="flex items-center justify-between mb-6 -ml-4">
            <h3 className="font-bold flex items-center gap-2 text-text">
              <TrendingUp size={18} className="text-primary" />
              Recording Volume
            </h3>
            <span className="text-xs text-text-muted font-mono bg-background/50 px-2 py-1 rounded">Minutes</span>
          </div>
          <SimpleBarChart data={weeklyVolume} height={200} />
        </div>

        <div className="bg-surface rounded-xl p-6 border border-border shadow-soft pl-10">
          <div className="flex items-center justify-between mb-6 -ml-4">
            <h3 className="font-bold flex items-center gap-2 text-text">
              <BarChart3 size={18} className="text-secondary" />
              Training Frequency
            </h3>
            <span className="text-xs text-text-muted font-mono bg-background/50 px-2 py-1 rounded">Sessions</span>
          </div>
          <SimpleBarChart data={dayFrequency} height={200} />
          
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-text-muted border-t border-border pt-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary shadow-sm"></div> 
                <span className="font-medium">Scheduled</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-white/10 border border-border"></div> 
                <span className="font-medium">Off Day</span>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg border border-primary/20 flex items-start gap-4">
        <div className="p-2 bg-primary/20 rounded-lg text-primary shadow-lg shadow-primary/10">
          <Target size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold mb-1 text-primary-hover">Training Insight</h4>
          <p className="text-sm text-text-muted">
            You tend to train most on <strong className="text-text capitalize">{getMostActiveDay()}</strong>. 
            Consider adding a light session on {getLeastActiveDay()} to balance your weekly load.
          </p>
        </div>
      </div>

    </div>
  );
};
