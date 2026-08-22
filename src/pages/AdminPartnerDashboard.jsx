import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import AdminPartnerEarnings from '@/components/admin/AdminPartnerEarnings';
import { Wallet, Shield, Eye } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function AdminPartnerDashboard() {
  const { user } = useAuth();
  const { isMasterAdmin, isAdminPartner, permissions, isLoading } = useAdminPermissions();
  const isSelectedPartner = isAdminPartner && Object.keys(permissions || {}).length > 0;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isMasterAdmin && !isSelectedPartner) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Admin Partner access required.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-6 h-6 text-neon-turquoise" />
          <h1 className="text-2xl font-display font-bold">Admin Partner Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {(user?.role === 'master_admin' || user?.role === 'admin')
            ? 'Manage all partner earnings and platform expenses.'
            : 'Track your revenue share, earnings, and payout history.'}
        </p>
      </div>

      {user?.role === 'admin_partner' && !(user?.role === 'master_admin' || user?.role === 'admin') && (
        <GlassCard hover={false} className="p-4 mb-4 border-neon-cyan/20 bg-gradient-to-r from-neon-cyan/5 to-transparent">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neon-cyan" />
            <p className="text-xs text-muted-foreground">
              You have <NeonBadge color="cyan">View-Only</NeonBadge> access by default.
              Contact the Master Admin to request edit permissions for specific areas.
            </p>
          </div>
        </GlassCard>
      )}

      <AdminPartnerEarnings />
    </div>
  );
}