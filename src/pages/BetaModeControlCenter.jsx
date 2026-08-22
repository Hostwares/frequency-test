import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Loader2, Lock, FlaskConical } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AccessDenied from '@/components/admin/AccessDenied';
import BetaControlsPanel from '@/components/admin/beta/BetaControlsPanel';
import BetaReadinessChecklist from '@/components/admin/beta/BetaReadinessChecklist';
import BetaDeactivationWizard from '@/components/admin/beta/BetaDeactivationWizard';
import BetaAuditLog from '@/components/admin/beta/BetaAuditLog';

const READINESS_KEYS = [
  'production_payments_active',
  'public_prices_configured',
  'terms_of_service_published',
  'privacy_policy_published',
  'refund_policy_published',
  'artist_agreement_active',
  'storage_tested',
  'streaming_tested',
  'email_notifications_tested',
  'customer_support_active',
  'backups_confirmed',
  'analytics_confirmed',
  'migration_plan_selected',
];

const ROLLBACK_WINDOW_HOURS = 72;

export default function BetaModeControlCenter() {
  const { isMasterAdmin, isAdminPartner, isLoading: permsLoading } = useAdminPermissions();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['beta-configuration'],
    queryFn: async () => {
      const records = await base44.entities.BetaConfiguration.list('-created_date', 1);
      return records?.[0] || null;
    },
  });

  const { data: auditEntries = [] } = useQuery({
    queryKey: ['beta-audit-log'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter({ action_category: 'admin' }, '-created_date', 50);
      return (logs || [])
        .filter((l) =>
          (l.action && l.action.toLowerCase().includes('beta')) ||
          l.entity_type === 'BetaConfiguration'
        )
        .slice(0, 20);
    },
    enabled: !!isMasterAdmin,
  });

  const ensureConfig = async () => {
    if (config) return config;
    const created = await base44.entities.BetaConfiguration.create({
      beta_mode_enabled: false,
      beta_registration_mode: 'invite_only',
      beta_pricing_enabled: true,
      founding_badges_enabled: true,
      beta_discounts_enabled: true,
      beta_feedback_enabled: true,
      beta_banners_enabled: true,
      beta_feature_flags_enabled: true,
      beta_user_limit: 1000,
      deactivation_status: 'active',
      exit_readiness: {},
      deactivation_decisions: {},
    });
    queryClient.setQueryData(['beta-configuration'], created);
    return created;
  };

  const writeAudit = (action, details, severity = 'info', metadata = {}) =>
    base44.entities.AuditLog.create({
      action,
      action_category: 'admin',
      entity_type: 'BetaConfiguration',
      details,
      severity,
      is_security_event: severity === 'critical',
      metadata,
    });

  const userMeta = useMemo(() => ({
    id: user?.id,
    name: user?.full_name || user?.email || 'Master Admin',
  }), [user]);

  const updateMutation = useMutation({
    mutationFn: async ({ patch, actionLabel, auditAction, auditDetails, severity }) => {
      const record = await ensureConfig();
      const previous = { ...record };
      const updated = await base44.entities.BetaConfiguration.update(record.id, {
        ...patch,
        updated_by_user_id: userMeta.id,
        updated_by_name: userMeta.name,
        last_updated_date: new Date().toISOString(),
      });
      await writeAudit(auditAction, auditDetails, severity, { previous_value: previous, new_value: updated });
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['beta-configuration'], data);
      queryClient.invalidateQueries({ queryKey: ['beta-audit-log'] });
      toast.success('Beta configuration updated');
    },
    onError: () => toast.error('Failed to update beta configuration'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (wizard) => {
      const record = await ensureConfig();
      const previous = { ...record };
      const now = new Date();
      const rollbackUntil = new Date(now.getTime() + ROLLBACK_WINDOW_HOURS * 3600 * 1000).toISOString();
      const updated = await base44.entities.BetaConfiguration.update(record.id, {
        beta_mode_enabled: false,
        deactivation_status: 'deactivated',
        deactivation_initiated_date: now.toISOString(),
        deactivation_initiated_by_user_id: userMeta.id,
        deactivation_initiated_by_name: userMeta.name,
        deactivation_reason: wizard.reason,
        deactivation_decisions: {
          end_immediately: wizard.end_immediately,
          scheduled_end: wizard.scheduled_end,
          keep_founding_prices_temporarily: wizard.keep_founding_prices_temporarily,
          move_members_to_public_pricing: wizard.move_members_to_public_pricing,
          preserve_founding_badges: wizard.preserve_founding_badges,
          disable_beta_only_features: wizard.disable_beta_only_features,
          convert_beta_accounts: wizard.convert_beta_accounts,
          send_user_notification: wizard.send_user_notification,
          publish_launch_announcement: wizard.publish_launch_announcement,
        },
        rollback_available_until: rollbackUntil,
        rollback_executed: false,
        updated_by_user_id: userMeta.id,
        updated_by_name: userMeta.name,
        last_updated_date: now.toISOString(),
      });
      await writeAudit(
        'beta_mode_deactivated',
        `Beta Mode deactivated. Reason: ${wizard.reason}. Rollback available until ${rollbackUntil}.`,
        'critical',
        { previous_value: previous, new_value: updated, decisions: wizard }
      );
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['beta-configuration'], data);
      queryClient.invalidateQueries({ queryKey: ['beta-audit-log'] });
      toast.success('Beta Mode deactivated. 72-hour rollback window is open.');
    },
    onError: () => toast.error('Failed to deactivate Beta Mode'),
  });

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const record = await ensureConfig();
      if (!record.rollback_available_until || new Date(record.rollback_available_until) < new Date()) {
        throw new Error('Rollback window expired');
      }
      const previous = { ...record };
      const updated = await base44.entities.BetaConfiguration.update(record.id, {
        beta_mode_enabled: true,
        deactivation_status: 'rolled_back',
        rollback_executed: true,
        rollback_executed_date: new Date().toISOString(),
        updated_by_user_id: userMeta.id,
        updated_by_name: userMeta.name,
        last_updated_date: new Date().toISOString(),
      });
      await writeAudit(
        'beta_mode_rolled_back',
        'Beta Mode restored during the 72-hour rollback window. No charges duplicated; member plans unchanged.',
        'critical',
        { previous_value: previous, new_value: updated }
      );
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['beta-configuration'], data);
      queryClient.invalidateQueries({ queryKey: ['beta-audit-log'] });
      toast.success('Beta Mode restored.');
    },
    onError: () => toast.error('Rollback failed or window expired.'),
  });

  const overrideMutation = useMutation({
    mutationFn: async (reason) => {
      const record = await ensureConfig();
      const previous = { ...record };
      const updated = await base44.entities.BetaConfiguration.update(record.id, {
        readiness_override_reason: reason,
        readiness_overridden_by_user_id: userMeta.id,
        readiness_overridden_by_name: userMeta.name,
        readiness_override_date: new Date().toISOString(),
        updated_by_user_id: userMeta.id,
        updated_by_name: userMeta.name,
        last_updated_date: new Date().toISOString(),
      });
      await writeAudit(
        'beta_readiness_override',
        `Master Admin overrode incomplete exit-readiness checklist. Reason: ${reason}`,
        'warning',
        { previous_value: previous, new_value: updated }
      );
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['beta-configuration'], data);
      queryClient.invalidateQueries({ queryKey: ['beta-audit-log'] });
      toast.success('Override recorded in audit log.');
    },
    onError: () => toast.error('Failed to record override'),
  });

  if (permsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isMasterAdmin && !isAdminPartner) {
    return <AccessDenied message="The Beta Mode Control Center is restricted to administrators." icon={Lock} />;
  }

  // Admin Partners may view but cannot change controls unless they are a Master Admin.
  if (isAdminPartner && !isMasterAdmin) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-6 h-6 text-neon-magenta" />
            <h1 className="text-2xl font-display font-bold">Beta Mode Control Center</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Read-only view · only the Master Admin can change beta controls.</p>
          {config && (
            <div className="space-y-2 text-sm">
              <p>Beta Mode: <strong>{config.beta_mode_enabled ? 'Enabled' : 'Disabled'}</strong></p>
              <p>Registration: <strong>{config.beta_registration_mode}</strong></p>
              <p>User Limit: <strong>{config.beta_user_limit}</strong></p>
              <p>Status: <strong>{config.deactivation_status}</strong></p>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
        <GlassCard hover={false} className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">No beta configuration exists yet.</p>
          <button
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            onClick={() => ensureConfig().then(() => queryClient.invalidateQueries({ queryKey: ['beta-configuration'] }))}
          >
            Initialize Beta Configuration
          </button>
        </GlassCard>
      </div>
    );
  }

  const handleToggle = (key, value) =>
    updateMutation.mutate({ patch: { [key]: value }, actionLabel: key, auditAction: `beta_toggle_${key}`, auditDetails: `Toggled ${key} to ${value}`, severity: 'info' });

  const handleChange = (key, value) =>
    updateMutation.mutate({ patch: { [key]: value }, actionLabel: key, auditAction: `beta_change_${key}`, auditDetails: `Set ${key} to ${value}`, severity: 'info' });

  const handleToggleCheck = (key, value) => {
    const newReadiness = { ...(config.exit_readiness || {}), [key]: value };
    updateMutation.mutate({
      patch: { exit_readiness: newReadiness },
      actionLabel: 'readiness',
      auditAction: 'beta_readiness_check_toggled',
      auditDetails: `Exit readiness check "${key}" set to ${value}`,
      severity: 'info',
    });
  };

  const saving = updateMutation.isPending;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-6 h-6 text-neon-magenta" />
          <h1 className="text-2xl font-display font-bold">Beta Mode Control Center</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The Mainstream Frequency™ — manage beta subscriptions, founding members, and the public transition. Master Admin only.
        </p>
      </div>

      <div className="space-y-6">
        <BetaControlsPanel
          config={config}
          onToggle={handleToggle}
          onChange={handleChange}
          disabled={saving}
        />

        <BetaReadinessChecklist
          config={config}
          onToggleCheck={handleToggleCheck}
          onOverride={(reason) => overrideMutation.mutate(reason)}
          disabled={saving}
        />

        <BetaDeactivationWizard
          config={config}
          onDeactivate={(wizard) => deactivateMutation.mutate(wizard)}
          onRollback={() => rollbackMutation.mutate()}
          disabled={saving || deactivateMutation.isPending || rollbackMutation.isPending}
        />

        <BetaAuditLog entries={auditEntries} />
      </div>
    </div>
  );
}