import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Trophy, Vote, Loader2, BarChart3, Users, ChevronDown, ChevronUp,
  Crown, TrendingUp, Radio
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const PHASE_CONFIG = {
  nomination: { color: 'cyan', label: 'Nomination' },
  final_voting: { color: 'magenta', label: 'Final Voting' },
  closed: { color: 'blue', label: 'Closed' },
  not_started: { color: 'blue', label: 'Not Started' },
};

export default function AcademyVotingTally() {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const currentYear = new Date().getFullYear();

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['awards-categories-admin', currentYear],
    queryFn: () => base44.entities.AwardsCategory.filter(
      { year: currentYear }, 'sort_order', 100
    ),
  });

  const { data: nominees = [], isLoading: nomLoading } = useQuery({
    queryKey: ['awards-nominees-admin', currentYear],
    queryFn: () => base44.entities.AwardsNominee.filter(
      { year: currentYear }, '-votes_count', 500
    ),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['academy-members-active-count'],
    queryFn: () => base44.entities.AcademyMember.filter(
      { membership_status: 'active' }, '-applied_date', 1000
    ),
  });

  const { data: talliesData, isLoading: tallyLoading } = useQuery({
    queryKey: ['awards-tallies', currentYear],
    queryFn: async () => {
      const entries = await Promise.all(
        categories.map(async cat => {
          try {
            const res = await base44.functions.invoke('castAcademyVote', {
              action: 'get_category_tally',
              category_id: cat.id,
            });
            return [cat.id, res.data];
          } catch {
            return [cat.id, { tally: {}, total_votes: 0 }];
          }
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: categories.length > 0,
    refetchInterval: 5000,
  });

  const nomineesByCategory = useMemo(() => {
    const map = {};
    nominees.forEach(n => {
      if (!map[n.category_id]) map[n.category_id] = [];
      map[n.category_id].push(n);
    });
    return map;
  }, [nominees]);

  const totalActiveMembers = members.length;
  const totalVotesAll = useMemo(() => {
    if (!talliesData) return 0;
    return Object.values(talliesData).reduce((sum, t) => sum + (t?.total_votes || 0), 0);
  }, [talliesData]);

  const toggleCategory = (id) => {
    setExpandedCategory(prev => prev === id ? null : id);
  };

  if (catLoading || nomLoading || tallyLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-display font-bold">Voting Tally & Results</h2>
          <p className="text-xs text-muted-foreground">Live Academy voting results — My Life Awards™ {currentYear}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <Users className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-cyan">{totalActiveMembers}</p>
          <p className="text-[10px] text-muted-foreground">Active Governors</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Vote className="w-4 h-4 text-neon-purple mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-purple">{totalVotesAll}</p>
          <p className="text-[10px] text-muted-foreground">Total Votes Cast</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Trophy className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-magenta">{categories.length}</p>
          <p className="text-[10px] text-muted-foreground">Categories</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <TrendingUp className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-turquoise">
            {totalActiveMembers > 0 ? Math.round((totalVotesAll / totalActiveMembers) * 10) / 10 : 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Avg Votes/Governor</p>
        </GlassCard>
      </div>

      {/* Category Results */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <GlassCard hover={false} className="p-10 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No award categories created for the {currentYear} cycle yet.</p>
          </GlassCard>
        ) : (
          categories.map(category => {
            const phaseCfg = PHASE_CONFIG[category.voting_phase] || PHASE_CONFIG.not_started;
            const tally = talliesData?.[category.id];
            const totalVotes = tally?.total_votes || 0;
            const catNominees = nomineesByCategory[category.id] || [];
            const isExpanded = expandedCategory === category.id;
            const isOpen = category.voting_phase === 'nomination' || category.voting_phase === 'final_voting';

            const sortedNominees = [...catNominees].sort((a, b) => {
              const aVotes = tally?.tally?.[a.id] || 0;
              const bVotes = tally?.tally?.[b.id] || 0;
              return bVotes - aVotes;
            });

            const leadingNominee = sortedNominees[0];
            const leadingVotes = leadingNominee ? (tally?.tally?.[leadingNominee.id] || 0) : 0;

            return (
              <GlassCard key={category.id} hover={false} className="overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-secondary/20"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isOpen ? (category.voting_phase === 'final_voting' ? 'bg-neon-magenta/15' : 'bg-neon-cyan/15') : 'bg-secondary/30'
                  }`}>
                    <Trophy className={`w-4 h-4 ${
                      isOpen
                        ? (category.voting_phase === 'final_voting' ? 'text-neon-magenta' : 'text-neon-cyan')
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-display font-semibold truncate">{category.name}</h4>
                      <NeonBadge color={phaseCfg.color} className="text-[10px]">{phaseCfg.label}</NeonBadge>
                      {category.category_type === 'live_performance' && (
                        <NeonBadge color="turquoise" className="text-[10px] gap-1 flex items-center">
                          <Radio className="w-3 h-3" /> Live Performance
                        </NeonBadge>
                      )}
                      {isOpen && (
                        <span className="flex items-center gap-1 text-[10px] text-neon-turquoise">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-turquoise animate-pulse-glow" />
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{totalVotes} votes</span>
                      <span className="text-[10px] text-muted-foreground">{catNominees.length}/{category.max_nominees || 5} nominees</span>
                      {leadingNominee && leadingVotes > 0 && (
                        <span className="text-[10px] text-neon-turquoise">
                          Leading: {leadingNominee.nominee_name} ({leadingVotes})
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3">
                    {sortedNominees.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No nominees in this category.</p>
                    ) : (
                      <div className="space-y-2">
                        {sortedNominees.map((nominee, idx) => {
                          const voteCount = tally?.tally?.[nominee.id] || 0;
                          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                          const isLeading = idx === 0 && voteCount > 0;

                          return (
                            <div key={nominee.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                {isLeading && <Crown className="w-3.5 h-3.5 text-neon-magenta flex-shrink-0" />}
                                <span className={`text-sm ${isLeading ? 'font-bold' : 'font-medium'}`}>{nominee.nominee_name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{voteCount} votes</span>
                                <NeonBadge color={isLeading ? 'magenta' : 'blue'} className="text-[10px]">{percentage.toFixed(1)}%</NeonBadge>
                              </div>
                              <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isLeading ? 'bg-gradient-neon' : 'bg-primary/40'
                                  }`}
                                  style={{ width: `${Math.max(percentage, 2)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {totalVotes === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No votes cast yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}