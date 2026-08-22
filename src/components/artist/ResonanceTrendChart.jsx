import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Music, Star, Calendar } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ResonanceTrendChart({ artistProfileId }) {
  const [selectedSongId, setSelectedSongId] = useState('all');

  // Fetch all songs
  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs-trend', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  // Fetch all ratings
  const { data: allRatings = [] } = useQuery({
    queryKey: ['artist-ratings-trend', artistProfileId],
    queryFn: async () => {
      const ratings = await Promise.all(
        songs.map(song => base44.entities.SongRating.filter({ song_id: song.id }))
      );
      return ratings.flat();
    },
    enabled: songs.length > 0,
  });

  // Calculate daily resonance scores over last 90 days
  const trendData = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Group ratings by date
    const ratingsByDate = {};
    allRatings.forEach(rating => {
      const date = new Date(rating.created_date);
      if (date >= ninetyDaysAgo) {
        const dateStr = date.toISOString().split('T')[0];
        if (!ratingsByDate[dateStr]) {
          ratingsByDate[dateStr] = [];
        }
        ratingsByDate[dateStr].push(rating);
      }
    });

    // Generate data points for each day
    const data = [];
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRatings = ratingsByDate[dateStr] || [];
      
      // Calculate cumulative resonance score up to this date
      const cumulativeRatings = allRatings.filter(r => {
        const rDate = new Date(r.created_date);
        return rDate <= date;
      });

      // Calculate resonance score: average rating * log(play_count + 1) * rating_count factor
      const avgRating = cumulativeRatings.length > 0
        ? cumulativeRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / cumulativeRatings.length
        : 0;
      
      const resonanceScore = Math.round(avgRating * 20 * (1 + Math.log10(cumulativeRatings.length + 1)));

      data.push({
        date: dateStr,
        display_date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        resonance_score: resonanceScore,
        rating_count: cumulativeRatings.length,
        avg_rating: avgRating.toFixed(1),
      });
    }

    return data;
  }, [allRatings]);

  // Per-song trend data
  const songTrendData = useMemo(() => {
    if (selectedSongId === 'all') return trendData;

    const song = songs.find(s => s.id === selectedSongId);
    if (!song) return trendData;

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const songRatings = allRatings.filter(r => r.song_id === selectedSongId);

    const data = [];
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const cumulativeRatings = songRatings.filter(r => {
        const rDate = new Date(r.created_date);
        return rDate <= date;
      });

      const avgRating = cumulativeRatings.length > 0
        ? cumulativeRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / cumulativeRatings.length
        : 0;
      
      const resonanceScore = Math.round(avgRating * 20 * (1 + Math.log10(cumulativeRatings.length + 1)));

      data.push({
        date: dateStr,
        display_date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        resonance_score: resonanceScore,
        rating_count: cumulativeRatings.length,
        avg_rating: avgRating.toFixed(1),
      });
    }

    return data;
  }, [selectedSongId, songs, allRatings, trendData]);

  const currentScore = songTrendData[songTrendData.length - 1]?.resonance_score || 0;
  const previousScore = songTrendData[Math.floor(songTrendData.length / 2)]?.resonance_score || 0;
  const trend = currentScore - previousScore;
  const trendPercent = previousScore > 0 ? ((trend / previousScore) * 100).toFixed(1) : 0;

  const selectedSong = songs.find(s => s.id === selectedSongId);

  return (
    <GlassCard hover={false} className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <TrendingUp className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Resonance Score Trend</h2>
            <p className="text-xs text-muted-foreground">90-day engagement trajectory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSongId} onValueChange={setSelectedSongId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Songs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Songs</SelectItem>
              {songs.map(song => (
                <SelectItem key={song.id} value={song.id}>
                  {song.title.length > 20 ? song.title.substring(0, 20) + '...' : song.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NeonBadge color="purple">
            <Star className="w-3 h-3 mr-1" />
            {currentScore}
          </NeonBadge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-xs text-muted-foreground">90-Day Change</span>
          </div>
          <p className={`text-2xl font-bold ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend}
          </p>
          <p className={`text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trendPercent}%
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {songTrendData[songTrendData.length - 1]?.avg_rating || '0'}
          </p>
          <p className="text-xs text-muted-foreground">Current</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-muted-foreground">Total Ratings</span>
          </div>
          <p className="text-2xl font-bold text-neon-cyan">
            {songTrendData[songTrendData.length - 1]?.rating_count || 0}
          </p>
          <p className="text-xs text-muted-foreground">All Time</p>
        </div>
      </div>

      {/* Chart */}
      <div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={songTrendData}>
            <defs>
              <linearGradient id="colorResonance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="display_date" 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              axisLine={false} 
              tickLine={false}
              interval={14}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              axisLine={false} 
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value, name) => {
                if (name === 'resonance_score') return [value, 'Resonance Score'];
                return [value, name];
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="resonance_score"
              stroke="#a855f7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorResonance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-6 pt-4 border-t border-border/30">
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-neon-cyan mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Trend Analysis</p>
            <p className="text-xs text-muted-foreground">
              {trend >= 0 
                ? `Resonance Score increased by ${trendPercent}% over the last 90 days, indicating growing fan engagement.`
                : `Resonance Score decreased by ${Math.abs(trendPercent)}% over the last 90 days. Consider promoting this track.`
              }
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}