import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, MessageSquare } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import StarRating from '@/components/reviews/StarRating';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

// Public list of fan reviews. Reviewer names are intentionally not shown —
// each review is attributed anonymously to "Frequency Fan".
export default function FanReviewList({ reviewType, targetId }) {
  const filter =
    reviewType === 'song'
      ? { review_type: 'song', song_id: targetId }
      : { review_type: 'artist', artist_profile_id: targetId };

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['fan-reviews', reviewType, targetId],
    queryFn: () => base44.entities.FanReview.filter(filter, '-created_date', 50),
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading reviews…</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <GlassCard key={r.id} hover={false} className="p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <StarRating value={r.rating} readOnly size={14} />
              {r.title && (
                <span className="text-sm font-semibold text-foreground truncate">{r.title}</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {fmtDate(r.created_date)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{r.body}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-2">Frequency Fan</p>
        </GlassCard>
      ))}
    </div>
  );
}