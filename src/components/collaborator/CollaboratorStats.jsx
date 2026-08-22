import React, { useMemo } from 'react';
import { DollarSign, Clock, CheckCircle, SplitSquareHorizontal } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

function Stat({ icon: Icon, label, value, color, sub }) {
  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </GlassCard>
  );
}

export default function CollaboratorStats({ earnings, splits }) {
  const totals = useMemo(() => {
    const total = earnings.reduce((s, e) => s + (e.collaborator_amount || 0), 0);
    const pending = earnings
      .filter((e) => e.payment_status === 'pending' || e.payment_status === 'processing')
      .reduce((s, e) => s + (e.collaborator_amount || 0), 0);
    const paid = earnings
      .filter((e) => e.payment_status === 'paid')
      .reduce((s, e) => s + (e.collaborator_amount || 0), 0);
    const activeSplits = splits.filter((s) => s.status === 'active').length;
    return { total, pending, paid, activeSplits };
  }, [earnings, splits]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat icon={DollarSign} label="Total Earnings" value={`$${totals.total.toFixed(2)}`} color="bg-neon-purple/10" />
      <Stat icon={Clock} label="Pending Payout" value={`$${totals.pending.toFixed(2)}`} color="bg-yellow-500/10" sub="Awaiting payment" />
      <Stat icon={CheckCircle} label="Paid Out" value={`$${totals.paid.toFixed(2)}`} color="bg-green-500/10" sub="Lifetime paid" />
      <Stat icon={SplitSquareHorizontal} label="Active Splits" value={totals.activeSplits} color="bg-neon-cyan/10" sub={`${splits.length} total assigned`} />
    </div>
  );
}