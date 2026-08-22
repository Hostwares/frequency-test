import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Vote, Lock, CheckCircle2, Loader2, Shield, ChevronDown, ChevronUp,
  Trophy, AlertCircle, Clock, ListOrdered, Filter, UserCheck, LayoutGrid, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import RankedChoiceSelector from '@/components/academy/RankedChoiceSelector';

const PHASE_CONFIG = {
  nomination: { color: 'cyan', label: 'Nomination Voting', icon: Vote },
  final_voting: { color: 'magenta', label: 'Final Voting', icon: Trophy },
  closed: { color: 'blue', label: 'Voting Closed', icon: Lock },
  not_started: { color: 'blue', label: 'Not Started', icon: Clock },
};

const NOMINEE_TYPE_LABELS = {
  artist: 'Artist', song: 'Song', release: 'Release',
  community: 'Community', discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer', editorial: 'Editorial',
  live_performance: 'Live Performance',
};

const RANK_LABELS = { 1: '1st', 2: '2nd', 3: '3rd' };

export default function AcademyVotingPanel({ member }) {
  const qc = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedNominee, setSelectedNominee] = useState({});
  const [rankedSelections, setRankedSelections] = useState({});
  const [conflictDisclosed, setConflictDisclosed] = useState({});
  const [error, setError] = useState({});
  const [showAllCategories, setShowAllCategories] = useState(false);

  const currentYear = new Date().getFullYear();

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['awards-categories', currentYear],
    queryFn: () => base44.entities.AwardsCategory.filter(
      { year: currentYear, is_active: true }, 'sort_order', 100
    ),
  });

  const { data: nominees = [], isLoading: nomLoading } = useQuery({
    queryKey: ['awards-nominees', currentYear],
    queryFn: () => base44.entities.AwardsNominee.filter(
      { year: currentYear }, '-votes_count', 500
    ),
  });

  const { data: myVotesData, isLoading: votesLoading } = useQuery({
    queryKey: ['my-awards-votes'],
    queryFn: () => base44.functions.invoke('castAcademyVote', { action: 'get_my_votes' }),
  });

  const myVotes = useMemo(() => {
    const votes = myVotesData?.data?.votes || [];
    const map = {};
    votes.forEach(v => {
      const key = `${v.category_id}_${v.voting_phase}`;
      if (v.voting_phase === 'final_voting') {
        if (!map[key]) map[key] = [];
        map[key].push(v);
      } else {
        map[key] = v;
      }
    });
    return map;
  }, [myVotesData]);

  const castVoteMutation = useMutation({
    mutationFn: (params) => base44.functions.invoke('castAcademyVote', {
      action: params.voting_phase === 'final_voting' ? 'cast_ranked_votes' : 'cast_vote',
      ...params,
    }),
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['my-awards-votes'] });
      qc.invalidateQueries({ queryKey: ['awards-nominees'] });
      setRankedSelections(prev => ({ ...prev, [params.category_id]: {} }));
      setSelectedNominee(prev => ({ ...prev, [params.category_id]: null }));
      setExpandedCategory(null);
      setError(prev => ({ ...prev, [params.category_id]: null }));
    },
    onError: (err, params) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to cast vote';
      setError(prev => ({ ...prev, [params.category_id]: msg }));
    },
  });

  const nomineesByCategory = useMemo(() => {
    const map = {};
    nominees.forEach(n => {
      if (!map[n.category_id]) map[n.category_id] = [];
      map[n.category_id].push(n);
    });
    return map;
  }, [nominees]);

  const hasAssignedCategories = (member.assigned_categories?.length || 0) > 0;

  const assignedCategoryNames = useMemo(() => {
    if (!hasAssignedCategories) return new Set();
    return new Set(member.assigned_categories);
  }, [member, hasAssignedCategories]);

  const isCategoryAssigned = (category) => {
    if (!hasAssignedCategories) return true;
    return assignedCategoryNames.has(category.name);
  };

  const openCategories = useMemo(() => {
    let cats = categories.filter(c => c.voting_phase === 'nomination' || c.voting_phase === 'final_voting');
    if (hasAssignedCategories && !showAllCategories) {
      cats = cats.filter(c => assignedCategoryNames.has(c.name));
    }
    return cats;
  }, [categories, hasAssignedCategories, showAllCategories, assignedCategoryNames]);

  const closedCategories = useMemo(() => {
    let cats = categories.filter(c => c.voting_phase === 'closed' || c.voting_phase === 'not_started');
    if (hasAssignedCategories && !showAllCategories) {
      cats = cats.filter(c => assignedCategoryNames.has(c.name));
    }
    return cats;
  }, [categories, hasAssignedCategories, showAllCategories, assignedCategoryNames]);

  const stats = useMemo(() => {
    const openCount = openCategories.length;
    let votedCount = 0;
    openCategories.forEach(cat => {
      const key = `${cat.id}_${cat.voting_phase}`;
      const val = myVotes[key];
      if (Array.isArray(val) ? val.length > 0 : !!val) votedCount++;
    });
    return { openCount, votedCount, remaining: openCount - votedCount };
  }, [openCategories, myVotes]);

  const handleCastVote = (category) => {
    const catId = category.id;
    if (category.voting_phase === 'final_voting') {
      const selections = rankedSelections[catId] || {};
      const ranks = Object.keys(selections).filter(r => selections[r]);
      if (ranks.length === 0) {
        setError(prev => ({ ...prev, [catId]: 'Please select at least your 1st choice' }));
        return;
      }
      const selectionArray = ranks.map(rank => ({
        nominee_id: selections[rank],
        vote_rank: parseInt(rank),
      }));
      setError(prev => ({ ...prev, [catId]: null }));
      castVoteMutation.mutate({
        category_id: catId,
        voting_phase: 'final_voting',
        selections: selectionArray,
        conflict_disclosed: conflictDisclosed[catId] || false,
      });
    } else {
      const nomineeId = selectedNominee[catId];
      if (!nomineeId) {
        setError(prev => ({ ...prev, [catId]: 'Please select a nominee first' }));
        return;
      }
      setError(prev => ({ ...prev, [catId]: null }));
      castVoteMutation.mutate({
        category_id: catId,
        nominee_id: nomineeId,
        voting_phase: 'nomination',
        conflict_disclosed: conflictDisclosed[catId] || false,
      });
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
    setError(prev => ({ ...prev, [categoryId]: null }));
  };

  const handleRankedSelect = (categoryId, rank, nomineeId) => {
    setRankedSelections(prev => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || {}), [rank]: nomineeId },
    }));
  };

  const handleRankedClear = (categoryId, rank) => {
    setRankedSelections(prev => {
      const updated = { ...(prev[categoryId] || {}) };
      delete updated[rank];
      return { ...prev, [categoryId]: updated };
    });
  };

  if (catLoading || nomLoading || votesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Vote className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-display font-bold">Official Voting Ballot</h2>
          <p className="text-xs text-muted-foreground">My Life Awards™ {currentYear} Cycle</p>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <Vote className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-cyan">{stats.openCount}</p>
          <p className="text-[10px] text-muted-foreground">Open Categories</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <CheckCircle2 className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-turquoise">{stats.votedCount}</p>
          <p className="text-[10px] text-muted-foreground">Votes Cast</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <AlertCircle className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-magenta">{Math.max(0, stats.remaining)}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </GlassCard>
      </div>

      {/* Confidentiality reminder */}
      <GlassCard hover={false} className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">Confidential Voting</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              All votes are final and confidential.
              {member.is_voting_council
                ? ' As a Final Voting Council member, you can cast ranked votes (1st, 2nd, 3rd choice) in final voting and single votes in nomination.'
                : ' You are eligible for nomination voting (one vote per category). Final voting is reserved for the Voting Council.'}
              {hasAssignedCategories && ' You are voting in your assigned categories.'}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Category Filter Bar */}
      {hasAssignedCategories && (
        <GlassCard hover={false} className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Category Filter</p>
                <p className="text-[10px] text-muted-foreground">
                  {member.assigned_categories.length} categor{member.assigned_categories.length === 1 ? 'y' : 'ies'} assigned to you
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={!showAllCategories ? 'default' : 'outline'}
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowAllCategories(false)}
              >
                <UserCheck className="w-3.5 h-3.5" />
                My Assigned
              </Button>
              <Button
                size="sm"
                variant={showAllCategories ? 'default' : 'outline'}
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowAllCategories(true)}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                All Categories
              </Button>
            </div>
          </div>
          {!showAllCategories && member.assigned_categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
              {member.assigned_categories.map(catName => {
                const matched = categories.find(c => c.name === catName);
                const isOpen = matched && (matched.voting_phase === 'nomination' || matched.voting_phase === 'final_voting');
                return (
                  <NeonBadge key={catName} color={isOpen ? 'turquoise' : 'blue'} className="text-[10px]">
                    {catName}
                  </NeonBadge>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {/* No open categories */}
      {openCategories.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Voting Not Currently Open</p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasAssignedCategories && !showAllCategories
              ? 'None of your assigned categories are open for voting yet.'
              : `No categories are open for voting in the ${currentYear} cycle yet.`}
            {' '}Check the timeline above for upcoming voting phases.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {openCategories.map(category => {
            const phaseCfg = PHASE_CONFIG[category.voting_phase] || PHASE_CONFIG.not_started;
            const PhaseIcon = phaseCfg.icon;
            const voteKey = `${category.id}_${category.voting_phase}`;
            const myVote = myVotes[voteKey];
            const catNominees = nomineesByCategory[category.id] || [];
            const isExpanded = expandedCategory === category.id;
            const isFinalVoting = category.voting_phase === 'final_voting';
            const canVote = !isFinalVoting || member.is_voting_council;
            const catError = error[category.id];
            const isVoting = castVoteMutation.isPending;
            const hasVoted = Array.isArray(myVote) ? myVote.length > 0 : !!myVote;

            return (
              <GlassCard key={category.id} hover={false} className="overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => !hasVoted && canVote && toggleCategory(category.id)}
                  disabled={hasVoted || !canVote}
                  className={`w-full flex items-center gap-3 p-4 text-left ${
                    !hasVoted && canVote ? 'cursor-pointer hover:bg-secondary/20' : 'cursor-default'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isFinalVoting ? 'bg-neon-magenta/15' : 'bg-neon-cyan/15'
                  }`}>
                    <PhaseIcon className={`w-4 h-4 ${isFinalVoting ? 'text-neon-magenta' : 'text-neon-cyan'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-display font-semibold truncate">{category.name}</h4>
                      <NeonBadge color={phaseCfg.color} className="text-[10px]">{phaseCfg.label}</NeonBadge>
                      {catNominees.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{catNominees.length} nominees</span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
                    )}
                  </div>

                  {/* Status */}
                  {hasVoted ? (
                    <NeonBadge color="turquoise" className="flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" /> Voted
                    </NeonBadge>
                  ) : !canVote ? (
                    <NeonBadge color="blue" className="flex-shrink-0">
                      <Lock className="w-3 h-3 inline mr-1" /> Council Only
                    </NeonBadge>
                  ) : isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* My Vote Confirmation */}
                {hasVoted && (
                  <div className="px-4 pb-3">
                    {isFinalVoting && Array.isArray(myVote) ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Your Ranked Votes</p>
                        {myVote.sort((a, b) => a.vote_rank - b.vote_rank).map(v => (
                          <div key={v.id} className="flex items-center gap-2 p-2 bg-neon-turquoise/10 border border-neon-turquoise/20 rounded-lg">
                            <NeonBadge color="magenta" className="text-[10px]">{RANK_LABELS[v.vote_rank] || `Rank ${v.vote_rank}`}</NeonBadge>
                            <CheckCircle2 className="w-3.5 h-3.5 text-neon-turquoise flex-shrink-0" />
                            <p className="text-xs text-foreground">{v.nominee_name}</p>
                          </div>
                        ))}
                        {myVote[0]?.conflict_disclosed && (
                          <p className="text-[10px] text-muted-foreground">(conflict disclosed)</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 bg-neon-turquoise/10 border border-neon-turquoise/20 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neon-turquoise flex-shrink-0" />
                        <p className="text-xs text-foreground">
                          You voted for <strong>{myVote.nominee_name}</strong>
                          {myVote.conflict_disclosed && (
                            <span className="text-muted-foreground"> (conflict disclosed)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Voting */}
                {isExpanded && !hasVoted && canVote && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                    {catNominees.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No nominees have been added to this category yet.
                      </p>
                    ) : isFinalVoting ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <ListOrdered className="w-4 h-4 text-neon-magenta" />
                          <p className="text-xs font-medium text-foreground">Ranked Choice Voting</p>
                        </div>
                        <RankedChoiceSelector
                          nominees={catNominees}
                          selections={rankedSelections[category.id] || {}}
                          onSelect={(rank, nomineeId) => handleRankedSelect(category.id, rank, nomineeId)}
                          onClear={(rank) => handleRankedClear(category.id, rank)}
                        />

                        <label className="flex items-start gap-2 p-2.5 bg-secondary/20 rounded-lg cursor-pointer">
                          <Checkbox
                            checked={conflictDisclosed[category.id] || false}
                            onCheckedChange={(checked) => setConflictDisclosed(prev => ({ ...prev, [category.id]: !!checked }))}
                            className="mt-0.5"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            I have a conflict of interest with one or more nominees in this category and am disclosing it.
                          </span>
                        </label>

                        {catError && (
                          <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                            <p className="text-xs text-destructive">{catError}</p>
                          </div>
                        )}

                        <Button
                          className="w-full bg-gradient-neon hover:opacity-90 text-white"
                          disabled={isVoting}
                          onClick={() => handleCastVote(category)}
                        >
                          {isVoting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Votes...</>
                          ) : (
                            <><Trophy className="w-4 h-4" /> Submit Ranked Votes</>
                          )}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          Ranked votes are final and cannot be changed once submitted.
                        </p>
                      </>
                    ) : (
                      <>
                        {catNominees.map(nominee => {
                          const isSelected = selectedNominee[category.id] === nominee.id;
                          return (
                            <button
                              key={nominee.id}
                              onClick={() => setSelectedNominee(prev => ({ ...prev, [category.id]: nominee.id }))}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                isSelected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border/40 bg-secondary/20 hover:border-primary/30'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{nominee.nominee_name}</p>
                                <div className="flex items-center gap-2">
                                  <NeonBadge color="blue" className="text-[10px]">
                                    {NOMINEE_TYPE_LABELS[nominee.nominee_type] || nominee.nominee_type}
                                  </NeonBadge>
                                  {nominee.status === 'shortlisted' && (
                                    <NeonBadge color="purple" className="text-[10px]">Shortlisted</NeonBadge>
                                  )}
                                  {nominee.status === 'winner' && (
                                    <NeonBadge color="magenta" className="text-[10px]"><Trophy className="w-2.5 h-2.5 inline" /> Winner</NeonBadge>
                                  )}
                                </div>
                                {nominee.nomination_reason && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{nominee.nomination_reason}</p>
                                )}
                                <Link
                                  to={`/nominee/${nominee.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 text-[10px] text-neon-cyan hover:text-neon-cyan/80 mt-0.5"
                                >
                                  View Profile <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              </div>
                            </button>
                          );
                        })}

                        <label className="flex items-start gap-2 p-2.5 bg-secondary/20 rounded-lg cursor-pointer">
                          <Checkbox
                            checked={conflictDisclosed[category.id] || false}
                            onCheckedChange={(checked) => setConflictDisclosed(prev => ({ ...prev, [category.id]: !!checked }))}
                            className="mt-0.5"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            I have a conflict of interest with one or more nominees in this category and am disclosing it.
                          </span>
                        </label>

                        {catError && (
                          <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                            <p className="text-xs text-destructive">{catError}</p>
                          </div>
                        )}

                        <Button
                          className="w-full bg-gradient-neon hover:opacity-90 text-white"
                          disabled={!selectedNominee[category.id] || isVoting}
                          onClick={() => handleCastVote(category)}
                        >
                          {isVoting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Casting Vote...</>
                          ) : (
                            <><Vote className="w-4 h-4" /> Cast Vote</>
                          )}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          Votes are final and cannot be changed once submitted.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Closed Categories */}
      {closedCategories.length > 0 && (
        <GlassCard hover={false} className="p-4">
          <h4 className="text-xs font-display font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
            <Lock className="w-3.5 h-3.5" /> Upcoming & Closed Categories
          </h4>
          <div className="space-y-1.5">
            {closedCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                <span className="text-foreground">{cat.name}</span>
                <NeonBadge color="blue" className="text-[10px] ml-auto">
                  {PHASE_CONFIG[cat.voting_phase]?.label || cat.voting_phase}
                </NeonBadge>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}