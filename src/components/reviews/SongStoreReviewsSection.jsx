import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, ShoppingBag } from 'lucide-react';
import SongStoreReviewForm from '@/components/reviews/SongStoreReviewForm';
import SongStoreReviewList from '@/components/reviews/SongStoreReviewList';

// Song Store reviews block: average rating + purchaser-only write form + public list.
export default function SongStoreReviewsSection({ song, artist }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ['song-store-reviews', song.id],
    queryFn: () =>
      base44.entities.SongStoreReview.filter({ song_id: song.id }, '-created_date', 50),
  });

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-4 h-4 text-neon-cyan" />
        <h2 className="font-display font-semibold text-foreground text-lg">Song Store Reviews</h2>
        {avg && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="w-3.5 h-3.5 fill-neon-purple text-neon-purple" />
            {avg}/5 · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      <SongStoreReviewForm song={song} artist={artist} />
      <SongStoreReviewList songId={song.id} />
    </div>
  );
}