import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Vote, CheckCircle2, Loader2, Clock, Shield,
  AlertCircle, LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';

export default function NomineeVoteButton({ nominee, category }) {
  const qc = useQueryClient();
  const [localError, setLocalError] = useState(null);

  const { data: myVotesData, isLoading: votesLoading, isError: votesError } = useQuery({
    queryKey: ['my-awards-votes'],
    queryFn: () => base44.functions.invoke('castAcademyVote', { action: 'get_my_votes' }),
    retry: false,
  });

  const myVotes = myVotesData?.data?.votes || [];
  const phase = category.voting_phase;
  const myCategoryVotes = myVotes.filter(
    v => v.category_id === category.id && v.voting_phase === phase
  );
  const hasVoted = myCategoryVotes.length > 0;

  const castVoteMutation = useMutation({
    mutationFn: () => base44.functions.invoke('castAcademyVote', {
      action: 'cast_vote',
      category_id: category.id,
      nominee_id: nominee.id,
      voting_phase: 'nomination',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-awards-votes'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees'] });
      qc.invalidateQueries({ queryKey: ['awards-nominee', nominee.id] });
      setLocalError(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to cast vote';
      setLocalError(msg);
    },
  });

  // ─── Voting not open ───
  if (phase === 'not_started' || phase === 'closed') {
    const openDate = category.voting_open_date
      ? new Date(category.voting_open_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;
    const closeDate = category.voting_close_date
      ? new Date(category.voting_close_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <GlassCard hover={false} className="p-5 text-center">
        <Clock className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm font-display font-semibold">
          {phase === 'closed' ? 'Voting Has Closed' : 'Voting Not Yet Open'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {phase === 'closed'
            ? `Voting for ${category.name} has concluded for this cycle.`
            : openDate
              ? `Voting opens on ${openDate}.`
              : `Voting for ${category.name} has not started yet.`}
        </p>
        {closeDate && phase === 'not_started' && (
          <p className="text-[10px] text-muted-foreground mt-1">Closes {closeDate}</p>
        )}
      </GlassCard>
    );
  }

  // ─── User is not an Academy member ───
  if (votesError && !votesLoading) {
    return (
      <GlassCard hover={false} className="p-5 text-center">
        <Shield className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
        <p className="text-sm font-display font-semibold">Academy Members Only</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Voting is open for {category.name}, but you need to be an approved Academy member to cast a ballot.
        </p>
        <Button asChild className="bg-gradient-neon hover:opacity-90 text-white">
          <Link to="/academy-application"><LogIn className="w-4 h-4" /> Apply to the Academy</Link>
        </Button>
      </GlassCard>
    );
  }

  if (votesLoading) {
    return (
      <GlassCard hover={false} className="p-5 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </GlassCard>
    );
  }

  // ─── Already voted in nomination phase ───
  if (hasVoted) {
    return (
      <GlassCard hover={false} className="p-5 text-center border-neon-turquoise/20 bg-neon-turquoise/5">
        <CheckCircle2 className="w-6 h-6 text-neon-turquoise mx-auto mb-2" />
        <p className="text-sm font-display font-semibold text-neon-turquoise">Vote Cast</p>
        <p className="text-xs text-muted-foreground mt-1">
          You voted for <strong>{myCategoryVotes[0]?.nominee_name}</strong> in {category.name}.
          {myCategoryVotes[0]?.conflict_disclosed && ' (conflict disclosed)'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">
          Nomination votes are final and cannot be changed.
        </p>
      </GlassCard>
    );
  }

  // ─── Active vote button ───
  return (
    <GlassCard hover={false} className="p-5 space-y-3 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <Vote className="w-5 h-5 text-neon-cyan" />
        <div>
          <h3 className="text-sm font-display font-semibold">Cast Your Vote</h3>
          <p className="text-[10px] text-muted-foreground">Nomination Phase · One vote per category</p>
        </div>
      </div>

      {localError && (
        <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive">{localError}</p>
        </div>
      )}

      <Button
        className="w-full bg-gradient-neon hover:opacity-90 text-white"
        disabled={castVoteMutation.isPending}
        onClick={() => castVoteMutation.mutate()}
      >
        {castVoteMutation.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Casting Vote...</>
        ) : (
          <><Vote className="w-4 h-4" /> Vote for {nominee.nominee_name}</>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        Votes are final and cannot be changed once submitted.
      </p>
    </GlassCard>
  );
}