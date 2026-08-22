import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Sparkles, Music, Trophy, Info } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM

function VoteRow({ item, rank, voteCount, hasVoted, onVote, isVoting, type }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        hasVoted
          ? 'border-neon-purple/40 bg-neon-purple/5'
          : 'border-border/40 bg-secondary/20 hover:border-border/60'
      }`}
    >
      {/* Rank */}
      <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
        rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-muted-foreground'
      }`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.target_name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{type}</p>
      </div>

      {/* Vote count */}
      <span className="text-xs font-semibold text-muted-foreground min-w-[2rem] text-right">
        {voteCount}
      </span>

      {/* Vote button */}
      <button
        onClick={() => onVote(item)}
        disabled={isVoting}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          hasVoted
            ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple cursor-default'
            : 'border-border/50 text-muted-foreground hover:border-neon-purple/50 hover:text-neon-purple hover:bg-neon-purple/10'
        }`}
      >
        <ChevronUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-neon-purple' : ''}`} />
        {hasVoted ? 'Voted' : 'Vote'}
      </button>
    </motion.div>
  );
}

export default function CommunityVotePanel({ community, currentUser }) {
  const [tab, setTab] = useState('artists');
  const queryClient = useQueryClient();

  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['community-votes', community.id, CURRENT_MONTH],
    queryFn: () => base44.entities.CommunityVote.filter({
      community_id: community.id,
      month: CURRENT_MONTH,
    }),
  });

  const { data: artists = [] } = useQuery({
    queryKey: ['community-artists-vote', community.id],
    queryFn: () => base44.entities.ArtistProfile.list('-resonance_score', 30),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['community-songs-vote', community.id],
    queryFn: () => base44.entities.Song.list('-play_count', 30),
  });

  const castVote = useMutation({
    mutationFn: async ({ targetType, targetId, targetName }) => {
      // Toggle off if already voted
      const existing = votes.find(v =>
        v.voter_user_id === currentUser?.id &&
        v.target_type === targetType &&
        v.target_id === targetId
      );
      if (existing) {
        await base44.entities.CommunityVote.delete(existing.id);
      } else {
        await base44.entities.CommunityVote.create({
          voter_user_id: currentUser.id,
          community_id: community.id,
          target_type: targetType,
          target_id: targetId,
          target_name: targetName,
          month: CURRENT_MONTH,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-votes', community.id, CURRENT_MONTH] }),
  });

  // Aggregate vote counts
  const tally = useMemo(() => {
    const map = {};
    votes.forEach(v => {
      const key = `${v.target_type}:${v.target_id}`;
      if (!map[key]) map[key] = { ...v, count: 0 };
      map[key].count++;
    });
    return map;
  }, [votes]);

  const myVotes = useMemo(() =>
    new Set(votes.filter(v => v.voter_user_id === currentUser?.id).map(v => `${v.target_type}:${v.target_id}`)),
    [votes, currentUser]
  );

  // Build ranked lists
  const rankedArtists = useMemo(() => {
    const seen = new Set();
    const rows = [];
    // Add already-voted artists first, then fill from artist list
    Object.values(tally).filter(t => t.target_type === 'artist').forEach(t => {
      seen.add(t.target_id);
      rows.push(t);
    });
    artists.forEach(a => {
      if (!seen.has(a.id)) rows.push({ target_id: a.id, target_name: a.artist_name, target_type: 'artist', count: 0 });
    });
    return rows.sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 15);
  }, [tally, artists]);

  const rankedSongs = useMemo(() => {
    const seen = new Set();
    const rows = [];
    Object.values(tally).filter(t => t.target_type === 'song').forEach(t => {
      seen.add(t.target_id);
      rows.push(t);
    });
    songs.forEach(s => {
      if (!seen.has(s.id)) rows.push({ target_id: s.id, target_name: s.title, target_type: 'song', count: 0 });
    });
    return rows.sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 15);
  }, [tally, songs]);

  const activeList = tab === 'artists' ? rankedArtists : rankedSongs;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Monthly Discovery Votes</h2>
        </div>
        <NeonBadge color="purple">{CURRENT_MONTH}</NeonBadge>
      </div>

      <div className="flex items-start gap-2 bg-neon-purple/5 border border-neon-purple/20 rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 text-neon-purple flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Vote for your favorite artists and tracks. Top-voted picks shape this community's monthly discovery pool.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'artists', label: 'Artists', icon: Sparkles },
          { id: 'songs', label: 'Tracks', icon: Music },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              tab === id
                ? 'bg-primary text-white border-primary'
                : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Vote list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {activeList.map((item, i) => (
              <VoteRow
                key={item.target_id}
                item={item}
                rank={i + 1}
                voteCount={item.count || 0}
                hasVoted={myVotes.has(`${item.target_type}:${item.target_id}`)}
                onVote={(item) => castVote.mutate({
                  targetType: item.target_type,
                  targetId: item.target_id,
                  targetName: item.target_name,
                })}
                isVoting={castVote.isPending}
                type={tab === 'artists' ? 'artist' : 'track'}
              />
            ))}
            {activeList.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">
                No {tab} to vote on yet.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}