import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Users, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const NOMINEE_TYPE_LABELS = {
  artist: 'Artist', song: 'Song', release: 'Release',
  community: 'Community', discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer', editorial: 'Editorial',
  live_performance: 'Live Performance',
};

export default function CategoryNomineeList({ category, currentNomineeId, myVotes = [] }) {
  const { data: nominees = [], isLoading } = useQuery({
    queryKey: ['awards-category-nominees', category.id],
    queryFn: () => base44.entities.AwardsNominee.filter(
      { category_id: category.id }, '-votes_count', 50
    ),
    enabled: !!category?.id,
  });

  if (isLoading) {
    return (
      <GlassCard hover={false} className="p-5 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </GlassCard>
    );
  }

  if (nominees.length === 0) {
    return null;
  }

  const myCategoryVotes = myVotes.filter(
    v => v.category_id === category.id && v.voting_phase === category.voting_phase
  );

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-display font-semibold">All Nominees in {category.name}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {nominees.length} nominee{nominees.length === 1 ? '' : 's'} in this category
        {category.voting_phase === 'nomination' || category.voting_phase === 'final_voting'
          ? ' — click any nominee to view their profile and vote.'
          : ' — voting is not currently open.'}
      </p>

      <div className="space-y-2">
        {nominees.map((nominee, idx) => {
          const isCurrent = nominee.id === currentNomineeId;
          const myVoteForNominee = myCategoryVotes.find(v => v.nominee_id === nominee.id);

          return (
            <Link
              key={nominee.id}
              to={`/nominee/${nominee.id}`}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isCurrent
                  ? 'border-primary bg-primary/10'
                  : 'border-border/40 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/30'
              }`}
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                {nominee.cover_image ? (
                  <img src={nominee.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>
                  {nominee.nominee_name}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <NeonBadge color="blue" className="text-[9px]">
                    {NOMINEE_TYPE_LABELS[nominee.nominee_type] || nominee.nominee_type}
                  </NeonBadge>
                  {nominee.votes_count > 0 && (
                    <span className="text-[9px] text-muted-foreground">{nominee.votes_count} votes</span>
                  )}
                </div>
              </div>

              {myVoteForNominee && (
                <NeonBadge color="turquoise" className="text-[9px] flex-shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />
                  {category.voting_phase === 'final_voting'
                    ? `Rank ${myVoteForNominee.vote_rank}`
                    : 'Voted'}
                </NeonBadge>
              )}

              {isCurrent ? (
                <span className="text-[10px] text-primary font-medium flex-shrink-0">Viewing</span>
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border/30">
        <Link
          to="/academy-dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-neon-cyan hover:text-neon-cyan/80 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5" /> View Full Voting Ballot
        </Link>
      </div>
    </GlassCard>
  );
}