import React from 'react';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';

const configs = {
  verified: {
    icon: ShieldCheck,
    label: 'Verified Partner',
    className: 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan',
    iconClass: 'text-neon-cyan',
  },
  under_review: {
    icon: Clock,
    label: 'Under Review',
    className: 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue',
    iconClass: 'text-neon-blue',
  },
  pending: {
    icon: Clock,
    label: 'Verification Pending',
    className: 'bg-secondary/60 border-border/40 text-muted-foreground',
    iconClass: 'text-muted-foreground',
  },
  rejected: {
    icon: XCircle,
    label: 'Not Verified',
    className: 'bg-destructive/10 border-destructive/20 text-destructive/70',
    iconClass: 'text-destructive/70',
  },
};

/**
 * Displays a Verified Partner badge based on the partner's verification status.
 * `size` = 'sm' | 'md' | 'lg'
 * Only shows the verified state prominently; other states show a subtle pill.
 */
export default function VerifiedPartnerBadge({ partner, size = 'md', showAllStates = false }) {
  if (!partner) return null;

  const status = partner.is_verified ? 'verified' : (partner.verification_status || 'pending');

  // By default only render for verified partners (or if showAllStates is true)
  if (!showAllStates && status !== 'verified') return null;

  const cfg = configs[status] || configs.pending;
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${sizeClasses} ${cfg.className}`}>
      <Icon className={`${iconSizeClasses} ${cfg.iconClass} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}