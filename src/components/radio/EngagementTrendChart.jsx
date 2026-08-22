import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '@/components/shared/GlassCard';
import { TrendingUp } from 'lucide-react';

export default function EngagementTrendChart({ rotationHistory }) {
  const engagementData = useMemo(() => {
    const activeTracks = rotationHistory.filter(track => 
      ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'].includes(track.radio_status)
    );

    const monthlyData = {};
    
    activeTracks.forEach(track => {
      const date = new Date(track.created_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          tracks: 0,
          engagement: 0,
          lightRotation: 0,
          mediumRotation: 0,
          heavyRotation: 0,
          featured: 0,
        };
      }
      
      monthlyData[monthKey].tracks += 1;
      
      const engagementWeights = {
        light_rotation: 10,
        medium_rotation: 25,
        heavy_rotation: 50,
        featured: 100,
      };
      
      monthlyData[monthKey].engagement += engagementWeights[track.radio_status] || 0;
      monthlyData[monthKey][track.radio_status] += 1;
    });

    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
    
    return sortedMonths.map(month => ({
      ...monthlyData[month],
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }));
  }, [rotationHistory]);

  const totalEngagement = engagementData.reduce((sum, d) => sum + d.engagement, 0);
  const avgEngagement = engagementData.length > 0 ? Math.round(totalEngagement / engagementData.length) : 0;

  if (engagementData.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-neon-magenta" />
          <h3 className="font-display font-semibold">Listener Engagement Trend</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No active rotation tracks to display
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neon-magenta" />
          <h3 className="font-display font-semibold">Listener Engagement Trend</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Avg Monthly Engagement</p>
          <p className="text-lg font-display font-bold text-neon-magenta">{avgEngagement}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={engagementData}>
            <defs>
              <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="#d946ef"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEngagement)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Light Rotation', value: engagementData.reduce((sum, d) => sum + d.lightRotation, 0), color: 'text-neon-blue' },
          { label: 'Medium Rotation', value: engagementData.reduce((sum, d) => sum + d.mediumRotation, 0), color: 'text-neon-cyan' },
          { label: 'Heavy Rotation', value: engagementData.reduce((sum, d) => sum + d.heavyRotation, 0), color: 'text-neon-purple' },
          { label: 'Featured', value: engagementData.reduce((sum, d) => sum + d.featured, 0), color: 'text-neon-magenta' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center p-2 rounded-lg bg-secondary/30">
            <p className={`text-sm font-display font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}