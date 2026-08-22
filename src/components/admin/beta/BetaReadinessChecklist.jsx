import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassCard from '@/components/shared/GlassCard';
import { AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';

const CHECKS = [
  { key: 'production_payments_active', label: 'Production payments active' },
  { key: 'public_prices_configured', label: 'Public prices configured' },
  { key: 'terms_of_service_published', label: 'Terms of Service published' },
  { key: 'privacy_policy_published', label: 'Privacy Policy published' },
  { key: 'refund_policy_published', label: 'Refund Policy published' },
  { key: 'artist_agreement_active', label: 'Artist agreement active' },
  { key: 'storage_tested', label: 'Storage tested' },
  { key: 'streaming_tested', label: 'Streaming tested' },
  { key: 'email_notifications_tested', label: 'Email notifications tested' },
  { key: 'customer_support_active', label: 'Customer-support system active' },
  { key: 'backups_confirmed', label: 'Backups confirmed' },
  { key: 'analytics_confirmed', label: 'Analytics confirmed' },
  { key: 'migration_plan_selected', label: 'Beta-user migration plan selected' },
];

export default function BetaReadinessChecklist({ config, onToggleCheck, onOverride, disabled }) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [reason, setReason] = useState('');

  const readiness = config.exit_readiness || {};
  const completed = CHECKS.filter((c) => readiness[c.key]).length;
  const allComplete = completed === CHECKS.length;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-turquoise/10 border border-neon-turquoise/20">
            <ShieldCheck className="w-5 h-5 text-neon-turquoise" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Beta Exit Readiness Checklist</h2>
            <p className="text-xs text-muted-foreground">{completed} of {CHECKS.length} complete · required before deactivation</p>
          </div>
        </div>
        {allComplete ? (
          <span className="text-xs font-medium text-neon-turquoise flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Ready
          </span>
        ) : (
          <span className="text-xs font-medium text-yellow-500 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Incomplete
          </span>
        )}
      </div>

      <div className="space-y-2 mb-5">
        {CHECKS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
            <span className={`text-sm ${readiness[key] ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </span>
            <Switch
              checked={!!readiness[key]}
              onCheckedChange={(v) => onToggleCheck(key, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {!allComplete && !overrideMode && (
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              The checklist is incomplete. Beta Mode cannot be deactivated until all items are complete, unless the Master Admin provides a written override reason (saved to the audit log).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOverrideMode(true)} disabled={disabled}>
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Override with written reason
          </Button>
        </div>
      )}

      {overrideMode && !allComplete && (
        <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
          <Label className="text-xs text-muted-foreground">Required override reason (recorded in audit log)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you are overriding the incomplete readiness checklist..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (reason.trim().length < 10) {
                  toast.error('Please provide a meaningful override reason (at least 10 characters).');
                  return;
                }
                onOverride(reason.trim());
                setOverrideMode(false);
                setReason('');
              }}
              disabled={disabled}
            >
              Submit Override
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setOverrideMode(false); setReason(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}