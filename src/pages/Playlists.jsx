import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Headphones, Music, Users, Radio, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import CreatePlaylistModal from '@/components/playlist/CreatePlaylistModal';
import DiscoveryPartnerBadge from '@/components/shared/DiscoveryPartnerBadge';
import PlaylistShortcutMenu from '@/components/pwa/PlaylistShortcutMenu';

function DiscoveryPartnerBadgeByUserId({ userId }) {
  const { data: partners = [] } = useQuery({
    queryKey: ['dp-by-user', userId],
    queryFn: () => base44.entities.DiscoveryPartner.filter({ user_id: userId }),
    enabled: !!userId,
  });
  if (!partners[0]) return null;
  return <DiscoveryPartnerBadge partner={partners[0]} />;
}

const typeConfig = {
  fan: { label: 'Fan Playlist', color: 'purple', icon: Headphones },
  artist: { label: 'Artist Playlist', color: 'cyan', icon: Music },
  community: { label: 'Community Playlist', color: 'magenta', icon: Users },
  network: { label: 'Network Playlist', color: 'turquoise', icon: Radio },
};

export default function Playlists() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: playlists = [] } = useQuery({
    queryKey: ['all-playlists'],
    queryFn: () => base44.entities.Playlist.list('-follower_count', 50),
  });

  const followMutation = useMutation({
    mutationFn: (playlist) => base44.entities.Playlist.update(playlist.id, {
      follower_count: (playlist.follower_count || 0) + 1,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-playlists'] }),
  });

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold">Playlists</h1>
          <Button className="bg-gradient-neon text-white text-xs h-9 px-4" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Living playlists that evolve with fan votes, artist picks, and community activity
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(playlist => {
            const config = typeConfig[playlist.type] || typeConfig.fan;
            const Icon = config.icon;
            return (
              <GlassCard key={playlist.id} glow="purple" className="p-5 relative">
                <div className="absolute top-2.5 right-2.5 z-10">
                  <PlaylistShortcutMenu playlist={playlist} url={`${window.location.origin}/playlist/${playlist.id}`} />
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    {playlist.cover_image ? (
                      <img src={playlist.cover_image} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <NeonBadge color={config.color} className="mb-1.5">{config.label}</NeonBadge>
                    <h3 className="font-semibold text-sm truncate">{playlist.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{playlist.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{playlist.song_ids?.length || 0} songs</span>
                      <span>{playlist.follower_count || 0} followers</span>
                      {playlist.is_living && (
                        <span className="text-neon-turquoise flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-turquoise animate-pulse" />
                          Living
                        </span>
                      )}
                    </div>
                    {playlist.owner_user_id && playlist.type === 'community' && (
                      <div className="mt-2">
                        <DiscoveryPartnerBadgeByUserId userId={playlist.owner_user_id} />
                      </div>
                    )}
                    <Button size="sm" variant="outline"
                      className="mt-3 w-full text-xs h-7 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
                      onClick={(e) => { e.stopPropagation(); followMutation.mutate(playlist); }}>
                      <UserPlus className="w-3 h-3 mr-1" /> Follow
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {playlists.length === 0 && (
          <GlassCard hover={false} className="p-12 text-center">
            <Headphones className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-semibold mb-1">No Playlists Yet</h3>
            <p className="text-sm text-muted-foreground">Create the first playlist for the community.</p>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}