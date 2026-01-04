import React from 'react';
import { UserStats } from '../types';
import { Flame, Clock, Trophy, Calendar } from 'lucide-react';
import { formatDuration } from 'date-fns';

interface StatsPanelProps {
  stats: UserStats;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-surface p-4 rounded-lg border border-white/5">
    <div className={`flex items-center gap-3 mb-2 ${color}`}>
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</span>
    </div>
    <div className="text-2xl font-bold text-text">{value}</div>
  </div>
);

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const avgDuration = stats.totalSessions > 0 
    ? Math.round(stats.totalTrainingTime / stats.totalSessions) 
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy className="text-yellow-500" size={20} />
        Your Progress
      </h3>
      
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
        <StatCard 
          icon={<Flame size={18} />} 
          label="Current Streak" 
          value={`${stats.currentStreak} Days`} 
          color="text-orange-500"
        />
        <StatCard 
          icon={<Clock size={18} />} 
          label="Total Time" 
          value={formatTime(stats.totalTrainingTime)} 
          color="text-blue-500"
        />
        <StatCard 
          icon={<Calendar size={18} />} 
          label="Total Sessions" 
          value={stats.totalSessions.toString()} 
          color="text-purple-500"
        />
        <StatCard 
          icon={<Clock size={18} />} 
          label="Avg. Session" 
          value={formatTime(avgDuration)} 
          color="text-green-500"
        />
      </div>
    </div>
  );
};