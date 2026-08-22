import React from 'react';
import { ShoppingBag, HelpCircle } from 'lucide-react';
import CheckoutButton from '@/components/payment/CheckoutButton';
import NeonBadge from '@/components/shared/NeonBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SONG_PRICE_MIN } from '@/lib/songPricing';

/**
 * Direct Artist Purchase button. Renders only when the artist has enabled
 * direct purchases AND this song is marked purchasable at a valid price
 * (>= $0.50). Uses the existing Base44 Payments merch checkout flow.
 */
export default function BuySongButton({ song, artist }) {
  if (!artist?.direct_purchases_enabled || !song?.is_purchasable) return null;
  const price = Number(song.purchase_price || 0);
  if (price < SONG_PRICE_MIN) return null;

  const items = [{
    product_id: song.id,
    product_title: song.title,
    price,
    quantity: 1,
    digital_file_url: song.audio_url || '',
  }];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <CheckoutButton
        payment_type="merch"
        artist_profile_id={artist.id}
        artist_name={artist.artist_name}
        items={items}
        className="bg-gradient-neon hover:opacity-90 gap-2"
      >
        <ShoppingBag className="w-4 h-4" />
        Buy Song · ${price.toFixed(2)}
      </CheckoutButton>
      {artist.purchase_policy === 'current_catalog_access' && (
        <NeonBadge color="cyan">Current Catalog Access</NeonBadge>
      )}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="How direct purchase works" className="text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
            <p className="font-semibold mb-1 text-foreground">One-time purchase vs. playlist support</p>
            <p>
              Buying a song is a single payment that unlocks this song (and, with Current Catalog Access, the artist&apos;s eligible catalog) for listening.
              It does <span className="font-semibold">not</span> add the artist to your recurring monthly Artist Distribution Pool.
            </p>
            <p className="mt-1.5">
              To support this artist monthly through your subscription, add them to a Funded Playlist during the next billing cycle&apos;s grace period.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}