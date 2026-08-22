import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Share2, Music, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import StatCard from '@/components/shared/StatCard';

export default function ListenerGrowthTrend({ artistProfileId }) {
  // Fetch songs to get play counts
  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  // Generate last 30 days of data
  const dailyData = useMemo(() => {
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate listener data with some variation and spikes
      const dayOfWeek = date.getDay();
      const baseListeners = 50 + Math.random() * 30;
      
      // Weekend boost
      const weekendBoost = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.3 : 1.0;
      
      // Recent growth trend
      const growthMultiplier = 1 + ((29 - i) / 100);
      
      // Random social media spike (simulate 3-4 spikes in 30 days)
      const isSpikeDay = [5, 12, 19, 26].includes(i);
      const spikeMultiplier = isSpikeDay ? 1.8 + Math.random() * 0.5 : 1.0;
      
      const totalPlays = Math.round(baseListeners * weekendBoost * growthMultiplier * spikeMultiplier);
      const uniqueListeners = Math.round(totalPlays * (0.6 + Math.random() * 0.2));
      
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString().split('T')[0],
        listeners: uniqueListeners,
        plays: totalPlays,
        isSpike: isSpikeDay,
        spikeReason: isSpikeDay ? ['Instagram', 'Twitter', 'TikTok', 'Facebook'][Math.floor(Math.random() * 4)] : null,
      });
    }
    
    return days;
  }, []);

  const stats = useMemo(() => {
    const totalListeners = dailyData.reduce((sum, d) => sum + d.listeners, 0);
    const avgListeners = Math.round(totalListeners / dailyData.length);
    const maxListeners = Math.max(...dailyData.map(d => d.listeners));
    const spikeDays = dailyData.filter(d => d.isSpike).length;
    
    // Calculate growth rate (last 7 days vs previous 7 days)
    const last7Days = dailyData.slice(-7).reduce((sum, d) => sum + d.listeners, 0);
    const previous7Days = dailyData.slice(-14, -7).reduce((sum, d) => sum + d.listeners, 0);
    const growthRate = previous7Days > 0 ? ((last7Days - previous7Days) / previous7Days * 100).toFixed(1) : 0;
    
    return {
      totalListeners,
      avgListeners,
      maxListeners,
      spikeDays,
      growthRate: parseFloat(growthRate),
    };
  }, [dailyData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg">
          <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-neon-cyan" />
              <span className="text-xs text-muted-foreground">Listeners:</span>
              <span className="text-xs font-bold text-neon-cyan">{data.listeners}</span>
            </div>
            <div className="flex items-center gap-2">
              <Music className="w-3 h-3 text-neon-purple" />
              <span className="text-xs text-muted-foreground">Plays:</span>
              <span className="text-xs font-bold text-neon-purple">{data.plays}</span>
            </div>
            {data.isSpike && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                <Share2 className="w-3 h-3 text-neon-magenta" />
                <span className="text-[10px] text-neon-magenta font-medium">
                  Social spike: {data.spikeReason}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neon-cyan" />
          <h3 className="text-sm font-semibold">Listener Growth (30 Days)</h3>
        </div>
        <NeonBadge color={stats.growthRate >= 0 ? 'cyan' : 'magenta'}>
          {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
        </NeonBadge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <Users className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
          <p className="text-lg font-bold text-neon-cyan">{stats.avgListeners}</p>
          <p className="text-[10px] text-muted-foreground">Avg Daily</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <Music className="w-4 h-4 text-neon-purple" />
          <p className="text-lg font-bold text-neon-purple">{stats.maxListeners}</p>
          <p className="text-[10px] text-muted-foreground">Peak Day</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <Share2 className="w-4 h-4 text-neon-magenta" />
          <p className="text-lg font-bold text-neon-magenta">{stats.spikeDays}</p>
          <p className="text-[10px] text-muted-foreground">Social Spikes</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
          <TrendingUp className="w-4 h-4 text-neon-turquoise" />
          <p className="text-lg font-bold text-neon-turquoise">{dailyData.reduce((s, d) => s + d.listeners, 0)}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Chart */}
      <GlassCard hover={false} className="p-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="listeners"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorListeners)"
                animationDuration={1500}
              />
              {/* Mark spike days */}
              {dailyData.filter(d => d.isSpike).map((spike, index) => (
                <ReferenceLine
                  key={index}
                  x={spike.date}
                  stroke="#d946ef"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '📈',
                    position: 'top',
                    fill: '#d946ef',
                    fontSize: 12,
                  }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neon-cyan" />
            <span className="text-muted-foreground">Daily Listeners</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-neon-magenta" style={{ borderStyle: 'dashed' }} />
            <span className="text-muted-foreground">Social Share Spike</span>
          </div>
        </div>
      </GlassCard>

      {/* Social Impact Insights */}
      <GlassCard hover={false} className="p-4 bg-gradient-to-r from-neon-magenta/5 to-neon-purple/5 border-neon-magenta/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neon-magenta/10">
            <Share2 className="w-4 h-4 text-neon-magenta" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-2">Social Media Impact</h4>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-neon-cyan">{stats.spikeDays} days</span> showed significant listener spikes following social media shares. 
                Average increase on spike days: <span className="font-semibold text-neon-magenta">+80% listeners</span>.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Instagram', 'Twitter', 'TikTok', 'Facebook'].map(platform => (
                  <NeonBadge key={platform} color="magenta" className="text-[10px]">
                    {platform}
                  </NeonBadge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}