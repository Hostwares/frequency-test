import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import { getRoleLabel } from '@/lib/splitConstants';

const COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22d3ee', '#f43f5e'];

export default function FanAllocationTransparency({ artist }) {
  const enabled = artist?.revenue_split_transparency_enabled;
  const mode = artist?.revenue_split_transparency_mode || 'summary';

  const { data: splits = [] } = useQuery({
    queryKey: ['transparency-splits', artist?.id],
    queryFn: () => base44.entities.RevenueSplit.filter({ artist_profile_id: artist?.id, status: 'active' }, '-created_date', 10),
    enabled: !!artist?.id && enabled,
  });

  if (!enabled || !splits || splits.length === 0) return null;

  // Aggregate collaborators from all active splits (dedupe by name)
  const collaboratorMap = {};
  splits.forEach(split => {
    (split.collaborators || []).forEach(c => {
      if (collaboratorMap[c.full_name]) {
        collaboratorMap[c.full_name].revenue_percentage += c.revenue_percentage;
      } else {
        collaboratorMap[c.full_name] = { ...c };
      }
    });
  });
  const collaborators = Object.values(collaboratorMap).sort((a, b) => b.revenue_percentage - a.revenue_percentage);
  const collaboratorCount = collaborators.length;

  if (collaboratorCount === 0) return null;

  const donutData = collaborators.map(c => ({ name: c.full_name, value: c.revenue_percentage }));

  return (
    <GlassCard hover={false} className="mt-8 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-neon-cyan" />
        <h3 className="font-display font-semibold text-sm">Fan Allocation Transparency™</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        This artist shares fan-supported revenue with {collaboratorCount} collaborator{collaboratorCount !== 1 ? 's' : ''}.
      </p>

      {mode === 'percentages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 flex flex-col justify-center">
            {collaborators.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground flex-1">{getRoleLabel(c.role)}</span>
                <span className="font-medium">{c.revenue_percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'full' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 flex flex-col justify-center">
            {collaborators.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium flex-1">{c.full_name}</span>
                <span className="text-muted-foreground">{getRoleLabel(c.role)}</span>
                <span className="font-medium ml-2">{c.revenue_percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'summary' && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
          <Users className="w-5 h-5 text-neon-cyan" />
          <span className="text-sm">{collaboratorCount} collaborators share revenue from fan support</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4 italic leading-relaxed">
        Your support helps fund this entire creative team. Every contribution directly supports the people who helped create this music.
      </p>
    </GlassCard>
  );
}