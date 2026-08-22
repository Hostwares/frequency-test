import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Crown, UserPlus, Trash2, Shield, Percent, Star, AlertCircle } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminPartnerPermissions from '@/components/admin/AdminPartnerPermissions';

const PERMISSION_LABELS = {
  can_view_users: 'View Users',
  can_edit_users: 'Edit Users',
  can_view_artists: 'View Artists',
  can_edit_artists: 'Edit Artists',
  can_view_songs: 'View Songs',
  can_edit_songs: 'Edit Songs',
  can_view_payments: 'View Payments',
  can_edit_payments: 'Edit Payments',
  can_view_subscriptions: 'View Subscriptions',
  can_edit_subscriptions: 'Edit Subscriptions',
  can_view_marketplace: 'View Marketplace',
  can_edit_marketplace: 'Edit Marketplace',
  can_view_events: 'View Events',
  can_edit_events: 'Edit Events',
  can_view_reports: 'View Reports',
  can_export_reports: 'Export Reports',
  can_view_private_radio_data: 'Private Radio Data',
  can_view_legal_takedowns: 'Legal / Takedowns',
  can_manage_support_tickets: 'Support Tickets',
  can_manage_business_partners: 'Business Partners',
};

export default function AdminPartnerManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPartner, setNewPartner] = useState({ email: '', partner_name: '', revenue_share_percentage: 0 });
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [error, setError] = useState('');

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => base44.entities.AdminPartner.filter({}, '-created_date'),
  });

  const activePartners = partners.filter(p => p.is_active);

  const createPartner = useMutation({
    mutationFn: (payload) =>
      base44.functions.invoke('manageAdminPartner', payload),
    onSuccess: () => {
      setShowCreate(false);
      setNewPartner({ email: '', partner_name: '', revenue_share_percentage: 0 });
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-partners'] });
    },
    onError: (e) => setError(e.response?.data?.error || e.message || 'Failed to create partner'),
  });

  const removePartner = useMutation({
    mutationFn: (partner_id) =>
      base44.functions.invoke('manageAdminPartner', { action: 'remove', partner_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });

  const updateRevenueShare = useMutation({
    mutationFn: ({ partner_id, revenue_share_percentage }) =>
      base44.functions.invoke('manageAdminPartner', { action: 'update_revenue_share', partner_id, revenue_share_percentage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });

  if (user?.role !== 'master_admin' && user?.role !== 'admin') {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <Crown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Only the Master Admin can manage Admin Partners.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-neon-magenta" />
          <h2 className="font-display font-semibold text-sm">Admin Partners</h2>
          <NeonBadge color="magenta">{activePartners.length} / 5</NeonBadge>
        </div>
        {activePartners.length < 5 && (
          <Button size="sm" onClick={() => setShowCreate(s => !s)}
            className="h-8 gap-1.5 bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 hover:bg-neon-magenta/25">
            <UserPlus className="w-3.5 h-3.5" /> Add Partner
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <GlassCard hover={false} className="p-5 border-neon-magenta/20">
          <h3 className="font-display font-semibold text-sm mb-4">Create Admin Partner</h3>
          {error && (
            <div className="flex items-center gap-2 mb-3 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </div>
          )}
          <div className="space-y-3">
            <Input placeholder="Partner name" value={newPartner.partner_name}
              onChange={e => setNewPartner(p => ({ ...p, partner_name: e.target.value }))}
              className="bg-secondary/20 text-sm" />
            <Input placeholder="Email address" type="email" value={newPartner.email}
              onChange={e => setNewPartner(p => ({ ...p, email: e.target.value }))}
              className="bg-secondary/20 text-sm" />
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <Input type="number" min="0" max="100" step="0.5"
                placeholder="Revenue share %"
                value={newPartner.revenue_share_percentage}
                onChange={e => setNewPartner(p => ({ ...p, revenue_share_percentage: parseFloat(e.target.value) || 0 }))}
                className="bg-secondary/20 text-sm w-32" />
              <span className="text-xs text-muted-foreground">Ownership / revenue share percentage</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="h-8">Cancel</Button>
              <Button size="sm"
                disabled={!newPartner.email || !newPartner.partner_name || createPartner.isPending}
                onClick={() => createPartner.mutate({ action: 'create', ...newPartner })}
                className="h-8 bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30 hover:bg-neon-magenta/30">
                {createPartner.isPending ? 'Creating...' : 'Create & Invite'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              An invitation email will be sent. The partner will have view-only access by default.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Partner list */}
      {isLoading ? (
        <GlassCard hover={false} className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </GlassCard>
      ) : activePartners.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No Admin Partners yet. Create up to 5 partner accounts.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {activePartners.map(partner => (
            <GlassCard key={partner.id} hover={false} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-neon-magenta/15 border border-neon-magenta/30 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-neon-magenta" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{partner.partner_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{partner.partner_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neon-turquoise/10 border border-neon-turquoise/20">
                    <Star className="w-3 h-3 text-neon-turquoise" />
                    <span className="text-xs font-bold text-neon-turquoise">{partner.revenue_share_percentage}%</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}>
                    {expandedPartner === partner.id ? 'Close' : 'Permissions'}
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${partner.partner_name} as Admin Partner?`)) {
                        removePartner.mutate(partner.id);
                      }
                    }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick permission summary */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(PERMISSION_LABELS).filter(([key]) => partner.permissions?.[key]).map(([key, label]) => (
                  <NeonBadge key={key} color={key.includes('edit') || key.includes('export') || key.includes('manage') || key.includes('private') || key.includes('legal') ? 'magenta' : 'cyan'}>
                    {label}
                  </NeonBadge>
                ))}
              </div>

              {/* Expanded permissions panel */}
              {expandedPartner === partner.id && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <AdminPartnerPermissions partner={partner} />
                  {/* Revenue share editor */}
                  <div className="mt-4 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-neon-turquoise" />
                    <span className="text-xs text-muted-foreground">Revenue Share:</span>
                    <Input type="number" min="0" max="100" step="0.5"
                      defaultValue={partner.revenue_share_percentage}
                      className="bg-secondary/20 text-sm w-24 h-7"
                      onBlur={e => {
                        const val = parseFloat(e.target.value) || 0;
                        if (val !== partner.revenue_share_percentage) {
                          updateRevenueShare.mutate({ partner_id: partner.id, revenue_share_percentage: val });
                        }
                      }} />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}