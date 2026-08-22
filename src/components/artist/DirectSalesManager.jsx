import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Music, Save, Loader2, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import DirectPurchaseSettings from '@/components/artist/DirectPurchaseSettings';
import SongStoreAnalytics from '@/components/artist/SongStoreAnalytics';
import { SONG_PRICE_DEFAULT, SONG_PRICE_MIN, SONG_PRICE_MAX } from '@/lib/songPricing';
import { toast } from 'sonner';

export default function DirectSalesManager({ artistProfile }) {
  const qc = useQueryClient();
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['direct-sales-songs', artistProfile.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile.id }, '-created_date'),
  });
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const getDraft = (song) =>
    drafts[song.id] || { is_purchasable: !!song.is_purchasable, purchase_price: song.purchase_price ?? '' };

  const updateDraft = (song, patch) =>
    setDrafts((prev) => ({ ...prev, [song.id]: { ...getDraft(song), ...patch } }));

  const save = async (song) => {
    const d = getDraft(song);
    const price = d.is_purchasable && d.purchase_price ? Number(d.purchase_price) : 0;
    if (d.is_purchasable && price < SONG_PRICE_MIN) {
      toast.error(`Minimum purchase price is $${SONG_PRICE_MIN.toFixed(2)}`);
      return;
    }
    if (d.is_purchasable && price > SONG_PRICE_MAX) {
      toast.error(`Maximum purchase price is $${SONG_PRICE_MAX.toFixed(2)}`);
      return;
    }
    setSavingId(song.id);
    try {
      await base44.entities.Song.update(song.id, {
        is_purchasable: !!d.is_purchasable,
        purchase_price: price,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[song.id];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['direct-sales-songs'] });
      toast.success(`"${song.title}" ${d.is_purchasable ? 'is now for sale' : 'removed from sale'}`);
    } catch (e) {
      toast.error(e?.message || 'Failed to update song');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SongStoreAnalytics artistProfileId={artistProfile.id} />
      <DirectPurchaseSettings artistProfile={artistProfile} />

      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Music className="w-4 h-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm">Songs Available for Direct Purchase</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Toggle which songs fans can buy directly and set a price (${SONG_PRICE_MIN.toFixed(2)}–${SONG_PRICE_MAX.toFixed(2)}, default ${SONG_PRICE_DEFAULT.toFixed(2)}). Buyers receive Current Catalog Access to your eligible catalog.
        </p>

        {isLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading songs...</div>
        ) : songs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No songs yet. Upload songs in the Catalog Manager to make them available for direct purchase.
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => {
              const d = getDraft(song);
              const dirty =
                d.is_purchasable !== !!song.is_purchasable ||
                String(d.purchase_price ?? '') !== String(song.purchase_price ?? '');
              return (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={song.cover_art || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=80'}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    {song.is_purchasable && (
                      <span className="text-[10px] text-neon-cyan">For Sale · ${Number(song.purchase_price || 0).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Switch
                      checked={d.is_purchasable}
                      onCheckedChange={(v) =>
                        updateDraft(song, {
                          is_purchasable: v,
                          purchase_price: v && !d.purchase_price ? String(SONG_PRICE_DEFAULT) : d.purchase_price,
                        })
                      }
                    />
                    {d.is_purchasable && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0.99"
                          max="2.99"
                          step="0.01"
                          value={d.purchase_price}
                          onChange={(e) => updateDraft(song, { purchase_price: e.target.value })}
                          placeholder="1.29"
                          className="w-24 h-8 text-sm"
                        />
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => save(song)}
                      disabled={!dirty || savingId === song.id}
                      className="h-8 px-2"
                    >
                      {savingId === song.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}