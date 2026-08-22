import React from 'react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';

const SEVERITY_COLOR = {
  info: 'cyan',
  warning: 'magenta',
  critical: 'purple',
};

export default function BetaAuditLog({ entries = [] }) {
  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
          <History className="w-5 h-5 text-neon-cyan" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base">Beta Audit Log</h2>
          <p className="text-xs text-muted-foreground">Recent beta mode actions and decisions</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No beta actions logged yet.</p>
      ) : (
        <ScrollArea className="h-72 pr-3">
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <span className="text-sm font-medium">{entry.action}</span>
                  <NeonBadge color={SEVERITY_COLOR[entry.severity] || 'cyan'}>
                    {entry.severity || 'info'}
                  </NeonBadge>
                </div>
                {entry.details && <p className="text-xs text-muted-foreground">{entry.details}</p>}
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {entry.user_name || 'System'} · {entry.created_date ? new Date(entry.created_date).toLocaleString() : '—'}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </GlassCard>
  );
}