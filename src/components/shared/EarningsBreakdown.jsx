import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, GitBranch, Radio } from 'lucide-react';
import NeonBadge from '@/components/shared/NeonBadge';

const TIER_AMOUNTS = { basic: 1, supporter: 5, champion: 10, patron: 20 };

const COLORS = {
  direct: '#a855f7',
  referred: '#06b6d4',
  community: '#d946ef',
};

const TIER_COLORS = {
  basic: '#3b82f6',
  supporter: '#a855f7',
  champion: '#06b6d4',
  patron: '#f59e0b',
};

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const { name, value } = payload[0].payload;
    return (
      <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-foreground">{name}</p>
        <p className="text-neon-cyan font-bold">${value.toFixed(2)}/mo</p>
      </div>
    );
  }
  return null;
}

export default function EarningsBreakdown({ supporters }) {
  const { directTotal, referredTotal, byTier, sourceData, tierData } = useMemo(() => {
    let directTotal = 0;
    let referredTotal = 0;
    const byTier = {};

    supporters.forEach(s => {
      const amount = s.amount || TIER_AMOUNTS[s.tier] || 0;
      if (s.referred_by_fan_id) {
        referredTotal += amount;
      } else {
        directTotal += amount;
      }
      if (!byTier[s.tier]) byTier[s.tier] = 0;
      byTier[s.tier] += amount;
    });

    // Community fund is placeholder (no real data source yet, shown as 0)
    const communityTotal = 0;
    const grandTotal = directTotal + referredTotal + communityTotal;

    const sourceData = [
      { name: 'Direct Support', value: directTotal, color: COLORS.direct },
      { name: 'Referred Fans', value: referredTotal, color: COLORS.referred },
      ...(communityTotal > 0 ? [{ name: 'Community Fund', value: communityTotal, color: COLORS.community }] : []),
    ].filter(d => d.value > 0);

    const tierData = Object.entries(byTier).map(([tier, value]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value,
      color: TIER_COLORS[tier] || '#6b7280',
    }));

    return { directTotal, referredTotal, byTier, sourceData, tierData, grandTotal };
  }, [supporters]);

  const grandTotal = directTotal + referredTotal;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-neon-purple" />
          <h2 className="font-display font-semibold text-sm">Monthly Earnings Breakdown</h2>
        </div>
        <span className="text-xl font-display font-bold text-neon-purple">${grandTotal.toFixed(2)}</span>
      </div>

      {supporters.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
          <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No earnings yet. Earnings appear once fans support you.</p>
        </div>
      ) : (
        <>
          {/* Chart + Source legend side by side */}
          <div className="flex items-center gap-6">
            {/* Donut chart */}
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData.length ? sourceData : [{ name: 'No data', value: 1, color: '#334155' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(sourceData.length ? sourceData : [{ color: '#334155' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Source breakdown */}
            <div className="flex-1 space-y-2.5">
              {[
                { label: 'Direct Support', value: directTotal, color: COLORS.direct, icon: Users },
                { label: 'Referred Fans', value: referredTotal, color: COLORS.referred, icon: GitBranch },
                { label: 'Community Fund', value: 0, color: COLORS.community, icon: Radio },
              ].map(({ label, value, color, icon: Icon }) => {
                const pct = grandTotal > 0 ? Math.round((value / grandTotal) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs text-muted-foreground flex-1">{label}</span>
                    <span className="text-xs font-semibold" style={{ color }}>${value.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tier breakdown bar */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">By Support Tier</p>
            {Object.entries(byTier).sort((a, b) => b[1] - a[1]).map(([tier, amount]) => {
              const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
              const count = supporters.filter(s => s.tier === tier).length;
              return (
                <div key={tier} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <NeonBadge color={tier === 'patron' ? 'magenta' : tier === 'champion' ? 'cyan' : tier === 'supporter' ? 'purple' : 'blue'}>
                        {tier}
                      </NeonBadge>
                      <span className="text-muted-foreground">{count} fan{count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-semibold" style={{ color: TIER_COLORS[tier] }}>${amount.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: TIER_COLORS[tier] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}