import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { SplitSquareHorizontal, Users, DollarSign, FileText } from 'lucide-react';
import CollaboratorStats from '@/components/collaborator/CollaboratorStats';
import CollaboratorSplitsList from '@/components/collaborator/CollaboratorSplitsList';
import CollaboratorEarningsHistory from '@/components/collaborator/CollaboratorEarningsHistory';
import CollaboratorPaymentSettings from '@/components/collaborator/CollaboratorPaymentSettings';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function CollaboratorDashboard() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSplits = [], isLoading: splitsLoading } = useQuery({
    queryKey: ['collaborator-splits'],
    queryFn: () => base44.entities.RevenueSplit.list('-updated_date', 200),
    enabled: !!user?.id,
  });

  const { data: earnings = [], isLoading: earningsLoading } = useQuery({
    queryKey: ['collaborator-earnings', user?.id],
    queryFn: () => base44.entities.CollaboratorEarning.filter({ collaborator_user_id: user.id }, '-created_date', 200),
    enabled: !!user?.id,
  });

  const mySplits = useMemo(() => {
    if (!user?.id) return [];
    return allSplits.filter((split) =>
      (split.collaborators || []).some((c) => c.collaborator_user_id === user.id)
    );
  }, [allSplits, user?.id]);

  const loading = splitsLoading || earningsLoading;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <SplitSquareHorizontal className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Collaborator Dashboard</h1>
            <p className="text-xs text-muted-foreground">Track your revenue splits, earnings, and payouts</p>
          </div>
          {mySplits.length > 0 && (
            <NeonBadge color="purple" className="ml-auto">{mySplits.length} split{mySplits.length === 1 ? '' : 's'}</NeonBadge>
          )}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <CollaboratorStats earnings={earnings} splits={mySplits} />

            {/* Empty state */}
            {mySplits.length === 0 && earnings.length === 0 && (
              <GlassCard hover={false} className="p-8 text-center mt-6">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-semibold mb-1">You're not a collaborator yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  When an artist adds you as a collaborator on a Revenue Split™, you'll see your assigned percentages, earnings, and payment options here.
                </p>
              </GlassCard>
            )}

            {/* Assigned Splits */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <SplitSquareHorizontal className="w-4 h-4 text-neon-cyan" />
                <h2 className="font-display font-semibold text-base">Assigned Revenue Splits</h2>
              </div>
              <CollaboratorSplitsList splits={mySplits} userId={user?.id} />
            </div>

            {/* Earnings */}
            {earnings.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-neon-purple" />
                  <h2 className="font-display font-semibold text-base">Earnings</h2>
                </div>
                <CollaboratorEarningsHistory earnings={earnings} />
              </div>
            )}

            {/* Payment Settings */}
            {mySplits.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-neon-magenta" />
                  <h2 className="font-display font-semibold text-base">Payment Information</h2>
                </div>
                <CollaboratorPaymentSettings splits={mySplits} userId={user?.id} />
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}