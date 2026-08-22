import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Star, Music, TrendingUp, ThumbsUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';

export default function TrackRatingsPanel({ artistProfileId }) {
  // Fetch all songs for this artist
  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  // Fetch all ratings for all songs
  const { data: allRatings = [] } = useQuery({
    queryKey: ['artist-song-ratings', artistProfileId],
    queryFn: async () => {
      const ratings = await Promise.all(
        songs.map(song => 
          base44.entities.SongRating.filter({ song_id: song.id })
        )
      );
      return ratings.flat();
    },
    enabled: songs.length > 0,
  });

  // Aggregate ratings by song
  const songRatings = useMemo(() => {
    return songs
      .map(song => {
        const songRatings = allRatings.filter(r => r.song_id === song.id);
        const total = songRatings.length;
        const sum = songRatings.reduce((acc, r) => acc + (r.rating || 0), 0);
        const average = total > 0 ? (sum / total).toFixed(1) : 0;
        return {
          song_id: song.id,
          song_title: song.title,
          cover_image: song.cover_image,
          average_rating: parseFloat(average),
          rating_count: total,
        };
      })
      .filter(s => s.rating_count > 0)
      .sort((a, b) => b.average_rating - a.average_rating);
  }, [songs, allRatings]);

  // Overall stats
  const totalRatings = allRatings.length;
  const overallAverage = totalRatings > 0
    ? (allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings).toFixed(1)
    : 0;
  
  const topRatedTrack = songRatings[0];
  const mostRatedTrack = [...songRatings].sort((a, b) => b.rating_count - a.rating_count)[0];

  // Rating distribution across all tracks
  const overallDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach(r => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return Object.entries(counts).map(([stars, count]) => ({
      stars: `${stars}⭐`,
      count,
    }));
  }, [allRatings]);

  return (
    <GlassCard hover={false} className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Star className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Fan Ratings by Track</h2>
            <p className="text-xs text-muted-foreground">See which songs fans love most</p>
          </div>
        </div>
        {overallAverage > 0 && (
          <NeonBadge color="purple">
            <Star className="w-3 h-3 mr-1" />
            {overallAverage}/5 Average
          </NeonBadge>
        )}
      </div>

      {songRatings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
          <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No ratings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Fans will rate your tracks after listening</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <Star className="w-4 h-4 text-yellow-400 mb-1" />
              <p className="text-xl font-bold text-yellow-400">{overallAverage}</p>
              <p className="text-[10px] text-muted-foreground">Overall Avg</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <Music className="w-4 h-4 text-neon-cyan mb-1" />
              <p className="text-xl font-bold text-neon-cyan">{songRatings.length}</p>
              <p className="text-[10px] text-muted-foreground">Rated Tracks</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <ThumbsUp className="w-4 h-4 text-neon-magenta mb-1" />
              <p className="text-xl font-bold text-neon-magenta">{totalRatings}</p>
              <p className="text-[10px] text-muted-foreground">Total Ratings</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <TrendingUp className="w-4 h-4 text-neon-turquoise mb-1" />
              <p className="text-xl font-bold text-neon-turquoise truncate">
                {topRatedTrack?.song_title?.split(' ')[0] || 'N/A'}
              </p>
              <p className="text-[10px] text-muted-foreground">Top Rated</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Star className="w-3 h-3" />
              Overall Rating Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={overallDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="stars" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Track Ratings List */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Music className="w-3 h-3" />
              Track-by-Track Breakdown
            </h3>
            <div className="space-y-2">
              {songRatings.map((track, idx) => (
                <motion.div
                  key={track.song_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 rounded-lg bg-secondary/10 border border-border/30 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {track.cover_image ? (
                      <img src={track.cover_image} alt={track.song_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.song_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.round(track.average_rating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {track.average_rating}/5 ({track.rating_count} ratings)
                      </span>
                    </div>
                  </div>
                  {idx === 0 && (
                    <NeonBadge color="purple">
                      <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                      Top Rated
                    </NeonBadge>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Most Rated Track */}
          {mostRatedTrack && mostRatedTrack !== topRatedTrack && (
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs font-semibold text-muted-foreground">Most Rated Track</span>
              </div>
              <p className="text-sm font-medium">{mostRatedTrack.song_title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {mostRatedTrack.rating_count} ratings • {mostRatedTrack.average_rating}/5 average
              </p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}