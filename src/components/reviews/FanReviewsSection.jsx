import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import FanReviewForm from '@/components/reviews/FanReviewForm';
import FanReviewList from '@/components/reviews/FanReviewList';

// Combined reviews block: average + write/edit form + public list.
// reviewType: 'song' | 'artist'. targetId: song_id or artist_profile_id.
export default function FanReviewsSection({
  reviewType,
  targetId,
  artistProfileId,
  artistName,
  songTitle,
}) {
  const filter =
    reviewType === 'song'
      ? { review_type: 'song', song_id: targetId }
      : { review_type: 'artist', artist_profile_id: targetId };

  const { data: reviews = [] } = useQuery({
    queryKey: ['fan-reviews', reviewType, targetId],
    queryFn: () => base44.entities.FanReview.filter(filter, '-created_date', 50),
  });

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-display font-semibold text-foreground text-lg">Fan Reviews</h2>
        {avg && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="w-3.5 h-3.5 fill-neon-purple text-neon-purple" />
            {avg}/5 · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      <FanReviewForm
        reviewType={reviewType}
        targetId={targetId}
        artistProfileId={artistProfileId}
        artistName={artistName}
        songTitle={songTitle}
      />

      <FanReviewList reviewType={reviewType} targetId={targetId} />
    </div>
  );
}