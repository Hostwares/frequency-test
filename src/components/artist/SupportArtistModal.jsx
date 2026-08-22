import React, { useState } from 'react';
import { Heart, Repeat, Zap } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import NeonBadge from '@/components/shared/NeonBadge';
import CheckoutButton from '@/components/payment/CheckoutButton';
import { getSupportTier as getTier } from '@/lib/supportTiers';

export default function SupportArtistModal({ artist, open, onClose }) {
  const [amount, setAmount] = useState(5);
  const [mode, setMode] = useState('monthly'); // 'monthly' | 'one_time'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Support {artist?.artist_name}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Your support goes directly to the artist — no middleman. 85% to the artist, 15% platform contribution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
            <button
              onClick={() => setMode('monthly')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                mode === 'monthly' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Repeat className="w-3 h-3" />
              Monthly
            </button>
            <button
              onClick={() => setMode('one_time')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                mode === 'one_time' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3 h-3" />
              One-time
            </button>
          </div>

          {/* Amount Display */}
          <div className="text-center">
            <p className="text-4xl font-display font-bold text-neon-cyan">
              ${amount}
              <span className="text-sm text-muted-foreground font-normal">
                {mode === 'monthly' ? '/mo' : ''}
              </span>
            </p>
            <NeonBadge color="purple" className="mt-2">{getTier(amount)} tier</NeonBadge>
          </div>

          {/* Slider */}
          <Slider
            min={1} max={25} step={1}
            value={[amount]}
            onValueChange={([v]) => setAmount(v)}
            className="mt-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            <span>$1 basic</span><span>$3 supporter</span><span>$8 champion</span><span>$15 patron</span>
          </div>

          {/* Payment Methods Info */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <span>Secure checkout via</span>
            <span className="font-medium">Base44 Payments</span>
          </div>

          {/* Checkout Button */}
          <CheckoutButton
            payment_type="support"
            artist_profile_id={artist?.id}
            artist_name={artist?.artist_name}
            amount={amount}
            is_recurring={mode === 'monthly'}
            variant="default"
            className="w-full bg-gradient-neon hover:opacity-90 text-white font-semibold"
          >
            <Heart className="w-4 h-4 mr-2" />
            {mode === 'monthly' ? `Support $${amount}/mo` : `Give $${amount}`}
          </CheckoutButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}