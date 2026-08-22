import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Trophy, CheckCircle2, Loader2, Lock, Clock, Shield,
  AlertCircle, ListOrdered, LogIn, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import RankedChoiceSelector from '@/components/academy/RankedChoiceSelector';

const RANK_LABELS = { 1: '1st Choice', 2: '2nd Choice', 3: '3rd Choice' };

export default function NomineeRankedBallot({ category, currentNomineeId }) {
  const qc = useQueryClient();
  const [selections, setSelections] = useState({});
  const [conflictDisclosed, setConflictDisclosed] = useState(false);
  const [error, setError] = useState(null);

  // Pre-select the current nominee as 1st choice
  useEffect(() => {
    if (currentNomineeId && !selections[1]) {
      setSelections(prev => ({ ...prev, 1: currentNomineeId }));
    }
  }, [currentNomineeId]);

  const { data: nominees = [], isLoading: nomLoading } = useQuery({
    queryKey: ['awards-category-nominees', category.id],
    queryFn: () => base44.entities.AwardsNominee.filter(
      { category_id: category.id }, '-votes_count', 50
    ),
  });

  const { data: myVotesData, isLoading: votesLoading, isError: votesError } = useQuery({
    queryKey: ['my-awards-votes'],
    queryFn: () => base44.functions.invoke('castAcademyVote', { action: 'get_my_votes' }),
    retry: false,
  });

  const myVotes = myVotesData?.data?.votes || [];
  const myCategoryVotes = useMemo(
    () => myVotes.filter(v => v.category_id === category.id && v.voting_phase === 'final_voting'),
    [myVotes, category.id]
  );
  const hasVoted = myCategoryVotes.length > 0;

  const submitBallotMutation = useMutation({
    mutationFn: (params) => base44.functions.invoke('castAcademyVote', {
      action: 'cast_ranked_votes',
      category_id: category.id,
      selections: params.selections,
      conflict_disclosed: params.conflict_disclosed,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-awards-votes'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees'] });
      qc.invalidateQueries({ queryKey: ['awards-category-nominees', category.id] });
      setError(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit ballot';
      setError(msg);
    },
  });

  const handleSelect = (rank, nomineeId) => {
    setSelections(prev => ({ ...prev, [rank]: nomineeId }));
    setError(null);
  };

  const handleClear = (rank) => {
    setSelections(prev => {
      const updated = { ...prev };
      delete updated[rank];
      return updated;
    });
  };

  const handleSubmit = () => {
    const ranks = Object.keys(selections).filter(r => selections[r]);
    if (ranks.length === 0) {
      setError('Please select at least your 1st choice');
      return;
    }
    const selectionArray = ranks.map(rank => ({
      nominee_id: selections[rank],
      vote_rank: parseInt(rank),
    }));
    submitBallotMutation.mutate({ selections: selectionArray, conflict_disclosed: conflictDisclosed });
  };

  // ─── Not an Academy member ───
  if (votesError && !votesLoading) {
    return (
      <GlassCard hover={false} className="p-5 text-center">
        <Shield className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
        <p className="text-sm font-display font-semibold">Academy Members Only</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Final voting is open for {category.name}, but you need to be a Final Voting Council member to cast a ranked ballot.
        </p>
        <Button asChild className="bg-gradient-neon hover:opacity-90 text-white">
          <Link to="/academy-application"><LogIn className="w-4 h-4" /> Apply to the Academy</Link>
        </Button>
      </GlassCard>
    );
  }

  if (nomLoading || votesLoading) {
    return (
      <GlassCard hover={false} className="p-5 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </GlassCard>
    );
  }

  // ─── Ballot already submitted — locked in ───
  if (hasVoted) {
    const sortedVotes = [...myCategoryVotes].sort((a, b) => a.vote_rank - b.vote_rank);
    return (
      <GlassCard hover={false} className="p-5 border-neon-turquoise/20 bg-neon-turquoise/5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 text-neon-turquoise" />
          <div>
            <h3 className="text-sm font-display font-semibold text-neon-turquoise">Ballot Locked In</h3>
            <p className="text-[10px] text-muted-foreground">
              Your ranked ballot for {category.name} has been submitted and is final.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {sortedVotes.map(v => (
            <div
              key={v.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                v.nominee_id === currentNomineeId
                  ? 'border-primary bg-primary/10'
                  : 'border-border/40 bg-secondary/20'
              }`}
            >
              <NeonBadge color="magenta" className="text-[10px] flex-shrink-0">
                {RANK_LABELS[v.vote_rank] || `Rank ${v.vote_rank}`}
              </NeonBadge>
              <CheckCircle2 className="w-4 h-4 text-neon-turquoise flex-shrink-0" />
              <Link
                to={`/nominee/${v.nominee_id}`}
                className={`text-sm font-medium truncate hover:text-primary transition-colors ${
                  v.nominee_id === currentNomineeId ? 'text-primary' : 'text-foreground'
                }`}
              >
                {v.nominee_name}
              </Link>
            </div>
          ))}
        </div>

        {myCategoryVotes[0]?.conflict_disclosed && (
          <p className="text-[10px] text-muted-foreground mt-2">
            <Shield className="w-3 h-3 inline mr-1" /> Conflict of interest disclosed
          </p>
        )}

        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          Become Who You Were Meant to Be.
        </p>
      </GlassCard>
    );
  }

  // ─── Active ranked-choice ballot ───
  const selectedRanks = Object.keys(selections).filter(r => selections[r]);

  return (
    <GlassCard hover={false} className="p-5 space-y-3 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <ListOrdered className="w-5 h-5 text-neon-magenta" />
        <div>
          <h3 className="text-sm font-display font-semibold">Ranked Choice Ballot</h3>
          <p className="text-[10px] text-muted-foreground">
            {category.name} · Final Voting · Select your 1st, 2nd, and 3rd choices
          </p>
        </div>
      </div>

      {nominees.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No nominees have been added to this category yet.
        </p>
      ) : (
        <>
          <RankedChoiceSelector
            nominees={nominees}
            selections={selections}
            onSelect={handleSelect}
            onClear={handleClear}
          />

          <label className="flex items-start gap-2 p-2.5 bg-secondary/20 rounded-lg cursor-pointer">
            <Checkbox
              checked={conflictDisclosed}
              onCheckedChange={(checked) => setConflictDisclosed(!!checked)}
              className="mt-0.5"
            />
            <span className="text-[11px] text-muted-foreground">
              I have a conflict of interest with one or more nominees in this category and am disclosing it.
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full bg-gradient-neon hover:opacity-90 text-white"
            disabled={selectedRanks.length === 0 || submitBallotMutation.isPending}
            onClick={handleSubmit}
          >
            {submitBallotMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Locking In Ballot...</>
            ) : (
              <><Trophy className="w-4 h-4" /> Submit Final Ballot</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Once submitted, your ranked ballot is final and cannot be changed.
          </p>
        </>
      )}
    </GlassCard>
  );
}