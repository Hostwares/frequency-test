import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Share2, Link, Twitter, Copy, CheckCheck,
  UserPlus, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonBadge from '@/components/shared/NeonBadge';

const RANK_STYLES = [
  { ring: 'border-yellow-400/60 bg-yellow-400/10', text: 'text-yellow-400', label: '🥇' },
  { ring: 'border-slate-300/50 bg-slate-300/10',   text: 'text-slate-300',  label: '🥈' },
  { ring: 'border-amber-600/50 bg-amber-600/10',   text: 'text-amber-500',  label: '🥉' },
];

function SharePanel({ userId, artistName, referralCount }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/artists?ref=${userId}`;
  const shareText = `I've brought ${referralCount} new listener${referralCount !== 1 ? 's' : ''} to ${artistName} on Frequency! Join me in supporting independent artists 🎵`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: 'Frequency', text: shareText, url: referralLink });
    } else {
      copyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-2 p-3 rounded-xl border border-neon-purple/20 bg-neon-purple/5 space-y-2">
        {/* Referral link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2 border border-border/40 min-w-0">
            <Link className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">{referralLink}</span>
          </div>
          <button
            onClick={copyLink}
            className="flex-shrink-0 p-2 rounded-lg border border-border/40 bg-secondary/40 hover:bg-secondary/70 transition-colors"
          >
            {copied
              ? <CheckCheck className="w-3.5 h-3.5 text-neon-cyan" />
              : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <button
            onClick={shareTwitter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-medium hover:bg-sky-500/25 transition-colors"
          >
            <Twitter className="w-3 h-3" /> Twitter / X
          </button>
          <button
            onClick={shareNative}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/40 text-muted-foreground text-xs font-medium hover:bg-secondary/70 transition-colors"
          >
            <Share2 className="w-3 h-3" /> Share
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LeaderboardRow({ entry, rank, currentUserId }) {
  const [showShare, setShowShare] = useState(false);
  const isMe = entry.fan_user_id === currentUserId;
  const rankStyle = RANK_STYLES[rank] || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={`rounded-xl border p-3 transition-all ${
        isMe
          ? 'border-neon-purple/40 bg-neon-purple/8'
          : 'border-border/30 bg-secondary/10'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          rankStyle ? `${rankStyle.ring} ${rankStyle.text}` : 'border-border/30 bg-secondary/30 text-muted-foreground'
        }`}>
          {rankStyle ? rankStyle.label : `#${rank + 1}`}
        </div>

        {/* Name & stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold truncate ${isMe ? 'text-neon-purple' : 'text-foreground'}`}>
              {isMe ? 'You' : entry.display_name || `Fan #${rank + 1}`}
            </p>
            {isMe && <NeonBadge color="purple">you</NeonBadge>}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {entry.count} new listener{entry.count !== 1 ? 's' : ''} referred
          </p>
        </div>

        {/* Count + share */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
            <UserPlus className="w-3 h-3 text-neon-cyan" />
            <span className="text-xs font-bold text-neon-cyan">{entry.count}</span>
          </div>
          {isMe && (
            <button
              onClick={() => setShowShare(v => !v)}
              className="p-1.5 rounded-lg border border-border/40 bg-secondary/30 hover:bg-secondary/60 transition-colors"
            >
              {showShare
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showShare && isMe && (
          <SharePanel
            userId={currentUserId}
            artistName="your favorite artists"
            referralCount={entry.count}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReferralLeaderboard({ currentUserId }) {
  const [showShare, setShowShare] = useState(false);

  // Fetch all active allocations that have a referral source
  const { data: allReferrals = [], isLoading } = useQuery({
    queryKey: ['all-referrals-leaderboard'],
    queryFn: () => base44.entities.SupportAllocation.filter({ is_active: true }, '-created_date', 200),
    select: (data) => data.filter(r => !!r.referred_by_fan_id),
  });

  // Aggregate by fan referrer
  const leaderboard = useMemo(() => {
    const map = {};
    allReferrals.forEach(r => {
      const id = r.referred_by_fan_id;
      if (!map[id]) map[id] = { fan_user_id: id, count: 0, total: 0 };
      map[id].count++;
      map[id].total += r.amount || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allReferrals]);

  const myEntry = leaderboard.find(e => e.fan_user_id === currentUserId);
  const myRank = myEntry ? leaderboard.indexOf(myEntry) : -1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display font-semibold text-sm">Referral Leaderboard</h2>
        </div>
        {myRank >= 0 && (
          <NeonBadge color="cyan">You're #{myRank + 1}</NeonBadge>
        )}
      </div>

      {/* My share link (always visible) */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/30 bg-secondary/20">
        <div className="flex items-center gap-2">
          <Link className="w-3.5 h-3.5 text-neon-purple" />
          <span className="text-xs text-muted-foreground">Your referral link</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowShare(v => !v)}
          className="h-7 text-xs border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
        >
          <Share2 className="w-3 h-3 mr-1" />
          {showShare ? 'Hide' : 'Share'}
        </Button>
      </div>

      <AnimatePresence>
        {showShare && (
          <SharePanel
            userId={currentUserId}
            artistName="your favorite artists"
            referralCount={myEntry?.count || 0}
          />
        )}
      </AnimatePresence>

      {/* Leaderboard */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
          <Trophy className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No referrals yet — be the first on the board!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((entry, i) => (
            <LeaderboardRow
              key={entry.fan_user_id}
              entry={entry}
              rank={i}
              currentUserId={currentUserId}
            />
          ))}
          {leaderboard.length > 10 && (
            <p className="text-center text-xs text-muted-foreground pt-1">
              +{leaderboard.length - 10} more fans
            </p>
          )}
        </div>
      )}
    </div>
  );
}