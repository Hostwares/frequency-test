import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Loader2, BadgeCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassCard from '@/components/shared/GlassCard';
import StarRating from '@/components/reviews/StarRating';
import { useSongPurchase } from '@/hooks/useSongPurchase';
import { toast } from 'sonner';

// Review form for the Song Store. Only fans who have purchased the song can write;
// the review displays the reviewer's name and a Verified Purchase badge.
export default function SongStoreReviewForm({ song, artist }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { hasPurchased, loading: purchaseLoading } = useSongPurchase(song.id);

  const { data: existing } = useQuery({
    queryKey: ['my-song-store-review', song.id, user?.id],
    queryFn: () =>
      base44.entities.SongStoreReview.filter({
        song_id: song.id,
        fan_user_id: user?.id,
      }),
    enabled: !!user?.id,
    select: (d) => d?.[0],
  });

  useEffect(() => {
    if (existing && !prefilled) {
      setRating(existing.rating || 0);
      setTitle(existing.title || '');
      setBody(existing.body || '');
      setPrefilled(true);
    }
  }, [existing, prefilled]);

  if (!song.is_purchasable) return null;

  if (purchaseLoading) return null;

  if (!hasPurchased) {
    return (
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          Purchase this song to leave a verified review.
        </div>
      </GlassCard>
    );
  }

  const canSubmit = rating > 0 && body.trim().length > 0 && !submitting && !!user?.id;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        song_id: song.id,
        song_title: song.title || '',
        artist_profile_id: song.artist_profile_id || artist?.id || '',
        artist_name: artist?.artist_name || '',
        fan_user_id: user.id,
        fan_name: user.full_name || 'Frequency Fan',
        rating,
        title: title.trim(),
        body: body.trim(),
        verified_purchase: true,
      };
      if (existing?.id) {
        await base44.entities.SongStoreReview.update(existing.id, payload);
        toast.success('Your review was updated.');
      } else {
        await base44.entities.SongStoreReview.create(payload);
        toast.success('Thanks for reviewing your purchase!');
      }
      qc.invalidateQueries(['song-store-reviews', song.id]);
      qc.invalidateQueries(['my-song-store-review', song.id, user.id]);
    } catch (e) {
      toast.error(e?.message || 'Could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-neon-cyan" />
        <h3 className="text-sm font-semibold text-foreground">
          {existing ? 'Edit your review' : 'Review your purchase'}
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] text-green-500 font-medium">
          <BadgeCheck className="w-3 h-3" /> Verified Purchase
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Your rating</Label>
          <div className="mt-1">
            <StarRating value={rating} onChange={setRating} size={22} />
          </div>
        </div>

        <div>
          <Label htmlFor="ss-review-title" className="text-xs text-muted-foreground">
            Headline (optional)
          </Label>
          <Input
            id="ss-review-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sum up your impression"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="ss-review-body" className="text-xs text-muted-foreground">
            Your review
          </Label>
          <Textarea
            id="ss-review-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            placeholder="Share what you think of this track"
            className="mt-1 min-h-[100px]"
          />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{body.length}/2000</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {existing ? 'Update review' : 'Post review'}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}