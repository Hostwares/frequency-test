import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { MessageSquare, Star, Heart, TrendingUp, Music, ThumbsUp, Sparkles } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const MOOD_COLORS = {
  energetic: '#fbbf24',
  chill: '#06b6d4',
  emotional: '#8b5cf6',
  uplifting: '#10b981',
  melancholic: '#64748b',
  romantic: '#ec4899',
  angsty: '#ef4444',
  peaceful: '#14b8a6',
  nostalgic: '#f97316',
  empowering: '#7c3aed',
};

const SENTIMENT_COLORS = {
  love: '#ef4444',
  like: '#22c55e',
  neutral: '#64748b',
  dislike: '#f97316',
  hate: '#7f1d1d',
};

export default function TrackFeedbackAnalytics({ songId, songTitle }) {
  // Fetch all ratings for this song
  const { data: ratings = [] } = useQuery({
    queryKey: ['song-ratings', songId],
    queryFn: () => base44.entities.SongRating.filter({ song_id: songId }, '-created_date'),
    enabled: !!songId,
  });

  // Calculate average rating
  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / ratings.length).toFixed(1);
  }, [ratings]);

  // Sentiment breakdown
  const sentimentBreakdown = useMemo(() => {
    const counts = { love: 0, like: 0, neutral: 0, dislike: 0, hate: 0 };
    ratings.forEach(r => {
      counts[r.sentiment] = (counts[r.sentiment] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([sentiment, count]) => ({
        name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
        value: count,
        color: SENTIMENT_COLORS[sentiment],
      }));
  }, [ratings]);

  // Mood tag frequency
  const moodFrequency = useMemo(() => {
    const counts = {};
    ratings.forEach(r => {
      if (r.mood_tags) {
        r.mood_tags.forEach(mood => {
          counts[mood] = (counts[mood] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([mood, count]) => ({
        mood: mood.charAt(0).toUpperCase() + mood.slice(1),
        count,
        color: MOOD_COLORS[mood],
      }));
  }, [ratings]);

  // Rating distribution
  const ratingDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return Object.entries(counts).map(([stars, count]) => ({
      stars: `${stars} ⭐`,
      count,
    }));
  }, [ratings]);

  // Recent feedback
  const recentFeedback = ratings
    .filter(r => r.feedback_text)
    .slice(0, 5);

  // Top moods summary
  const topMood = moodFrequency[0]?.mood || 'N/A';

  return (
    <GlassCard hover={false} className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <MessageSquare className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Track Feedback</h2>
            <p className="text-xs text-muted-foreground">{songTitle || 'Track Analytics'}</p>
          </div>
        </div>
        <NeonBadge color="purple">
          <Star className="w-3 h-3 mr-1" />
          {averageRating}/5
        </NeonBadge>
      </div>

      {ratings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
          <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No feedback yet</p>
          <p className="text-xs text-muted-foreground mt-1">Fans will leave ratings after listening</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <Star className="w-4 h-4 text-yellow-400 mb-1" />
              <p className="text-xl font-bold text-yellow-400">{averageRating}</p>
              <p className="text-[10px] text-muted-foreground">Avg Rating</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <Heart className="w-4 h-4 text-red-500 mb-1" />
              <p className="text-xl font-bold text-red-500">{sentimentBreakdown.find(s => s.name === 'Love')?.value || 0}</p>
              <p className="text-[10px] text-muted-foreground">Love It</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <MessageSquare className="w-4 h-4 text-neon-cyan mb-1" />
              <p className="text-xl font-bold text-neon-cyan">{ratings.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Ratings</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
              <TrendingUp className="w-4 h-4 text-neon-magenta mb-1" />
              <p className="text-xl font-bold text-neon-magenta">{topMood}</p>
              <p className="text-[10px] text-muted-foreground">Top Mood</p>
            </div>
          </div>

          {/* Rating Distribution Chart */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Star className="w-3 h-3" />
              Rating Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ratingDistribution}>
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

          {/* Sentiment & Moods */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sentiment Pie Chart */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Heart className="w-3 h-3" />
                Fan Sentiment
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={sentimentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sentimentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {sentimentBreakdown.map((s, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </div>

            {/* Top Moods */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Top Moods
              </h3>
              <div className="space-y-2">
                {moodFrequency.map((mood, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-16 text-[10px] text-muted-foreground truncate">{mood.mood}</div>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(mood.count / ratings.length) * 100}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: mood.color }}
                      />
                    </div>
                    <div className="w-8 text-[10px] text-muted-foreground text-right">{mood.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Feedback */}
          {recentFeedback.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Recent Feedback
              </h3>
              <div className="space-y-2">
                {recentFeedback.map((feedback, idx) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 rounded-lg bg-secondary/10 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex text-[10px]">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <NeonBadge color="cyan">{feedback.sentiment}</NeonBadge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(feedback.created_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{feedback.feedback_text}</p>
                    {feedback.mood_tags && feedback.mood_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {feedback.mood_tags.map((mood, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/30 text-muted-foreground"
                          >
                            {mood}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}