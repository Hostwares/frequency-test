import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassCard from '@/components/shared/GlassCard';
import StarRating from '@/components/reviews/StarRating';
import { toast } from 'sonner';

// Write-or-edit form for a fan review. One review per fan per target.
// reviewType: 'song' | 'artist'. targetId: song_id (song) or artist_profile_id (artist).
export default function FanReviewForm({
  reviewType,
  targetId,
  artistProfileId,
  artistName,
  songTitle,
}) {
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

  const myFilter =
    reviewType === 'song'
      ? { review_type: 'song', song_id: targetId, fan_user_id: user?.id }
      : { review_type: 'artist', artist_profile_id: targetId, fan_user_id: user?.id };

  const { data: existing } = useQuery({
    queryKey: ['my-fan-review', reviewType, targetId, user?.id],
    queryFn: () => base44.entities.FanReview.filter(myFilter),
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

  const canSubmit = rating > 0 && body.trim().length > 0 && !submitting && !!user?.id;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        review_type: reviewType,
        artist_profile_id: reviewType === 'song' ? artistProfileId : targetId,
        artist_name: artistName || '',
        song_id: reviewType === 'song' ? targetId : '',
        song_title: reviewType === 'song' ? songTitle || '' : '',
        fan_user_id: user.id,
        rating,
        title: title.trim(),
        body: body.trim(),
        is_name_hidden: true,
      };
      if (existing?.id) {
        await base44.entities.FanReview.update(existing.id, payload);
        toast.success('Your review was updated.');
      } else {
        await base44.entities.FanReview.create(payload);
        toast.success('Thanks! Your review is now public.');
      }
      qc.invalidateQueries(['fan-reviews', reviewType, targetId]);
      qc.invalidateQueries(['my-fan-review', reviewType, targetId, user.id]);
    } catch (e) {
      toast.error(e?.message || 'Could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-neon-cyan" />
        <h3 className="text-sm font-semibold text-foreground">
          {existing ? 'Edit your review' : 'Write a review'}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Your rating</Label>
          <div className="mt-1">
            <StarRating value={rating} onChange={setRating} size={22} />
          </div>
        </div>

        <div>
          <Label htmlFor="review-title" className="text-xs text-muted-foreground">
            Headline (optional)
          </Label>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Sum up your impression"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="review-body" className="text-xs text-muted-foreground">
            Your review
          </Label>
          <Textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            placeholder="Share what you love (or don't) about this..."
            className="mt-1 min-h-[100px]"
          />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{body.length}/2000</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Your name is hidden from other fans.
          </p>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {existing ? 'Update review' : 'Post review'}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}