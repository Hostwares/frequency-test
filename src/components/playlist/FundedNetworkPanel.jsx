import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Radio, AlertTriangle, Sparkles, Loader2, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import PurchaseVsFundingExplainer from '@/components/shared/PurchaseVsFundingExplainer';
import CustomAllocationEditor from '@/components/playlist/CustomAllocationEditor';
import { getAllocationTierForPlan, getAvailableAllocationMethods, canAccessCustomAllocation } from '@/lib/fundedNetworkLimits';
import { toast } from 'sonner';

const ALLOCATION_LABELS = {
  automatic: 'Automatic (Equal)',
  equal: 'Equal Split',
  custom: 'Custom %',
  weighted: 'Weighted',
};

const ALLOCK_TIER_LABELS = {
  standard: 'Standard',
  advanced: 'Advanced',
  advanced_plus: 'Advanced+',
};

export default function FundedNetworkPanel({ playlist, onUpdate }) {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: subscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: async () => {
      const res = await base44.entities.UserSubscription.filter({ user_id: user?.id, status: 'active' });
      return res?.[0] || null;
    },
    enabled: !!user?.id,
  });
  const [validation, setValidation] = useState(null);
  const [activating, setActivating] = useState(false);
  const [limitError, setLimitError] = useState(null);
  const navigate = useNavigate();

  const allocationTier = getAllocationTierForPlan(subscription?.plan_code);
  const availableMethods = getAvailableAllocationMethods(allocationTier);
  const canCustomize = canAccessCustomAllocation(allocationTier);

  const isOwner = user && (playlist.owner_user_id === user.id || playlist.created_by_id === user.id);

  useEffect(() => {
    if (!isOwner || !playlist.is_funded_network) return;
    let active = true;
    base44.functions.invoke('validateFundedNetworkChanges', { action: 'check_all' })
      .then((res) => { if (active) setValidation(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [playlist.is_funded_network, playlist.song_ids?.length, playlist.updated_date, isOwner]);

  if (!isOwner) return null;

  const handleToggle = async (checked) => {
    if (!checked) {
      setLimitError(null);
      setValidation(null);
      onUpdate({ is_funded_network: false });
      return;
    }
    // Turning a personal playlist into a funded network counts as creating one —
    // enforce the per-tier cap and show an upgrade prompt instead of failing silently.
    try {
      const res = await base44.functions.invoke('validateFundedNetworkChanges', { action: 'create_funded' });
      const data = res.data || {};
      const err = (data.errors || []).find((e) => e.type === 'funded_network_limit_reached');
      if (err) {
        setLimitError(err);
        toast.error('Funded network limit reached', {
          description: err.message,
          action: { label: 'Upgrade', onClick: () => navigate('/pricing') },
          duration: 6000,
        });
        return;
      }
    } catch {
      // non-fatal: allow the toggle
    }
    setLimitError(null);
    onUpdate({ is_funded_network: true });
    toast.success('Funded Network enabled — receives a share of your subscription pool');
  };

  const handleActivatePass = async () => {
    setActivating(true);
    try {
      const res = await base44.functions.invoke('activateDiscoveryPass', {});
      toast.success(`Discovery Pass activated — +${res.data.bonus_artists} artist slots for 30 days. ${res.data.remaining} left this year.`);
      const valRes = await base44.functions.invoke('validateFundedNetworkChanges', { action: 'check_all' });
      setValidation(valRes.data);
    } catch (e) {
      toast.error(e?.error || e?.message || 'Failed to activate Discovery Pass');
    } finally {
      setActivating(false);
    }
  };

  if (!playlist.is_funded_network) {
    return (
      <GlassCard hover={false} className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-neon-turquoise" />
              <span className="text-sm font-semibold">Funded Network</span>
            </div>
            <p className="text-xs text-muted-foreground">Receives a share of your monthly subscription Artist Distribution Pool</p>
          </div>
          <Switch checked={false} onCheckedChange={handleToggle} />
        </div>
        {limitError && (
          <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-destructive mb-2">{limitError.message}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10" onClick={() => navigate('/pricing')}>
                Upgrade your plan
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    );
  }

  const summary = validation?.summary;
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  const limitErr = errors.find((e) => e.type === 'artist_limit_exceeded');
  const dups = errors.filter((e) => e.type === 'duplicate_network');

  return (
    <GlassCard hover={false} className="p-5 mb-4 border-neon-turquoise/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-neon-turquoise" />
          <span className="text-sm font-semibold">Funded Network</span>
          <NeonBadge color="turquoise">Active</NeonBadge>
        </div>
        <Switch checked={true} onCheckedChange={handleToggle} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Label className="text-xs text-muted-foreground block">Allocation Method</Label>
            <NeonBadge color={allocationTier === 'standard' ? 'purple' : allocationTier === 'advanced' ? 'cyan' : 'magenta'}>
              {ALLOCK_TIER_LABELS[allocationTier]}
            </NeonBadge>
          </div>
          <Select
            value={availableMethods.includes(playlist.artist_allocation_method) ? (playlist.artist_allocation_method || 'automatic') : 'automatic'}
            onValueChange={(v) => onUpdate({ artist_allocation_method: v })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMethods.map((m) => (
                <SelectItem key={m} value={m}>{ALLOCATION_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canCustomize && (
            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Equal split only on your plan.{' '}
              <button className="text-primary underline" onClick={() => navigate('/pricing')}>Upgrade</button>{' '}for custom allocation.
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Funding % (optional)</Label>
          <Input
            type="number" min="0" max="100" step="1" placeholder="Auto"
            value={playlist.network_funding_percentage ?? ''}
            onChange={(e) => onUpdate({ network_funding_percentage: e.target.value ? parseFloat(e.target.value) : null })}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {playlist.artist_allocation_method === 'custom' && canCustomize && (
        <CustomAllocationEditor playlist={playlist} onUpdate={onUpdate} />
      )}
      {summary && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
          <span>{summary.total_unique_artists} / {summary.effective_limit} artists</span>
          <span>{summary.rotations_used} / {summary.max_monthly_rotations} rotations</span>
          {summary.active_discovery_passes > 0 && (
            <span className="text-neon-turquoise">{summary.active_discovery_passes} active pass{summary.active_discovery_passes > 1 ? 'es' : ''}</span>
          )}
        </div>
      )}
      {limitErr && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">{limitErr.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10" onClick={handleActivatePass} disabled={activating}>
                  {activating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Activate Discovery Pass
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10" onClick={() => navigate('/pricing')}>
                  Upgrade your plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {dups.map((dup, i) => (
        <div key={i} className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{dup.message}</p>
        </div>
      ))}
      {warnings.map((w, i) => (
        <div key={i} className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mb-2">
          <p className="text-xs text-amber-500">{w.message}</p>
        </div>
      ))}
      <PurchaseVsFundingExplainer variant="funding" />
    </GlassCard>
  );
}