import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Music, Users, Play, TrendingUp, BarChart3, Clock, Heart } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import TierGatedAnalytics from '@/components/shared/TierGatedAnalytics';
import { AnalyticsTierBadge } from '@/components/shared/TierGatedAnalytics';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const GENRE_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6', '#f59e0b'];

export default function PlaylistAnalyticsPanel({ playlist, songs = [] }) {
  const { tier } = useSubscriptionTier();

  // Compute basic stats (always available)
  const totalSongs = songs.length;
  const totalPlays = songs.reduce((sum, s) => sum + (s.play_count || 0), 0);
  const totalFollowers = playlist?.follower_count || 0;
  const supportTotal = songs.reduce((sum, s) => sum + (s.support_count || 0), 0);

  // Compute genre/mood breakdown (Advanced+)
  const genreMap = new Map();
  const moodMap = new Map();
  for (const song of songs) {
    if (song.genre) genreMap.set(song.genre, (genreMap.get(song.genre) || 0) + 1);
    if (song.mood) moodMap.set(song.mood, (moodMap.get(song.mood) || 0) + 1);
  }
  const genreData = [...genreMap.entries()].map(([name, value]) => ({ name, value }));
  const moodData = [...moodMap.entries()].map(([name, value]) => ({ name, value }));

  // Play trend data (simulated from play counts — Advanced+)
  const playTrendData = songs.slice(0, 10).map((s, i) => ({
    name: s.title?.length > 15 ? s.title.substring(0, 15) + '…' : s.title || `Song ${i + 1}`,
    plays: s.play_count || 0,
  }));

  // Per-song engagement (Premium only)
  const engagementData = songs.map((s) => ({
    title: s.title,
    plays: s.play_count || 0,
    supports: s.support_count || 0,
    engagement: ((s.support_count || 0) / Math.max(s.play_count || 1, 1)) * 100,
  })).sort((a, b) => b.plays - a.plays);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-neon-purple" />
          Playlist Analytics
        </h2>
        <AnalyticsTierBadge tier={tier} />
      </div>

      {/* Basic stats — available to all tiers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatTile icon={Music} label="Total Songs" value={totalSongs} color="text-neon-purple" />
        <StatTile icon={Play} label="Total Plays" value={totalPlays} color="text-neon-cyan" />
        <StatTile icon={Users} label="Followers" value={totalFollowers} color="text-neon-magenta" />
        <StatTile icon={Heart} label="Supports" value={supportTotal} color="text-neon-turquoise" />
      </div>

      {/* Play count trends — Advanced+ */}
      <TierGatedAnalytics feature="playlist_play_trends" label="Play Count Trends">
        <GlassCard hover={false} className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-medium">Play Count by Song</span>
          </div>
          {playTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={playTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(260 20% 7%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="plays" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">No songs in this playlist yet.</p>
          )}
        </GlassCard>
      </TierGatedAnalytics>

      {/* Genre & Mood breakdown — Advanced+ */}
      <TierGatedAnalytics feature="playlist_genre_breakdown" label="Genre & Mood Breakdown">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {genreData.length > 0 && (
            <GlassCard hover={false} className="p-5">
              <p className="text-sm font-medium mb-3">Genre Distribution</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {genreData.map((_, i) => (
                      <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
          {moodData.length > 0 && (
            <GlassCard hover={false} className="p-5">
              <p className="text-sm font-medium mb-3">Mood Distribution</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={moodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {moodData.map((_, i) => (
                      <Cell key={i} fill={GENRE_COLORS[(i + 2) % GENRE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
        </div>
      </TierGatedAnalytics>

      {/* Per-song engagement details — Premium only */}
      <TierGatedAnalytics feature="playlist_engagement_details" label="Per-Song Engagement Details">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-neon-magenta" />
            <span className="text-sm font-medium">Per-Song Engagement</span>
          </div>
          <div className="space-y-2">
            {engagementData.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="text-xs font-medium flex-1 truncate">{s.title}</span>
                <div className="text-right">
                  <span className="text-xs text-neon-cyan">{s.plays} plays</span>
                  <span className="text-xs text-muted-foreground mx-2">·</span>
                  <span className="text-xs text-neon-purple">{s.supports} supports</span>
                </div>
                <div className="w-20">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full"
                      style={{ width: `${Math.min(s.engagement, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </TierGatedAnalytics>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </GlassCard>
  );
}