import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import { Power, AlertOctagon, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';

const DECISIONS = [
  { key: 'end_immediately', label: 'End beta immediately' },
  { key: 'scheduled_end', label: 'Schedule beta end' },
  { key: 'keep_founding_prices_temporarily', label: 'Keep founding prices temporarily' },
  { key: 'move_members_to_public_pricing', label: 'Move members to public pricing' },
  { key: 'preserve_founding_badges', label: 'Preserve founding badges' },
  { key: 'disable_beta_only_features', label: 'Disable beta-only features' },
  { key: 'convert_beta_accounts', label: 'Convert beta accounts to standard accounts' },
  { key: 'send_user_notification', label: 'Send user notification' },
  { key: 'publish_launch_announcement', label: 'Publish launch announcement' },
];

export default function BetaDeactivationWizard({ config, onDeactivate, onRollback, disabled }) {
  const [open, setOpen] = useState(false);
  const [decisions, setDecisions] = useState({
    end_immediately: true,
    scheduled_end: false,
    keep_founding_prices_temporarily: true,
    move_members_to_public_pricing: true,
    preserve_founding_badges: true,
    disable_beta_only_features: true,
    convert_beta_accounts: true,
    send_user_notification: true,
    publish_launch_announcement: true,
  });
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState(1);

  const isDeactivated = config.deactivation_status === 'deactivated';
  const rollbackAvailable = isDeactivated && config.rollback_available_until && new Date(config.rollback_available_until) > new Date();
  const rollbackExpired = isDeactivated && !rollbackAvailable;

  const reset = () => {
    setStep(1);
    setConfirmText('');
    setReason('');
    setOpen(false);
  };

  const canSubmit = confirmText === 'END BETA MODE' && reason.trim().length >= 10;

  const handleConfirm = () => {
    if (!canSubmit) {
      toast.error('Type "END BETA MODE" exactly and provide a reason.');
      return;
    }
    onDeactivate({ ...decisions, reason: reason.trim() });
    reset();
  };

  // Rollback view
  if (isDeactivated) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
            <History className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Beta Deactivated — Rollback Window</h2>
            <p className="text-xs text-muted-foreground">
              {rollbackAvailable
                ? `Restore Beta Mode until ${new Date(config.rollback_available_until).toLocaleString()}`
                : 'Rollback window has expired (72 hours passed).'}
            </p>
          </div>
        </div>

        {config.deactivation_reason && (
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/30 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Deactivation reason</p>
            <p className="text-sm">{config.deactivation_reason}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Initiated by {config.deactivation_initiated_by_name || 'Master Admin'} on{' '}
              {config.deactivation_initiated_date ? new Date(config.deactivation_initiated_date).toLocaleString() : '—'}
            </p>
          </div>
        )}

        {rollbackAvailable ? (
          <div className="flex items-center gap-3">
            <Button onClick={onRollback} disabled={disabled}>
              <RotateCcw className="w-4 h-4 mr-2" /> Restore Beta Mode
            </Button>
            <p className="text-xs text-muted-foreground">
              Rollback restores beta settings without duplicating charges or altering member plans.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Beta deactivation is now permanent. Contact Base44 support if a critical issue requires further action.
          </p>
        )}
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
              <Power className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base">Deactivate Beta Mode</h2>
              <p className="text-xs text-muted-foreground">Opens a guided transition wizard — does not turn off immediately</p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => setOpen(true)} disabled={disabled || !config.beta_mode_enabled}>
            <Power className="w-4 h-4 mr-2" /> Begin Deactivation
          </Button>
        </div>
        {!config.beta_mode_enabled && (
          <p className="text-xs text-muted-foreground">Beta Mode is currently disabled.</p>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-destructive" />
              Beta Mode Deactivation Wizard
            </DialogTitle>
            <DialogDescription>
              Step {step} of 3 — configure how the transition from beta to public mode will be handled.
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Transition Decisions</Label>
              {DECISIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={decisions[key]}
                    onCheckedChange={(v) => setDecisions((d) => ({ ...d, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Reason for deactivation</Label>
                <p className="text-xs text-muted-foreground mb-2">Recorded in the audit log.</p>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. All exit-readiness checks passed; transitioning to public launch."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <p className="text-sm font-medium mb-2">Final confirmation required</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Type <span className="font-mono font-bold text-foreground">END BETA MODE</span> below to confirm. This will begin the transition and open a 72-hour rollback window.
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="END BETA MODE"
                  className="font-mono"
                />
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Summary</p>
                <p className="text-xs">
                  Reason: {reason || '—'}<br />
                  Decisions: {Object.entries(decisions).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ') || 'none'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={reset}>Cancel</Button>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button variant="destructive" onClick={handleConfirm} disabled={!canSubmit}>
                <Power className="w-4 h-4 mr-2" /> End Beta Mode
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}