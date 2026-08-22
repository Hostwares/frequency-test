import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/shared/GlassCard';
import { Heart, DollarSign, Calendar, Percent, CheckCircle } from 'lucide-react';

export default function ArtistGratitudeHistory({ artistProfileId }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['gratitude-payments', artistProfileId],
    queryFn: async () => {
      const allPayments = await base44.entities.PartnerGratitudePayment.list('-payment_date');
      return allPayments.filter(p => p.artist_profile_id === artistProfileId);
    },
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  const milestoneLabels = {
    '20k_fans': 'Breakout Artist (20k)',
    '30k_fans': 'Rising Star (30k)',
    '40k_fans': 'Superstar (40k)',
    '50k_fans': 'Icon (50k)',
    '60k_fans': 'Living Legend (60k)',
    'custom': 'Custom Milestone',
  };

  const totalGiven = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-neon-magenta" />
          <h3 className="text-lg font-heading font-bold text-foreground">
            Gratitude Payments Sent
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Total support given to Discovery Partners
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No gratitude payments sent yet</p>
          <p className="text-xs mt-1">Thank your Discovery Partners when you hit milestones!</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 bg-gradient-card rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Given:</span>
              <span className="text-2xl font-bold text-neon-magenta">
                ${totalGiven.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {payments.map(payment => (
              <div
                key={payment.id}
                className="p-4 rounded-lg bg-secondary/50 border border-border/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {payment.partner_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {milestoneLabels[payment.milestone_trigger]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-neon-magenta">
                      ${payment.amount?.toFixed(2) || '0.00'}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      {payment.payment_type === 'custom_amount' ? (
                        <>
                          <DollarSign className="w-3 h-3" />
                          Custom Amount
                        </>
                      ) : (
                        <>
                          <Percent className="w-3 h-3" />
                          {payment.percentage || 0}% of royalties
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </div>
                  {payment.notification_sent && (
                    <div className="flex items-center gap-1 text-green-400">
                      <span className="text-xs">✓ Email sent</span>
                    </div>
                  )}
                </div>

                {payment.message && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    "{payment.message}"
                  </p>
                )}

                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}