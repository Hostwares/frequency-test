import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ListMusic, Plus, Headphones, Clock, X } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RadioPlaylists({ programmerProfile }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: playlists = [] } = useQuery({
    queryKey: ['radio-playlists', programmerProfile?.id],
    queryFn: () => base44.entities.Playlist.filter({
      created_by_id: programmerProfile?.user_id,
    }, '-created_date', 50),
    enabled: !!programmerProfile?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Playlist.create({
        name: newName,
        description: newDescription,
        type: 'radio',
        is_public: false,
        song_ids: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-playlists'] });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-neon-purple" />
            Radio Playlists
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Station playlists & rotation blocks</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3 h-3 mr-1" /> New Playlist
        </Button>
      </div>

      {showCreate && (
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Create Playlist</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name (e.g. Morning Drive Rotation)"
          />
          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!newName || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Playlist'}
          </Button>
        </GlassCard>
      )}

      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playlists.map(pl => (
            <GlassCard key={pl.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-neon flex items-center justify-center flex-shrink-0">
                  <ListMusic className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{pl.name}</h3>
                  {pl.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{pl.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      {(pl.song_ids || []).length} tracks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(pl.created_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <NeonBadge color="purple">Radio</NeonBadge>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard hover={false} className="p-12 text-center">
          <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-purple" />
          <p className="text-sm text-muted-foreground">No playlists yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create rotation blocks and show playlists</p>
        </GlassCard>
      )}
    </div>
  );
}