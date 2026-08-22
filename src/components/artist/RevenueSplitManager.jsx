import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Copy, Archive, Trash2, Power, PowerOff, Pencil,
  Users, DollarSign, CheckCircle2, Layers, History, Eye,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import RevenueSplitEditor from '@/components/artist/RevenueSplitEditor';
import RevenueSplitAnalytics from '@/components/artist/RevenueSplitAnalytics';
import BatchPayoutProcessor from '@/components/artist/BatchPayoutProcessor';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  SPLIT_TYPES, TRANSPARENCY_MODES, getSplitTypeLabel, calculateTotalPercentage, getPercentageStatus,
} from '@/lib/splitConstants';

const STATUS_BADGE = {
  draft: { color: 'purple', label: 'Draft' },
  pending_approval: { color: 'magenta', label: 'Pending Approval' },
  active: { color: 'turquoise', label: 'Active' },
  archived: { color: 'blue', label: 'Archived' },
};

export default function RevenueSplitManager({ artistProfile, user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState(null);

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['revenue-splits', artistProfile?.id],
    queryFn: () => base44.entities.RevenueSplit.filter({ artist_profile_id: artistProfile?.id }, '-created_date', 100),
    enabled: !!artistProfile?.id,
  });

  const { data: earnings = [] } = useQuery({
    queryKey: ['collaborator-earnings-summary', artistProfile?.id],
    queryFn: () => base44.entities.CollaboratorEarning.filter({ artist_profile_id: artistProfile?.id }, '-created_date', 500),
    enabled: !!artistProfile?.id,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['artist-releases', artistProfile?.id],
    queryFn: () => base44.entities.Release.filter({ artist_profile_id: artistProfile?.id }, '-created_date', 50),
    enabled: !!artistProfile?.id,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs-split', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }, '-created_date', 100),
    enabled: !!artistProfile?.id,
  });

  const activeSplits = splits.filter(s => s.status === 'active');
  const totalCollaborators = splits.reduce((sum, s) => sum + (s.collaborators?.length || 0), 0);
  const totalDistributed = earnings.reduce((sum, e) => sum + (e.collaborator_amount || 0), 0);
  const pendingPayments = earnings.filter(e => e.payment_status === 'pending').length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['revenue-splits', artistProfile?.id] });
    queryClient.invalidateQueries({ queryKey: ['collaborator-earnings-summary', artistProfile?.id] });
    queryClient.invalidateQueries({ queryKey: ['revenue-splits-analytics', artistProfile?.id] });
  };

  const logAudit = async (split, action, actionCategory, details) => {
    try {
      await base44.entities.SplitAuditLog.create({
        split_id: split.id,
        split_name: split.split_name,
        artist_profile_id: artistProfile.id,
        user_id: user.id,
        user_name: user.full_name || user.email,
        action,
        action_category: actionCategory,
        details,
      });
    } catch (e) {
      console.warn('Failed to log split audit', e);
    }
  };

  const handleSave = async (payload, isEditing) => {
    try {
      if (isEditing) {
        await base44.entities.RevenueSplit.update(editingSplit.id, {
          ...payload,
          artist_profile_id: artistProfile.id,
          artist_user_id: user.id,
        });
        await logAudit({ ...editingSplit, ...payload }, 'updated', 'split_management', 'Split updated');
        toast({ title: 'Revenue Split updated' });
      } else {
        const created = await base44.entities.RevenueSplit.create({
          ...payload,
          artist_profile_id: artistProfile.id,
          artist_user_id: user.id,
        });
        await logAudit(created, 'created', 'split_management', 'Split created');
        toast({ title: 'Revenue Split created' });
      }
      invalidate();
      setEditorOpen(false);
      setEditingSplit(null);
    } catch (e) {
      toast({ title: 'Failed to save split', description: e?.message, variant: 'destructive' });
    }
  };

  const handleAction = async (split, action) => {
    const actions = {
      activate: { status: 'active', label: 'activated', audit: 'activated' },
      deactivate: { status: 'draft', label: 'deactivated', audit: 'deactivated' },
      archive: { status: 'archived', label: 'archived', audit: 'archived' },
    };
    const cfg = actions[action];
    if (!cfg) return;
    if (action === 'activate') {
      const total = calculateTotalPercentage(split.collaborators);
      if (total !== 100) {
        toast({ title: 'Cannot activate', description: 'Total must equal exactly 100%', variant: 'destructive' });
        return;
      }
    }
    try {
      await base44.entities.RevenueSplit.update(split.id, { status: cfg.status });
      await logAudit(split, cfg.audit, 'split_management', `Split ${cfg.label}`);
      toast({ title: `Split ${cfg.label}` });
      invalidate();
    } catch (e) {
      toast({ title: 'Action failed', description: e?.message, variant: 'destructive' });
    }
  };

  const handleDuplicate = async (split) => {
    try {
      const { id, created_date, updated_date, ...rest } = split;
      await base44.entities.RevenueSplit.create({
        ...rest,
        split_name: `${split.split_name} (Copy)`,
        status: 'draft',
        artist_profile_id: artistProfile.id,
        artist_user_id: user.id,
      });
      await logAudit(split, 'duplicated', 'split_management', 'Split duplicated');
      toast({ title: 'Split duplicated' });
      invalidate();
    } catch (e) {
      toast({ title: 'Duplicate failed', description: e?.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (split) => {
    if (!confirm(`Delete "${split.split_name}"? This action is logged in the audit trail.`)) return;
    try {
      await base44.entities.RevenueSplit.delete(split.id);
      await logAudit(split, 'deleted', 'split_management', 'Split deleted');
      toast({ title: 'Split deleted' });
      invalidate();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  if (!artistProfile) return null;

  const updateTransparency = async (field, value) => {
    try {
      await base44.entities.ArtistProfile.update(artistProfile.id, { [field]: value });
      queryClient.invalidateQueries({ queryKey: ['artist', artistProfile.id] });
      queryClient.invalidateQueries({ queryKey: ['transparency-splits', artistProfile.id] });
      toast({ title: 'Transparency setting updated' });
    } catch (e) {
      toast({ title: 'Update failed', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-neon-purple" /> Revenue Splits™
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically distribute earnings with collaborators. No payment is sent without an approved split.
          </p>
        </div>
        <Button className="bg-gradient-neon text-white" onClick={() => { setEditingSplit(null); setEditorOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Create Revenue Split
        </Button>
      </div>

      {/* Fan Allocation Transparency Setting */}
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-neon-cyan" /> Fan Allocation Transparency™
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show fans that their support funds your entire creative team.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Switch
              checked={artistProfile.revenue_split_transparency_enabled || false}
              onCheckedChange={(v) => updateTransparency('revenue_split_transparency_enabled', v)}
            />
            {artistProfile.revenue_split_transparency_enabled && (
              <Select
                value={artistProfile.revenue_split_transparency_mode || 'summary'}
                onValueChange={(v) => updateTransparency('revenue_split_transparency_mode', v)}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPARENCY_MODES.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
            <span className="text-xs text-muted-foreground">Active Splits</span>
          </div>
          <p className="text-xl font-bold font-display">{activeSplits.length}</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-muted-foreground">Collaborators</span>
          </div>
          <p className="text-xl font-bold font-display">{totalCollaborators}</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-neon-purple" />
            <span className="text-xs text-muted-foreground">Total Distributed</span>
          </div>
          <p className="text-xl font-bold font-display">${totalDistributed.toFixed(2)}</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-neon-magenta" />
            <span className="text-xs text-muted-foreground">Pending Payments</span>
          </div>
          <p className="text-xl font-bold font-display">{pendingPayments}</p>
        </GlassCard>
      </div>

      {/* Batch Payout Processor */}
      <BatchPayoutProcessor artistProfile={artistProfile} />

      {/* Split List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading splits...</div>
        )}
        {!isLoading && splits.length === 0 && (
          <GlassCard hover={false} className="p-8 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No Revenue Splits yet. Create your first split to start distributing earnings with collaborators.</p>
            <Button className="bg-gradient-neon text-white" onClick={() => { setEditingSplit(null); setEditorOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Create Revenue Split
            </Button>
          </GlassCard>
        )}
        {splits.map((split) => {
          const total = calculateTotalPercentage(split.collaborators);
          const pctStatus = getPercentageStatus(total);
          const badge = STATUS_BADGE[split.status];
          return (
            <GlassCard key={split.id} hover={false} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-sm truncate">{split.split_name}</h4>
                    <NeonBadge color={badge.color}>{badge.label}</NeonBadge>
                    <NeonBadge color="blue">{getSplitTypeLabel(split.split_type)}</NeonBadge>
                    {split.assignment_type !== 'entire_account' && (
                      <NeonBadge color="purple">
                        {split.assignment_type === 'song' ? `Song: ${split.song_name || '—'}` :
                         split.assignment_type === 'ep' ? `EP: ${split.release_name || '—'}` :
                         split.assignment_type === 'album' ? `Album: ${split.release_name || '—'}` :
                         `Single: ${split.release_name || '—'}`}
                      </NeonBadge>
                    )}
                  </div>
                  {split.description && (
                    <p className="text-xs text-muted-foreground mb-2">{split.description}</p>
                  )}
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <span className="text-muted-foreground">
                      {split.collaborators?.length || 0} collaborator{(split.collaborators?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className={`font-medium ${
                      pctStatus === 'green' ? 'text-neon-turquoise' : pctStatus === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      Total: {total.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit"
                    onClick={() => { setEditingSplit(split); setEditorOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicate"
                    onClick={() => handleDuplicate(split)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {split.status === 'active' ? (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Deactivate"
                      onClick={() => handleAction(split, 'deactivate')}>
                      <PowerOff className="w-3.5 h-3.5 text-yellow-400" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Activate"
                      disabled={total !== 100}
                      onClick={() => handleAction(split, 'activate')}>
                      <Power className="w-3.5 h-3.5 text-neon-turquoise" />
                    </Button>
                  )}
                  {split.status !== 'archived' && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Archive"
                      onClick={() => handleAction(split, 'archive')}>
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Delete"
                    onClick={() => handleDelete(split)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Analytics */}
      <RevenueSplitAnalytics artistProfileId={artistProfile.id} />

      <RevenueSplitEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingSplit(null); }}
        onSave={handleSave}
        artistProfile={artistProfile}
        releases={releases}
        songs={songs}
        split={editingSplit}
      />
    </div>
  );
}