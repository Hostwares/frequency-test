import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Music, TrendingUp, Star } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';

const GENRE_COLORS = [
  '#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'
];

export default function GenreRatingsSummary({ artistProfileId }) {
  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs-genres', artistProfileId],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ['artist-ratings-genres', artistProfileId],
    queryFn: async () => {
      const ratings = await Promise.all(
        songs.map(song => base44.entities.SongRating.filter({ song_id: song.id }))
      );
      return ratings.flat();
    },
    enabled: songs.length > 0,
  });

  const genreStats = useMemo(() => {
    const genreMap = {};
    songs.forEach(song => {
      const genre = song.genre || 'Unknown';
      const songRatings = allRatings.filter(r => r.song_id === song.id);
      
      if (!genreMap[genre]) {
        genreMap[genre] = {
          genre,
          songs: [],
          total_ratings: 0,
          rating_sum: 0,
        };
      }

      genreMap[genre].songs.push({
        id: song.id,
        title: song.title,
        ratings_count: songRatings.length,
        average_rating: songRatings.length > 0
          ? (songRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / songRatings.length).toFixed(1)
          : 0,
      });

      genreMap[genre].total_ratings += songRatings.length;
      genreMap[genre].rating_sum += songRatings.reduce((sum, r) => sum + (r.rating || 0), 0);
    });

    return Object.values(genreMap)
      .map(g => ({
        ...g,
        average_rating: g.total_ratings > 0 ? (g.rating_sum / g.total_ratings).toFixed(1) : 0,
        songs_count: g.songs.length,
      }))
      .sort((a, b) => b.total_ratings - a.total_ratings);
  }, [songs, allRatings]);

  const chartData = useMemo(() => {
    return genreStats.map((g, i) => ({
      name: g.genre.length > 12 ? g.genre.substring(0, 12) + '...' : g.genre,
      full_name: g.genre,
      ratings: g.total_ratings,
      color: GENRE_COLORS[i % GENRE_COLORS.length],
    }));
  }, [genreStats]);

  const totalRatings = allRatings.length;
  const overallAverage = totalRatings > 0
    ? (allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings).toFixed(1)
    : 0;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Music className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Ratings by Genre</h2>
            <p className="text-xs text-muted-foreground">Which styles resonate most with fans</p>
          </div>
        </div>
        {overallAverage > 0 && (
          <NeonBadge color="purple">
            <Star className="w-3 h-3 mr-1" />
            {overallAverage}/5 Overall
          </NeonBadge>
        )}
      </div>

      {totalRatings === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
          <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No ratings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Fans will rate your tracks by genre</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Ratings Distribution by Genre
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value, name, props) => [`${value} ratings`, props.payload.full_name]}
                />
                <Bar dataKey="ratings" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Music className="w-3 h-3" />
              Genre Breakdown
            </h3>
            <div className="space-y-3">
              {genreStats.map((genre, idx) => (
                <motion.div
                  key={genre.genre}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-lg bg-secondary/10 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }} />
                      <h4 className="font-semibold text-sm">{genre.genre}</h4>
                      <NeonBadge color="cyan">{genre.songs_count} tracks</NeonBadge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-400">{genre.average_rating}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-neon-cyan">{genre.total_ratings}</p>
                        <p className="text-xs text-muted-foreground">Ratings</p>
                      </div>
                    </div>
                  </div>

                  {genre.songs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/20">
                      <p className="text-xs text-muted-foreground mb-2">Top Tracks:</p>
                      <div className="flex flex-wrap gap-2">
                        {genre.songs
                          .sort((a, b) => b.ratings_count - a.ratings_count)
                          .slice(0, 3)
                          .map((song) => (
                            <div key={song.id} className="px-2 py-1 rounded bg-secondary/30 text-xs flex items-center gap-1">
                              <span className="truncate max-w-[120px]">{song.title}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-yellow-400 font-medium">{song.average_rating}⭐</span>
                              <span className="text-muted-foreground">({song.ratings_count})</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}