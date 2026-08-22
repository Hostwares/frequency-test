import React from 'react';
import { motion } from 'framer-motion';
import PricingPlans from '@/components/business/PricingPlans';
import ReferralDashboard from '@/components/business/ReferralDashboard';
import QRMembershipCard from '@/components/business/QRMembershipCard';
import BetaNoticeBanner from '@/components/shared/BetaNoticeBanner';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Gift, QrCode } from 'lucide-react';

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1 text-center">Choose Your Frequency</h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          Support artists directly. Cancel anytime.
        </p>

        <div className="max-w-2xl mx-auto mb-8">
          <BetaNoticeBanner />
        </div>

        {user ? (
          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-6">
              <TabsTrigger value="plans" className="gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5" />Plans
              </TabsTrigger>
              <TabsTrigger value="referral" className="gap-1.5 text-xs">
                <Gift className="w-3.5 h-3.5" />Referrals
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-1.5 text-xs">
                <QrCode className="w-3.5 h-3.5" />Membership
              </TabsTrigger>
            </TabsList>
            <TabsContent value="plans"><PricingPlans /></TabsContent>
            <TabsContent value="referral"><ReferralDashboard /></TabsContent>
            <TabsContent value="card"><QRMembershipCard /></TabsContent>
          </Tabs>
        ) : (
          <PricingPlans />
        )}
      </motion.div>
    </div>
  );
}