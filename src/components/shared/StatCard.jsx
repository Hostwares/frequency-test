import React from 'react';
import GlassCard from './GlassCard';

export default function StatCard({ icon: Icon, label, value, trend, color = "text-primary" }) {
  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          <p className={`text-2xl font-bold font-display mt-1 ${color}`}>{value}</p>
          {trend && (
            <p className="text-xs text-neon-turquoise mt-1">+{trend} this month</p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}