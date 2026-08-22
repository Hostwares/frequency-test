import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Unlock, Eye, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const PERMISSION_GROUPS = [
  {
    label: 'Users',
    permissions: [
      { key: 'can_view_users', label: 'View Users', type: 'view' },
      { key: 'can_edit_users', label: 'Edit Users', type: 'edit' },
    ],
  },
  {
    label: 'Artists',
    permissions: [
      { key: 'can_view_artists', label: 'View Artists', type: 'view' },
      { key: 'can_edit_artists', label: 'Edit Artists', type: 'edit' },
    ],
  },
  {
    label: 'Songs',
    permissions: [
      { key: 'can_view_songs', label: 'View Songs', type: 'view' },
      { key: 'can_edit_songs', label: 'Edit Songs', type: 'edit' },
    ],
  },
  {
    label: 'Payments',
    permissions: [
      { key: 'can_view_payments', label: 'View Payments', type: 'view' },
      { key: 'can_edit_payments', label: 'Edit Payments', type: 'edit' },
    ],
  },
  {
    label: 'Subscriptions',
    permissions: [
      { key: 'can_view_subscriptions', label: 'View Subscriptions', type: 'view' },
      { key: 'can_edit_subscriptions', label: 'Edit Subscriptions', type: 'edit' },
    ],
  },
  {
    label: 'Marketplace',
    permissions: [
      { key: 'can_view_marketplace', label: 'View Marketplace', type: 'view' },
      { key: 'can_edit_marketplace', label: 'Edit Marketplace', type: 'edit' },
    ],
  },
  {
    label: 'Events',
    permissions: [
      { key: 'can_view_events', label: 'View Events', type: 'view' },
      { key: 'can_edit_events', label: 'Edit Events', type: 'edit' },
    ],
  },
  {
    label: 'Reports',
    permissions: [
      { key: 'can_view_reports', label: 'View Reports', type: 'view' },
      { key: 'can_export_reports', label: 'Export Reports', type: 'sensitive' },
    ],
  },
  {
    label: 'Sensitive Areas',
    permissions: [
      { key: 'can_view_private_radio_data', label: 'Private Radio Data', type: 'sensitive' },
      { key: 'can_view_legal_takedowns', label: 'Legal / Takedowns', type: 'sensitive' },
      { key: 'can_manage_support_tickets', label: 'Support Tickets', type: 'sensitive' },
      { key: 'can_manage_business_partners', label: 'Business Partners', type: 'sensitive' },
    ],
  },
];

export default function AdminPartnerPermissions({ partner }) {
  const qc = useQueryClient();
  const [permissions, setPermissions] = useState(partner.permissions || {});

  const updatePermission = useMutation({
    mutationFn: (newPermissions) =>
      base44.functions.invoke('manageAdminPartner', {
        action: 'update_permissions',
        partner_id: partner.id,
        permissions: newPermissions,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success('Permissions updated');
    },
    onError: () => toast.error('Failed to update permissions'),
  });

  const toggle = (key, value) => {
    const newPerms = { ...permissions, [key]: value };
    setPermissions(newPerms);
    updatePermission.mutate(newPerms);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5" />
        <span>Toggle permissions — changes are logged and take effect immediately.</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.permissions.map(perm => {
                const isOn = permissions[perm.key] || false;
                const isSensitive = perm.type === 'sensitive' || perm.type === 'edit';
                return (
                  <div key={perm.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {perm.type === 'view' && <Eye className="w-3 h-3 text-neon-cyan" />}
                      {perm.type === 'edit' && <Pencil className="w-3 h-3 text-neon-magenta" />}
                      {perm.type === 'sensitive' && <Lock className="w-3 h-3 text-destructive" />}
                      <span className="text-xs">{perm.label}</span>
                    </div>
                    <Switch checked={isOn} onCheckedChange={(v) => toggle(perm.key, v)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}