import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import { REVENUE_SOURCES, getSourceLabel, getRoleLabel, COLLABORATOR_ROLES } from '@/lib/splitConstants';

const CHART_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22d3ee', '#f43f5e', '#84cc16', '#a3a3a3'];

export default function RevenueSplitAnalytics({ artistProfileId }) {
  const { data: earnings = [] } = useQuery({
    queryKey: ['collaborator-earnings', artistProfileId],
    queryFn: () => base44.entities.CollaboratorEarning.filter({ artist_profile_id: artistProfileId }, '-created_date', 500),
    enabled: !!artistProfileId,
  });

  const { data: splits = [] } = useQuery({
    queryKey: ['revenue-splits-analytics', artistProfileId],
    queryFn: () => base44.entities.RevenueSplit.filter({ artist_profile_id: artistProfileId }, '-created_date', 50),
    enabled: !!artistProfileId,
  });

  // Donut: by collaborator from active splits
  const activeSplits = splits.filter(s => s.status === 'active');
  const collaboratorData = [];
  activeSplits.forEach(split => {
    (split.collaborators || []).forEach(c => {
      const existing = collaboratorData.find(d => d.name === c.full_name);
      if (existing) {
        existing.value += c.revenue_percentage;
      } else {
        collaboratorData.push({ name: c.full_name || 'Unknown', role: getRoleLabel(c.role), value: c.revenue_percentage });
      }
    });
  });

  // Bar: revenue by source
  const sourceMap = {};
  earnings.forEach(e => {
    const key = e.revenue_source;
    sourceMap[key] = (sourceMap[key] || 0) + (e.collaborator_amount || 0);
  });
  const sourceData = REVENUE_SOURCES
    .map(s => ({ name: s.label.replace(' Revenue', '').replace(' Allocation', ''), value: sourceMap[s.value] || 0 }))
    .filter(d => d.value > 0);

  const totalDistributed = earnings.reduce((sum, e) => sum + (e.collaborator_amount || 0), 0);

  if (earnings.length === 0 && activeSplits.length === 0) {
    return (
      <GlassCard hover={false} className="p-6 text-center">
        <p className="text-sm text-muted-foreground">No earnings distributed yet. Activate a split and earn revenue to see analytics here.</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut by Collaborator */}
      {collaboratorData.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <h4 className="font-display font-semibold text-sm mb-4">Active Splits by Collaborator</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={collaboratorData}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={90}
                paddingAngle={2}
              >
                {collaboratorData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border/50 rounded-lg p-2 text-xs">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-muted-foreground">{d.role}</p>
                      <p className="text-neon-purple font-bold">{d.value.toFixed(2)}%</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-3">
            {collaboratorData.slice(0, 8).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate">{d.name}</span>
                  <span className="text-muted-foreground">{d.role}</span>
                </div>
                <span className="font-medium">{d.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Revenue by Source */}
      {sourceData.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <h4 className="font-display font-semibold text-sm mb-4">Revenue by Source (Distributed)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sourceData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(260 20% 7%)', border: '1px solid hsl(260 15% 16%)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v) => `$${Number(v).toFixed(2)}`}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Distributed</span>
              <span className="font-bold text-neon-turquoise">${totalDistributed.toFixed(2)}</span>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}