import React, { useMemo } from 'react';
import { DollarSign, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { getSourceLabel } from '@/lib/splitConstants';

const STATUS_STYLES = {
  pending: 'yellow',
  processing: 'cyan',
  paid: 'turquoise',
  failed: 'magenta',
};

const SOURCE_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#22c55e', '#f97316', '#64748b'];

function SourceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">{d?.name}</p>
      <p className="text-muted-foreground">${d?.value?.toFixed(2)}</p>
    </div>
  );
}

export default function CollaboratorEarningsHistory({ earnings }) {
  const bySource = useMemo(() => {
    const map = {};
    earnings.forEach((e) => {
      const k = e.revenue_source || 'other';
      map[k] = (map[k] || 0) + (e.collaborator_amount || 0);
    });
    return Object.entries(map)
      .map(([k, v]) => ({ name: getSourceLabel(k), value: v }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [earnings]);

  const total = earnings.reduce((s, e) => s + (e.collaborator_amount || 0), 0);

  if (earnings.length === 0) {
    return (
      <GlassCard hover={false} className="p-8 text-center">
        <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No earnings recorded yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Earnings appear here once revenue is distributed from your assigned splits.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* By source */}
      {bySource.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-display font-semibold text-sm">Earnings by Revenue Source</h3>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200} className="md:!w-1/2">
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {bySource.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<SourceTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 w-full">
              {bySource.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                  </div>
                  <span className="font-semibold">${s.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* History table */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm">Earnings History</h3>
          <NeonBadge color="purple">{earnings.length} entries · ${total.toFixed(2)}</NeonBadge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40 text-left">
                <th className="py-2 pr-3 font-medium">Period</th>
                <th className="py-2 pr-3 font-medium">Artist</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium text-right">Gross</th>
                <th className="py-2 pr-3 font-medium text-right">Net</th>
                <th className="py-2 pr-3 font-medium text-right">Share</th>
                <th className="py-2 pr-3 font-medium text-right">Amount</th>
                <th className="py-2 pl-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id} className="border-b border-border/20 hover:bg-secondary/20">
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {e.earning_period_month && e.earning_period_year
                      ? `${e.earning_period_year}-${String(e.earning_period_month).padStart(2, '0')}`
                      : '—'}
                  </td>
                  <td className="py-2.5 pr-3 truncate max-w-[120px]">{e.artist_name || '—'}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{getSourceLabel(e.revenue_source)}</td>
                  <td className="py-2.5 pr-3 text-right">${(e.gross_revenue || 0).toFixed(2)}</td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">${(e.net_revenue || 0).toFixed(2)}</td>
                  <td className="py-2.5 pr-3 text-right">{e.revenue_percentage || 0}%</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-neon-purple">${(e.collaborator_amount || 0).toFixed(2)}</td>
                  <td className="py-2.5 pl-3"><NeonBadge color={STATUS_STYLES[e.payment_status] || 'muted'}>{e.payment_status}</NeonBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}