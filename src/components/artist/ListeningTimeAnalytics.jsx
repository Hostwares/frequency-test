import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { Clock, Activity, Sunrise, Sunset, Moon } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const NEON = '#a855f7';
const PEAK_COLOR = '#06b6d4';

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
});

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getTimeSlot(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export default function ListeningTimeAnalytics({ artistProfileId }) {
  const { data: songs = [] } = useQuery({
    queryKey: ['lta-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }, '-play_count', 50),
    enabled: !!artistProfileId,
  });

  const songIds = useMemo(() => songs.map(s => s.id), [songs]);

  const { data: history = [] } = useQuery({
    queryKey: ['lta-history', artistProfileId],
    queryFn: () => base44.entities.ListeningHistory.filter({ artist_profile_id: artistProfileId }, '-played_at', 500),
    enabled: !!artistProfileId,
  });

  const analytics = useMemo(() => {
    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(7).fill(0);
    const slotCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    history.forEach(h => {
      if (!h.played_at) return;
      const d = new Date(h.played_at);
      const hour = d.getHours();
      const day = d.getDay();
      hourCounts[hour]++;
      dayCounts[day]++;
      slotCounts[getTimeSlot(hour)]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
    const total = history.length;

    const hourData = hourCounts.map((count, hour) => ({
      hour: HOUR_LABELS[hour],
      count,
      isPeak: hour === peakHour && count > 0,
    }));

    const dayData = dayCounts.map((count, day) => ({
      day: DAY_LABELS[day],
      count,
    }));

    return { hourData, dayData, peakHour, peakDay, total, slotCounts };
  }, [history]);

  const slotInfo = [
    { key: 'morning', label: 'Morning', icon: Sunrise, hours: '5am–12pm', color: 'text-neon-turquoise' },
    { key: 'afternoon', label: 'Afternoon', icon: Sunset, hours: '12pm–5pm', color: 'text-neon-cyan' },
    { key: 'evening', label: 'Evening', icon: Activity, hours: '5pm–9pm', color: 'text-neon-purple' },
    { key: 'night', label: 'Night', icon: Moon, hours: '9pm–5am', color: 'text-neon-magenta' },
  ];

  if (history.length === 0) {
    return (
      <GlassCard hover={false} className="p-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No listening data yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Listening time analytics will appear once fans start playing your tracks</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {slotInfo.map(({ key, label, icon: Icon, hours, color }) => {
          const count = analytics.slotCounts[key];
          const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
          return (
            <GlassCard key={key} hover={false} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{pct}%</p>
              <p className="text-xs text-muted-foreground">{count} plays · {hours}</p>
            </GlassCard>
          );
        })}
      </div>

      {/* Peak Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-neon-cyan" />
            <h4 className="font-display font-semibold text-sm">Peak Listening Hour</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neon-cyan">{HOUR_LABELS[analytics.peakHour]}</span>
            <NeonBadge color="cyan">{analytics.hourData[analytics.peakHour]?.count || 0} plays</NeonBadge>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-neon-purple" />
            <h4 className="font-display font-semibold text-sm">Peak Listening Day</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neon-purple">{DAY_LABELS[analytics.peakDay]}</span>
            <NeonBadge color="purple">{analytics.dayData[analytics.peakDay]?.count || 0} plays</NeonBadge>
          </div>
        </GlassCard>
      </div>

      {/* Hourly Chart */}
      <GlassCard hover={false} className="p-5">
        <h4 className="font-display font-semibold text-sm mb-4">Listening Activity by Hour</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={analytics.hourData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(260 20% 7%)', border: '1px solid hsl(260 15% 16%)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#94a3b8' }}
              cursor={{ fill: 'rgba(168, 85, 247, 0.05)' }}
            />
            <Bar dataKey="count" name="Plays" radius={[3, 3, 0, 0]}>
              {analytics.hourData.map((entry, i) => (
                <Cell key={i} fill={entry.isPeak ? PEAK_COLOR : NEON} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Day of Week Chart */}
      <GlassCard hover={false} className="p-5">
        <h4 className="font-display font-semibold text-sm mb-4">Listening Activity by Day of Week</h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={analytics.dayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(260 20% 7%)', border: '1px solid hsl(260 15% 16%)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#94a3b8' }}
              cursor={{ fill: 'rgba(168, 85, 247, 0.05)' }}
            />
            <Bar dataKey="count" name="Plays" fill={NEON} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}