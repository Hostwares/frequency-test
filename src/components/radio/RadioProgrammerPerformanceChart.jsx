import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Music, Radio } from 'lucide-react';
import NeonBadge from '@/components/shared/NeonBadge';
import GlassCard from '@/components/shared/GlassCard';

export default function RadioProgrammerPerformanceChart({ rotationHistory }) {
  // Group tracks by month added
  const tracksByMonth = rotationHistory.reduce((acc, track) => {
    const date = new Date(track.created_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) acc[monthKey] = 0;
    acc[monthKey]++;
    return acc;
  }, {});

  // Convert to array and sort by month
  const chartData = Object.entries(tracksByMonth)
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      tracks: count,
    }))
    .sort((a, b) => new Date(a.month + ' 1') - new Date(b.month + ' 1'))
    .slice(-6); // Last 6 months

  // Calculate status breakdown
  const statusBreakdown = rotationHistory.reduce((acc, track) => {
    const status = track.radio_status || 'light_rotation';
    if (!acc[status]) acc[status] = 0;
    acc[status]++;
    return acc;
  }, {});

  const totalTracks = rotationHistory.length;

  if (totalTracks === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Monthly Additions Chart */}
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm">Monthly Additions</h3>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid #333',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="tracks" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </GlassCard>

      {/* Status Breakdown */}
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-neon-magenta" />
          <h3 className="font-display font-semibold text-sm">Rotation Status</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(statusBreakdown).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <NeonBadge color={
                status === 'heavy_rotation' ? 'magenta' :
                status === 'medium_rotation' ? 'purple' :
                status === 'featured' ? 'cyan' : 'blue'
              }>
                {count} tracks
              </NeonBadge>
            </div>
          ))}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Total</span>
              <NeonBadge color="cyan">{totalTracks} tracks</NeonBadge>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}