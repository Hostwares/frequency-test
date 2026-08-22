import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Lock, Loader2, KeyRound, ShieldCheck, Trophy, CheckCircle2,
  Sparkles, Award, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function GovernorPrivateGate({ member }) {
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(null);
  const [error, setError] = useState('');

  const redeemMutation = useMutation({
    mutationFn: (accessCode) => base44.functions.invoke('sendGovernorAccessCode', {
      action: 'redeem_code',
      access_code: accessCode,
    }),
    onSuccess: (res) => {
      const data = res.data || res;
      if (data.success) {
        setUnlocked(data);
        setError('');
      } else {
        setError(data.error || 'Failed to unlock');
      }
    },
    onError: (err) => {
      setError(err?.response?.data?.error || err?.message || 'Invalid access code');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError('');
    redeemMutation.mutate(code.trim());
  };

  // ── Unlocked: Show completion badge ──
  if (unlocked) {
    const allVoted = unlocked.all_assigned_voted;
    const assignedCount = unlocked.assigned_categories?.length || 0;
    const completedCount = unlocked.completed_categories?.length || 0;
    const progressPct = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

    return (
      <GlassCard hover={false} className="p-6 space-y-5 bg-gradient-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neon-turquoise" />
          <h3 className="text-sm font-display font-semibold">Governor Private View</h3>
          <NeonBadge color="turquoise">Verified</NeonBadge>
        </div>

        {/* Completion Badge */}
        <div className="flex flex-col items-center py-4">
          {allVoted ? (
            <div className="text-center space-y-3">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-neon-turquoise/20 blur-2xl rounded-full" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-neon-turquoise/30 to-neon-cyan/20 border-2 border-neon-turquoise flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-neon-turquoise" />
                </div>
                <Sparkles className="w-5 h-5 text-neon-cyan absolute -top-1 -right-1" />
              </div>
              <div>
                <p className="text-lg font-display font-bold text-neon-turquoise">
                  Full Participation
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You have cast votes in all {assignedCount} assigned categories.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <NeonBadge color="turquoise">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />
                  {completedCount}/{assignedCount} Categories Complete
                </NeonBadge>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="relative inline-flex">
                <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
                  <Award className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-base font-display font-bold text-foreground">
                  Voting In Progress
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You've completed {completedCount} of {assignedCount} assigned categories.
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto">
                <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-neon rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{progressPct}% Complete</p>
              </div>
              <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
                Complete all assigned category votes to earn your Full Participation badge.
              </p>
            </div>
          )}
        </div>

        {/* Governor Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-secondary/20 rounded-lg text-center">
            <Star className="w-3.5 h-3.5 text-neon-cyan mx-auto mb-0.5" />
            <p className="text-sm font-bold text-foreground">{unlocked.total_votes_cast || 0}</p>
            <p className="text-[9px] text-muted-foreground">Votes Cast</p>
          </div>
          <div className="p-2.5 bg-secondary/20 rounded-lg text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-neon-turquoise mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground capitalize">
              {unlocked.governor_tier || 'member'}
            </p>
            <p className="text-[9px] text-muted-foreground">Governor Tier</p>
          </div>
          <div className="p-2.5 bg-secondary/20 rounded-lg text-center">
            <Sparkles className="w-3.5 h-3.5 text-neon-purple mx-auto mb-0.5" />
            <p className="text-sm font-bold text-foreground">{unlocked.community_impact_score || 0}</p>
            <p className="text-[9px] text-muted-foreground">Impact Score</p>
          </div>
        </div>

        {/* Category checklist */}
        {assignedCount > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned Categories</p>
            {unlocked.assigned_categories.map((cat, i) => {
              const isDone = unlocked.completed_categories?.some(
                c => c.toLowerCase() === cat.toLowerCase()
              );
              return (
                <div key={i} className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-turquoise flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground italic">
            "Become Who You Were Meant to Be."
          </p>
        </div>
      </GlassCard>
    );
  }

  // ── Locked: Show code entry ──
  return (
    <GlassCard hover={false} className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-neon-magenta" />
        <h3 className="text-sm font-display font-semibold">Governor Private Access</h3>
        <NeonBadge color="magenta">Confidential</NeonBadge>
      </div>

      <div className="flex items-start gap-3 p-3 bg-neon-magenta/5 border border-neon-magenta/20 rounded-lg">
        <KeyRound className="w-4 h-4 text-neon-magenta flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This section is private and visible only to verified Academy Governors. Enter the
          access code sent to you by the Academy administration to view your voting completion badge.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Private Access Code</label>
          <Input
            placeholder="Enter your 8-character code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="h-10 text-sm font-mono tracking-[0.3em] text-center uppercase"
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-neon hover:opacity-90 text-white gap-1.5"
          disabled={redeemMutation.isPending || !code.trim()}
        >
          {redeemMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            <><ShieldCheck className="w-4 h-4" /> Unlock Private View</>
          )}
        </Button>
      </form>

      <p className="text-[10px] text-muted-foreground text-center">
        Don't have a code? The Academy administration sends access codes directly to verified governors.
      </p>
    </GlassCard>
  );
}