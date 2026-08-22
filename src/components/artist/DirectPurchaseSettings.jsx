import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Loader2, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import GlassCard from '@/components/shared/GlassCard';
import { toast } from 'sonner';

export default function DirectPurchaseSettings({ artistProfile }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(!!artistProfile.direct_purchases_enabled);
  const [policy, setPolicy] = useState(artistProfile.purchase_policy || 'current_catalog_access');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ArtistProfile.update(artistProfile.id, {
        direct_purchases_enabled: enabled,
        purchase_policy: enabled ? policy : 'none',
      });
      qc.invalidateQueries({ queryKey: ['my-artist-profile'] });
      toast.success('Direct purchase settings saved');
    } catch (e) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="w-4 h-4 text-neon-cyan" />
        <h3 className="font-display font-semibold text-sm">Direct Song Purchases</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm">Allow fans to purchase my songs directly</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Fans buy eligible songs you mark for sale. A purchase does not auto-enroll you into their funded playlist.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div>
            <Label className="text-xs mb-1.5 block">Purchase Policy</Label>
            <Select value={policy} onValueChange={setPolicy}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current_catalog_access">Current Catalog Access</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Current Catalog Access grants the buyer the purchased song plus access to your eligible catalog available on the platform at the time of purchase \u2014 they may listen and add those songs to personal listening playlists.
            </p>
          </div>
        )}

        <div className="rounded-lg bg-secondary/30 p-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            A direct purchase is a one-time transaction. To receive recurring monthly support from a fan&rsquo;s subscription, the fan must add you to their Primary Funded Playlist during the next billing cycle&rsquo;s two-day grace period.
          </p>
        </div>

        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Saving...</> : 'Save Settings'}
        </Button>
      </div>
    </GlassCard>
  );
}