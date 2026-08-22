import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Loader2, Headphones, Music, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { base44 } from '@/api/base44Client';

export default function ThankYou() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutId = urlParams.get('checkoutId') || urlParams.get('session_id') || urlParams.get('order');
  const [confirming, setConfirming] = useState(!!checkoutId);
  const [pollCount, setPollCount] = useState(0);
  const [songPurchases, setSongPurchases] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);

  const loadPurchaseDetails = async (paidOrder) => {
    try {
      const u = await base44.auth.me();
      if (u) setWalletBalance(u.wallet_balance ?? 0);
    } catch {}

    if (paidOrder.payment_type !== 'merch' || !paidOrder.items?.length) return;

    const songItems = [];
    for (const item of paidOrder.items) {
      if (!item.product_id) continue;
      try {
        const songs = await base44.entities.Song.filter({ id: item.product_id });
        if (songs?.[0]?.is_purchasable) {
          songItems.push({
            song: songs[0],
            price: item.price,
            artistName: paidOrder.artist_name || '',
            artistProfileId: paidOrder.artist_profile_id,
          });
        }
      } catch {}
    }

    if (songItems.length === 0) return;

    let accessGranted = false;
    try {
      const grants = await base44.entities.CatalogAccessGrant.filter({
        artist_profile_id: paidOrder.artist_profile_id,
        is_active: true,
      });
      accessGranted = grants.some((g) => g.fan_user_id === paidOrder.fan_user_id);
    } catch {}

    setSongPurchases(songItems.map((sp) => ({ ...sp, accessGranted })));
  };

  // Poll for payment confirmation (webhook may arrive after redirect)
  useEffect(() => {
    if (!checkoutId) return;

    let cancelled = false;
    const checkInterval = setInterval(async () => {
      if (cancelled) return;
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) return;

        const subs = await base44.entities.UserSubscription.filter({
          user_id: user.id,
          checkout_session_id: checkoutId,
        });

        if (subs.length > 0 && subs[0].status === 'active') {
          setConfirming(false);
          clearInterval(checkInterval);
          return;
        }

        const orders = await base44.entities.Order.filter({
          fan_user_id: user.id,
          checkout_session_id: checkoutId,
        });

        if (orders.length > 0 && orders[0].payment_status === 'paid') {
          setConfirming(false);
          clearInterval(checkInterval);
          await loadPurchaseDetails(orders[0]);
        }
      } catch (e) {
        // ignore — will retry
      }

      setPollCount(prev => {
        const next = prev + 1;
        if (next >= 6) {
          setConfirming(false);
          clearInterval(checkInterval);
        }
        return next;
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
    };
  }, [checkoutId]);

  const isSongPurchase = songPurchases.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <GlassCard hover={false} className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-6 ${
              confirming
                ? 'bg-neon-cyan/10 border-neon-cyan/30'
                : 'bg-neon-turquoise/10 border-neon-turquoise/30'
            }`}
          >
            {confirming ? (
              <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-neon-turquoise" />
            )}
          </motion.div>

          {confirming ? (
            <>
              <h1 className="text-2xl font-display font-bold mb-2">Confirming your payment...</h1>
              <p className="text-sm text-muted-foreground mb-1">
                We're verifying your transaction. This usually takes a few seconds.
              </p>
              <p className="text-xs text-muted-foreground/60 mb-6">
                You can safely wait here or continue — your purchase will complete automatically.
              </p>
            </>
          ) : isSongPurchase ? (
            <>
              <h1 className="text-2xl font-display font-bold mb-2">Purchase Successful!</h1>
              <p className="text-sm text-muted-foreground mb-4">
                You bought {songPurchases.length === 1 ? 'a song' : `${songPurchases.length} songs`} from {songPurchases[0].artistName}.
              </p>

              <div className="space-y-3 text-left mb-6">
                {songPurchases.map((sp, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Music className="w-4 h-4 text-neon-cyan flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{sp.song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{sp.artistName}</p>
                    </div>
                    <NeonBadge color="cyan">${Number(sp.price).toFixed(2)}</NeonBadge>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 justify-center text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-neon-turquoise" />
                  <span className="text-neon-turquoise font-medium">
                    Current Catalog Access {songPurchases.some((s) => s.accessGranted) ? 'granted' : 'activating…'}
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Wallet updated{walletBalance !== null ? ` · Balance $${Number(walletBalance).toFixed(2)}` : ''}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold mb-2">Payment Successful!</h1>
              <p className="text-sm text-muted-foreground mb-1">
                Thank you for your support. Your payment has been processed.
              </p>
            </>
          )}

          {checkoutId && (
            <p className="text-xs text-muted-foreground/60 mb-6">
              Reference: {checkoutId.slice(0, 12)}...
            </p>
          )}

          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={() => navigate('/fan-dashboard')}
              className="bg-gradient-neon text-white font-semibold gap-2"
            >
              <Headphones className="w-4 h-4" />
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}