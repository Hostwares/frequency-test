import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  CreditCard, Wallet, Smartphone, Banknote, CheckCircle2, XCircle,
  Settings2, Loader2, DollarSign, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

const GATEWAY_DEFAULTS = [
  {
    gateway_name: 'base44_payments',
    display_name: 'Base44 Payments',
    icon: Shield,
    color: '#a855f7',
    supports_subscriptions: true,
    supports_one_time: true,
    supports_mobile: false,
    supported_payment_types: ['subscription', 'artist_support', 'donation', 'merch', 'tickets'],
    api_key_secret_name: 'WIX_PAYMENTS_API_KEY',
    processing_fee_percent: 2.9,
    processing_fee_fixed: 0.30,
    is_primary: true,
    config_notes: 'Primary gateway — fully configured and active',
  },
  {
    gateway_name: 'stripe',
    display_name: 'Stripe',
    icon: CreditCard,
    color: '#635bff',
    supports_subscriptions: true,
    supports_one_time: true,
    supports_mobile: false,
    supported_payment_types: ['subscription', 'artist_support', 'donation', 'merch', 'tickets'],
    api_key_secret_name: 'STRIPE_SECRET_KEY',
    processing_fee_percent: 2.9,
    processing_fee_fixed: 0.30,
    config_notes: 'Requires STRIPE_SECRET_KEY secret to activate',
  },
  {
    gateway_name: 'paypal',
    display_name: 'PayPal',
    icon: Wallet,
    color: '#0070ba',
    supports_subscriptions: true,
    supports_one_time: true,
    supports_mobile: false,
    supported_payment_types: ['subscription', 'artist_support', 'donation', 'merch', 'tickets'],
    api_key_secret_name: 'PAYPAL_CLIENT_SECRET',
    processing_fee_percent: 3.49,
    processing_fee_fixed: 0.49,
    config_notes: 'Requires PayPal Business API credentials',
  },
  {
    gateway_name: 'cash_app',
    display_name: 'Cash App',
    icon: Banknote,
    color: '#00d632',
    supports_subscriptions: false,
    supports_one_time: true,
    supports_mobile: true,
    supported_payment_types: ['artist_support', 'donation', 'merch', 'tickets'],
    api_key_secret_name: 'CASH_APP_API_KEY',
    processing_fee_percent: 2.75,
    processing_fee_fixed: 0,
    config_notes: 'Cash App Pay — requires Square API credentials',
  },
  {
    gateway_name: 'chime',
    display_name: 'Chime',
    icon: Banknote,
    color: '#00c389',
    supports_subscriptions: false,
    supports_one_time: true,
    supports_mobile: true,
    supported_payment_types: ['donation', 'merch'],
    api_key_secret_name: 'CHIME_API_KEY',
    processing_fee_percent: 1.5,
    processing_fee_fixed: 0,
    config_notes: 'Chime pay-by-bank — requires Chime API integration',
  },
  {
    gateway_name: 'apple_pay',
    display_name: 'Apple Pay',
    icon: Smartphone,
    color: '#ffffff',
    supports_subscriptions: false,
    supports_one_time: true,
    supports_mobile: true,
    supported_payment_types: ['artist_support', 'donation', 'merch', 'tickets'],
    api_key_secret_name: 'APPLE_PAY_MERCHANT_ID',
    processing_fee_percent: 0,
    processing_fee_fixed: 0,
    config_notes: 'Mobile wallet — processes through primary gateway',
  },
  {
    gateway_name: 'google_pay',
    display_name: 'Google Pay',
    icon: Smartphone,
    color: '#4285f4',
    supports_subscriptions: false,
    supports_one_time: true,
    supports_mobile: true,
    supported_payment_types: ['artist_support', 'donation', 'merch', 'tickets'],
    api_key_secret_name: 'GOOGLE_PAY_MERCHANT_ID',
    processing_fee_percent: 0,
    processing_fee_fixed: 0,
    config_notes: 'Mobile wallet — processes through primary gateway',
  },
];

const PAYMENT_TYPES = [
  { key: 'subscription', label: 'Monthly Subscriptions', icon: CreditCard },
  { key: 'artist_support', label: 'Artist Support', icon: DollarSign },
  { key: 'donation', label: 'One-time Donations', icon: DollarSign },
  { key: 'merch', label: 'Merchandise', icon: Banknote },
  { key: 'tickets', label: 'Tickets', icon: Banknote },
];

export default function PaymentGatewayManager() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: () => base44.entities.PaymentGateway.filter({}, 'sort_order'),
  });

  // Merge DB records with defaults
  const gatewayList = GATEWAY_DEFAULTS.map(def => {
    const dbRecord = gateways.find(g => g.gateway_name === def.gateway_name);
    return dbRecord ? { ...def, ...dbRecord } : { ...def, id: null, is_enabled: def.is_primary || false };
  });

  const updateGateway = useMutation({
    mutationFn: async ({ gateway, updates }) => {
      if (gateway.id) {
        return base44.entities.PaymentGateway.update(gateway.id, updates);
      }
      return base44.entities.PaymentGateway.create({
        gateway_name: gateway.gateway_name,
        display_name: gateway.display_name,
        is_enabled: updates.is_enabled ?? false,
        is_primary: gateway.is_primary || false,
        supports_subscriptions: gateway.supports_subscriptions,
        supports_one_time: gateway.supports_one_time,
        supports_mobile: gateway.supports_mobile,
        supported_payment_types: gateway.supported_payment_types,
        api_key_secret_name: gateway.api_key_secret_name,
        processing_fee_percent: gateway.processing_fee_percent,
        processing_fee_fixed: gateway.processing_fee_fixed,
        min_transaction_amount: 0.50,
        sort_order: GATEWAY_DEFAULTS.findIndex(g => g.gateway_name === gateway.gateway_name),
        icon_color: gateway.color,
        config_notes: gateway.config_notes,
        ...updates,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-gateways'] });
    },
  });

  const toggleGateway = (gateway) => {
    const newEnabled = !gateway.is_enabled;
    updateGateway.mutate(
      { gateway, updates: { is_enabled: newEnabled } },
      {
        onSuccess: () => {
          toast.success(`${gateway.display_name} ${newEnabled ? 'enabled' : 'disabled'}`);
        },
        onError: () => toast.error(`Failed to update ${gateway.display_name}`),
      }
    );
  };

  const enabledCount = gatewayList.filter(g => g.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Payment Flow Types */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm">Supported Payment Flows</h3>
          <NeonBadge color="cyan">All Active</NeonBadge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PAYMENT_TYPES.map(({ key, label, icon: Icon }) => (
            <div key={key} className="p-3 rounded-lg bg-secondary/20 border border-border/30 text-center">
              <Icon className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
              <p className="text-[11px] font-medium">{label}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Gateway Cards */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-neon-purple" />
          <h3 className="font-display font-semibold text-sm">Payment Gateways</h3>
          <NeonBadge color="purple">{enabledCount} Active</NeonBadge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {gatewayList.map(gateway => {
            const Icon = gateway.icon;
            const isEnabled = gateway.is_enabled;
            const isPrimary = gateway.is_primary;
            return (
              <GlassCard key={gateway.gateway_name} hover={false} className={`p-4 ${isEnabled ? 'border-neon-turquoise/30' : 'border-border/30'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${gateway.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: gateway.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{gateway.display_name}</p>
                        {isPrimary && <NeonBadge color="purple">Primary</NeonBadge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {gateway.processing_fee_percent > 0
                          ? `${gateway.processing_fee_percent}% + $${gateway.processing_fee_fixed.toFixed(2)}`
                          : 'No additional fee'}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={() => toggleGateway(gateway)} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {gateway.supported_payment_types.map(pt => (
                    <span key={pt} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground capitalize">
                      {pt.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  {isEnabled ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-neon-turquoise" />
                      <span className="text-neon-turquoise">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Inactive</span>
                    </>
                  )}
                  {gateway.supports_mobile && <span className="text-muted-foreground/60">· Mobile wallet</span>}
                  {gateway.supports_subscriptions && <span className="text-muted-foreground/60">· Subscriptions</span>}
                </div>

                <p className="text-[10px] text-muted-foreground/60 mt-2 italic">{gateway.config_notes}</p>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}