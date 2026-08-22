import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Loader2, Music } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import SalesLogPdfExport from '@/components/artist/SalesLogPdfExport';

export default function DirectSalesHistory({ artistProfile }) {
  const { data: songs = [] } = useQuery({
    queryKey: ['artist-sales-songs', artistProfile?.id],
    queryFn: () =>
      base44.entities.Song.filter({ artist_profile_id: artistProfile.id }, '-created_date', 200),
    enabled: !!artistProfile?.id,
  });
  const songIds = new Set(songs.map((s) => s.id));

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['artist-sales-orders', artistProfile?.id],
    queryFn: () =>
      base44.entities.Order.filter(
        { artist_profile_id: artistProfile.id, payment_status: 'paid' },
        '-created_date',
        100
      ),
    enabled: !!artistProfile?.id,
  });

  const sales = orders
    .filter((o) => (o.items || []).some((it) => songIds.has(it.product_id)))
    .flatMap((o) =>
      (o.items || [])
        .filter((it) => songIds.has(it.product_id))
        .map((it) => ({ order: o, item: it }))
    );

  const totalRevenue = sales.reduce(
    (sum, s) => sum + (s.item.price || 0) * (s.item.quantity || 1),
    0
  );

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—';

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-neon-cyan" />
          <h2 className="font-display font-semibold text-foreground">Direct Sales History</h2>
        </div>
        <div className="flex items-center gap-3">
          {sales.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {sales.length} {sales.length === 1 ? 'sale' : 'sales'} · ${totalRevenue.toFixed(2)}
            </p>
          )}
          <SalesLogPdfExport sales={sales} artistProfile={artistProfile} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading sales history...
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-8">
          <Music className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No direct song sales yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            When fans buy your songs, each purchase will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map(({ order, item }, idx) => (
            <div
              key={order.id + '-' + idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40"
            >
              <div className="w-9 h-9 rounded-md bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-neon-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.product_title || 'Untitled'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {order.fan_name || order.fan_email || 'Anonymous fan'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-neon-cyan">
                  ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(order.created_date)}</p>
              </div>
              <NeonBadge color="turquoise" className="ml-1">Paid</NeonBadge>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}