
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrainingSession, UserStats } from '../types';
import { format } from 'date-fns';
import { Activity, Info } from 'lucide-react';

interface VocalHealthChartProps {
  sessions: TrainingSession[];
  stats?: UserStats; // Added stats prop
}

export const VocalHealthChart: React.FC<VocalHealthChartProps> = ({ sessions, stats }) => {
  // Prefer stats.healthTrends if available (persistent), otherwise fallback to session logs
  let chartData: { date: string; effort: number; duration: number }[] = [];

  if (stats && stats.healthTrends && stats.healthTrends.length > 0) {
      chartData = stats.healthTrends.map(t => ({
          date: format(t.date, 'MMM d'),
          effort: t.effort,
          duration: Math.round(t.duration / 60)
      }));
  } else {
      chartData = sessions
        .filter(s => s.healthLog)
        .sort((a, b) => a.startTime - b.startTime)
        .map(s => ({
            date: format(s.startTime, 'MMM d'),
            effort: s.healthLog?.effort || 0,
            duration: Math.round(s.duration / 60)
        }));
  }

  // Limit to last 15 points
  const displayData = chartData.slice(-15);

  if (displayData.length < 2) return (
    <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-lg bg-surface/30">
        <Activity className="text-text-muted mb-2" size={24} />
        <h4 className="text-sm font-bold text-text">Vocal Health Tracking</h4>
        <p className="text-xs text-text-muted mt-1 max-w-[200px]">
            Complete a few sessions to see your Strain vs. Duration analysis here.
        </p>
    </div>
  );

  return (
    <div className="h-48 w-full relative">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h4 className="text-xs font-bold uppercase text-text-muted flex items-center gap-2">
                    Health Trends
                </h4>
                <div className="flex gap-3 text-[10px] mt-1">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger"/> Effort (1-10)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"/> Mins</span>
                </div>
            </div>
            
            <div className="group relative">
                <Info size={16} className="text-text-muted cursor-help hover:text-text transition-colors" />
                <div className="absolute right-0 top-6 w-48 p-2 bg-surface border border-border rounded-lg shadow-xl text-[10px] text-text-muted z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Tracks self-reported effort vs session duration. High effort with long duration may indicate strain.
                </div>
            </div>
        </div>
        
        <div className="h-[calc(100%-32px)] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                        cursor={{stroke: 'var(--text-muted)', strokeWidth: 1}}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="effort" stroke="var(--col-danger)" strokeWidth={2} dot={{ r: 3, fill: 'var(--col-danger)' }} name="Effort" />
                    <Line yAxisId="right" type="monotone" dataKey="duration" stroke="var(--col-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--col-primary)' }} name="Mins" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};
