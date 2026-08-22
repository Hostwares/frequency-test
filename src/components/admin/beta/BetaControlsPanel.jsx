import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import { FlaskConical, CalendarDays, Users, DollarSign } from 'lucide-react';

const TOGGLES = [
  { key: 'beta_pricing_enabled', label: 'Beta Pricing', desc: 'Apply discounted beta pricing at checkout' },
  { key: 'founding_badges_enabled', label: 'Founding Badges', desc: 'Display founding member badges' },
  { key: 'beta_discounts_enabled', label: 'Beta Discounts', desc: 'Enable beta discount codes' },
  { key: 'beta_feedback_enabled', label: 'Beta Feedback', desc: 'User feedback and bug-report tools' },
  { key: 'beta_banners_enabled', label: 'Beta Banners', desc: 'Platform-wide beta notice banners' },
  { key: 'beta_feature_flags_enabled', label: 'Beta Feature Flags', desc: 'Beta-only feature toggles' },
];

const DATES = [
  { key: 'beta_transition_date', label: 'Beta Transition Date' },
  { key: 'public_launch_date', label: 'Public Launch Date' },
  { key: 'public_pricing_effective_date', label: 'Public Pricing Effective Date' },
];

function toInputValue(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

export default function BetaControlsPanel({ config, onToggle, onChange, disabled }) {
  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
          <FlaskConical className="w-5 h-5 text-neon-purple" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base">Beta Mode Controls</h2>
          <p className="text-xs text-muted-foreground">Master Admin only · all changes are audit-logged</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div>
            <p className="text-sm font-medium">Beta Mode Enabled</p>
            <p className="text-xs text-muted-foreground">Master switch for the entire beta period</p>
          </div>
          <Switch
            checked={config.beta_mode_enabled}
            onCheckedChange={(v) => onToggle('beta_mode_enabled', v)}
            disabled={disabled}
          />
        </div>

        <div className="p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-neon-purple" />
            <p className="text-sm font-medium">Beta Flat Subscription Pricing</p>
          </div>
          <p className="text-xs text-muted-foreground">
            While beta mode is active, all fan subscriptions are charged a flat{' '}
            <strong className="text-foreground">$4.99/month</strong> (or $49.90/year) regardless of tier.
            Revenue splits still apply — <strong className="text-foreground">95% to artists</strong> (via playlist allocation) and{' '}
            <strong className="text-foreground">5% to operations</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Beta Start Date</Label>
            <Input
              type="datetime-local"
              value={toInputValue(config.beta_start_date)}
              onChange={(e) => onChange('beta_start_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Beta End Date</Label>
            <Input
              type="datetime-local"
              value={toInputValue(config.beta_planned_end_date)}
              onChange={(e) => onChange('beta_planned_end_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Beta Registration Mode</Label>
            <Select
              value={config.beta_registration_mode}
              onValueChange={(v) => onChange('beta_registration_mode', v)}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open Registration</SelectItem>
                <SelectItem value="invite_only">Invite-Only</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Beta User Limit
            </Label>
            <Input
              type="number"
              min={1}
              value={config.beta_user_limit ?? 1000}
              onChange={(e) => onChange('beta_user_limit', Number(e.target.value))}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {TOGGLES.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
            <div className="pr-3">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch
              checked={config[key]}
              onCheckedChange={(v) => onToggle(key, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-neon-cyan" />
          <h3 className="text-sm font-semibold">Timeline</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DATES.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                type="datetime-local"
                value={toInputValue(config[key])}
                onChange={(e) => onChange(key, e.target.value ? new Date(e.target.value).toISOString() : null)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}