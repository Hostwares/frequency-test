import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, ArrowRight, Heart, Users, Radio, Settings, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function Wallet() {
  const queryClient = useQueryClient();
  const [editingBudget, setEditingBudget] = React.useState(false);
  const [draftBudget, setDraftBudget] = React.useState(12);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const saveBudget = useMutation({
    mutationFn: () => base44.auth.updateMe({ monthly_budget: draftBudget }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setEditingBudget(false);
    },
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['wallet-allocations'],
    queryFn: async () => {
      const u = await base44.auth.me();
      return base44.entities.SupportAllocation.filter({ fan_user_id: u.id, is_active: true });
    },
  });

  const budget = user?.monthly_budget || 12;
  const artistSupport = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const discoveryPool = budget * 0.15;
  const communityPool = budget * 0.10;
  const platformOps = budget * 0.05;
  const directToArtists = budget - discoveryPool - communityPool - platformOps;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-cyan/10">
            <WalletIcon className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Support Wallet</h1>
            <p className="text-xs text-muted-foreground">Control exactly where your money goes</p>
          </div>
        </div>

        {/* Monthly Plan Overview */}
        <GlassCard hover={false} className="p-5 md:p-6 mb-6 bg-gradient-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-display font-semibold">Monthly Plan</h2>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <span>${draftBudget}/mo</span>
                </div>
                <Slider min={5} max={100} step={1} value={[draftBudget]} onValueChange={([v]) => setDraftBudget(v)} className="flex-1 min-w-0" />
                <Button size="icon" className="w-7 h-7 flex-shrink-0 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30"
                  onClick={() => saveBudget.mutate()}>
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-neon-cyan">${budget}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => { setDraftBudget(budget); setEditingBudget(true); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <AllocationRow
              label="Direct Artist Support"
              amount={directToArtists}
              total={budget}
              color="bg-neon-purple"
              icon={Heart}
            />
            <AllocationRow
              label="Discovery Pool"
              amount={discoveryPool}
              total={budget}
              color="bg-neon-cyan"
              icon={ArrowRight}
            />
            <AllocationRow
              label="Community Pool"
              amount={communityPool}
              total={budget}
              color="bg-neon-magenta"
              icon={Radio}
            />
            <AllocationRow
              label="Platform Operations"
              amount={platformOps}
              total={budget}
              color="bg-neon-turquoise"
              icon={Settings}
            />
          </div>
        </GlassCard>

        {/* Artist Allocations */}
        <h2 className="font-display font-semibold text-foreground mb-4">
          Your Artist Support ({allocations.length}/25)
        </h2>
        {allocations.length > 0 ? (
          <div className="space-y-3">
            {allocations.map(alloc => (
              <GlassCard key={alloc.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&q=80"
                    alt={alloc.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{alloc.artist_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <NeonBadge color="purple">{alloc.tier}</NeonBadge>
                    {alloc.referred_by_artist_id && (
                      <span className="text-[10px] text-neon-turquoise">Via referral</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-neon-cyan font-bold">${alloc.amount}</p>
                  <p className="text-[10px] text-muted-foreground">per month</p>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8 text-center">
            <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No artists supported yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse artists and allocate your monthly support to those you believe in.
            </p>
          </GlassCard>
        )}

        {/* How It Works */}
        <GlassCard hover={false} className="p-6 mt-8 bg-gradient-card">
          <h3 className="font-display font-semibold mb-3">How Your Support Works</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• Your monthly support goes <span className="text-foreground font-medium">directly</span> to artists you choose — not into a giant pool.</p>
            <p>• No pay-per-stream. Artists earn based on <span className="text-neon-purple font-medium">real fan relationships</span>.</p>
            <p>• Support up to <span className="text-neon-cyan font-medium">25 artists</span> at a time. Swap anytime.</p>
            <p>• Discovery and community pools help <span className="text-neon-turquoise font-medium">emerging artists</span> get found.</p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

function AllocationRow({ label, amount, total, color, icon: Icon }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground font-medium">${amount.toFixed(2)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${(amount / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}