import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BadgeCheck, MessageSquare } from 'lucide-react';
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

// Public list of verified-purchase reviews. Reviewer names are shown.
export default function SongStoreReviewList({ songId }) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['song-store-reviews', songId],
    queryFn: () =>
      base44.entities.SongStoreReview.filter({ song_id: songId }, '-created_date', 50),
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading reviews…</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No verified purchase reviews yet.</p>
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
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-muted-foreground">{r.fan_name || 'Frequency Fan'}</span>
            {r.verified_purchase && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-500 font-medium">
                <BadgeCheck className="w-3 h-3" /> Verified Purchase
              </span>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}