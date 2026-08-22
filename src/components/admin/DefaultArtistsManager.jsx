import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Star, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import DefaultArtistSlot from './DefaultArtistSlot';

const SETTING_KEY = 'default_platform_artists';

function parseIds(rec) {
  try {
    const parsed = rec ? JSON.parse(rec.setting_value) : {};
    const arr = Array.isArray(parsed.artist_ids) ? parsed.artist_ids : [];
    return [arr[0] || null, arr[1] || null];
  } catch {
    return [null, null];
  }
}

export default function DefaultArtistsManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [slots, setSlots] = useState([null, null]);
  const [loaded, setLoaded] = useState(false);

  const { data: settingRec, isLoading } = useQuery({
    queryKey: ['default-artists-setting'],
    queryFn: async () => {
      const recs = await base44.entities.PlatformSetting.filter({ setting_key: SETTING_KEY });
      return recs[0] || null;
    },
  });

  useEffect(() => {
    if (!isLoading && !loaded) {
      setSlots(parseIds(settingRec));
      setLoaded(true);
    }
  }, [isLoading, settingRec, loaded]);

  const savedIds = parseIds(settingRec).filter(Boolean);
  const dirty = slots.filter(Boolean).join(',') !== savedIds.join(',');

  const save = useMutation({
    mutationFn: async () => {
      const artistIds = slots.filter(Boolean);
      const value = JSON.stringify({ artist_ids: artistIds });
      const meta = {
        setting_value: value,
        setting_type: 'json',
        updated_by_user_id: user.id,
        updated_by_name: user.full_name || user.email,
      };
      if (settingRec) {
        await base44.entities.PlatformSetting.update(settingRec.id, meta);
      } else {
        await base44.entities.PlatformSetting.create({
          setting_key: SETTING_KEY,
          ...meta,
          description: 'Two designated default artists seeded into every new user playlist',
        });
      }
      // Reconcile is_default_platform_artist flags to exactly the designated artists
      const current = await base44.entities.ArtistProfile.filter({ is_default_platform_artist: true });
      const designated = new Set(artistIds);
      const updates = [];
      for (const a of current) {
        if (!designated.has(a.id)) {
          updates.push(base44.entities.ArtistProfile.update(a.id, { is_default_platform_artist: false }));
        }
      }
      for (const id of artistIds) {
        updates.push(base44.entities.ArtistProfile.update(id, { is_default_platform_artist: true }));
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['default-artists-setting'] });
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Default artists saved');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-display font-bold">Default Platform Artists</h2>
            <p className="text-xs text-muted-foreground">
              These two artists and their songs are seeded into every new user's playlist at sign-up.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          <Save className="w-3.5 h-3.5" /> {save.isPending ? 'Saving…' : 'Save Defaults'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DefaultArtistSlot
          slotNumber={1}
          artistId={slots[0]}
          onAssign={(id) => setSlots([id, slots[1]])}
          onClear={() => setSlots([null, slots[1]])}
        />
        <DefaultArtistSlot
          slotNumber={2}
          artistId={slots[1]}
          onAssign={(id) => setSlots([slots[0], id])}
          onClear={() => setSlots([slots[0], null])}
        />
      </div>

      <GlassCard hover={false} className="p-4 flex items-start gap-2">
        <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Upload a profile image and songs for each artist here. New users who register after you save will automatically
          receive a "My Frequency" playlist with these songs at the top.
        </p>
      </GlassCard>
    </div>
  );
}