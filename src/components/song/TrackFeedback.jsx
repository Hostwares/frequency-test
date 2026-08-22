import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Star, Heart, ThumbsUp, MessageSquare, Send, Music, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const MOOD_OPTIONS = [
  { value: 'energetic', label: '⚡ Energetic' },
  { value: 'chill', label: '😌 Chill' },
  { value: 'emotional', label: '💭 Emotional' },
  { value: 'uplifting', label: '✨ Uplifting' },
  { value: 'melancholic', label: '🌧️ Melancholic' },
  { value: 'romantic', label: '💕 Romantic' },
  { value: 'angsty', label: '🔥 Angsty' },
  { value: 'peaceful', label: '☮️ Peaceful' },
  { value: 'nostalgic', label: '📼 Nostalgic' },
  { value: 'empowering', label: '💪 Empowering' },
];

const SENTIMENT_CONFIG = {
  love: { icon: '❤️', label: 'Love It', color: 'text-red-500', bg: 'bg-red-500/10' },
  like: { icon: '😊', label: 'Like It', color: 'text-green-500', bg: 'bg-green-500/10' },
  neutral: { icon: '😐', label: 'It\'s OK', color: 'text-gray-500', bg: 'bg-gray-500/10' },
  dislike: { icon: '😕', label: 'Not for Me', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  hate: { icon: '😤', label: 'Dislike', color: 'text-red-700', bg: 'bg-red-700/10' },
};

export default function TrackFeedback({ songId, artistProfileId, songTitle }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [sentiment, setSentiment] = useState(null);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const submitRatingMutation = useMutation({
    mutationFn: async (ratingData) => {
      return await base44.entities.SongRating.create(ratingData);
    },
    onSuccess: () => {
      toast.success('Thanks for your feedback! 🎵');
      setIsSubmitting(false);
      setRating(0);
      setSentiment(null);
      setSelectedMoods([]);
      setFeedback('');
    },
    onError: (error) => {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    },
  });

  const handleMoodToggle = (mood) => {
    setSelectedMoods(prev => {
      if (prev.includes(mood)) {
        return prev.filter(m => m !== mood);
      }
      if (prev.length >= 3) {
        toast.message('Max 3 moods allowed');
        return prev;
      }
      return [...prev, mood];
    });
  };

  const handleSubmit = async () => {
    if (!rating || rating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to leave feedback');
      return;
    }

    setIsSubmitting(true);

    const ratingData = {
    song_id: songId,
    fan_user_id: user.id,
    artist_profile_id: artistProfileId,
    rating,
    sentiment: sentiment || 'neutral',
    mood_tags: selectedMoods,
    feedback_text: feedback.trim(),
    listen_count: 1,
    is_favorite: rating === 5,
    is_public: true,
    };

    submitRatingMutation.mutate(ratingData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <GlassCard hover={false} className="p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-neon-purple/10">
          <MessageSquare className="w-5 h-5 text-neon-purple" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm">Rate This Track</h3>
          <p className="text-xs text-muted-foreground">Help artists understand what you love</p>
        </div>
      </div>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Overall Rating</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 transition-all ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              {rating === 5 ? '🔥 Fire!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'OK' : 'Needs Work'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Sentiment */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">How do you feel about this track?</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SENTIMENT_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSentiment(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sentiment === key
                  ? `${config.bg} ${config.color} border-2 border-current`
                  : 'bg-secondary/20 border-2 border-border/30 text-muted-foreground hover:border-border/50'
              }`}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood Tags */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          What moods does this track evoke? (Select up to 3)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodToggle(mood.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedMoods.includes(mood.value)
                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                  : 'bg-secondary/20 border border-border/30 text-muted-foreground hover:border-border/50'
              }`}
            >
              {mood.label}
            </button>
          ))}
        </div>
        {selectedMoods.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Selected: {selectedMoods.length}/3
          </p>
        )}
      </div>

      {/* Optional Feedback */}
      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Additional feedback (optional)
        </label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What do you love about this track? Production, lyrics, vibe? Keep it constructive!"
          className="min-h-[80px] text-xs"
          maxLength={280}
        />
        <p className="text-[10px] text-muted-foreground mt-1 text-right">
          {feedback.length}/280
        </p>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="w-full gap-2 bg-gradient-neon hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Feedback
          </>
        )}
      </Button>

      {/* Info Note */}
      <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <p className="text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3 inline mr-1 text-neon-cyan" />
          Your feedback helps artists improve and understand their audience. Be honest but constructive!
        </p>
      </div>

      {/* Success Message */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
        >
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-500">Feedback Submitted!</p>
          <p className="text-xs text-muted-foreground mt-1">Thank you for helping artists grow 🎵</p>
        </motion.div>
      )}
    </GlassCard>
  );
}