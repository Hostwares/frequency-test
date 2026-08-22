import React from 'react';
import { Heart, Share2, Users, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function RevenueSplitVisual({ monthlyAmount }) {
  const artistShare = monthlyAmount * 0.85;
  const networkShare = monthlyAmount * 0.15;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="text-center mb-6">
        <h3 className="font-display font-semibold text-base mb-2">
          Your Support Impact
        </h3>
        <p className="text-xs text-muted-foreground">
          Every dollar directly supports independent artists and their discovery network
        </p>
      </div>

      {/* Amount Display */}
      <div className="text-center mb-6">
        <p className="text-3xl font-bold text-gradient-neon">${monthlyAmount.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-1">per month</p>
      </div>

      {/* Split Visualization */}
      <div className="relative mb-6">
        <div className="h-4 rounded-full bg-secondary/30 overflow-hidden flex">
          <div 
            className="h-full bg-gradient-to-r from-neon-purple to-neon-magenta transition-all duration-500"
            style={{ width: '85%' }}
          />
          <div 
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-blue transition-all duration-500"
            style={{ width: '15%' }}
          />
        </div>
        
        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neon-purple" />
            <span className="text-muted-foreground">85% to Artist</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neon-cyan" />
            <span className="text-muted-foreground">15% to Network</span>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-5 h-5 text-neon-purple" />
            <div>
              <p className="text-sm font-semibold text-neon-purple">
                ${artistShare.toFixed(2)}/month
              </p>
              <p className="text-xs text-muted-foreground">
                Directly to the artist you support
              </p>
            </div>
          </div>
          <p className="text-[10px] text-purple-300/70">
            Artists keep 85% of your support to fund their music, tours, and creative work
          </p>
        </div>

        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="w-5 h-5 text-neon-cyan" />
            <div>
              <p className="text-sm font-semibold text-neon-cyan">
                ${networkShare.toFixed(2)}/month
              </p>
              <p className="text-xs text-muted-foreground">
                To their discovery network
              </p>
            </div>
          </div>
          <p className="text-[10px] text-cyan-300/70">
            15% is shared with artists in their network who helped them grow
          </p>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="mt-6 p-4 rounded-xl bg-secondary/10 border border-border/30">
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="w-5 h-5 text-neon-magenta" />
          <p className="text-sm font-semibold">Annual Impact</p>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total annual support</span>
            <span className="font-semibold">${(monthlyAmount * 12).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To artist annually</span>
            <span className="font-semibold text-neon-purple">${(artistShare * 12).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To network annually</span>
            <span className="font-semibold text-neon-cyan">${(networkShare * 12).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-[10px] text-blue-300/80 text-center">
          <strong>Automatic Payouts:</strong> Artists receive payments automatically when their balance reaches $50
        </p>
      </div>
    </GlassCard>
  );
}