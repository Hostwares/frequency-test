import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gauge, Plus, Calendar, Radio, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';

export default function SpinTracker({ programmerProfile }) {
  const [showLogForm, setShowLogForm] = useState(null);
  const queryClient = useQueryClient();

  const { data: rotationTracks = [] } = useQuery({
    queryKey: ['rotation-tracks', programmerProfile?.id],
    queryFn: () => base44.entities.RadioDownload.filter({
      programmer_id: programmerProfile?.id,
      activity_type: 'added_to_rotation'
    }, '-last_spin_date', 100),
    enabled: !!programmerProfile?.id,
  });

  const { data: spinReports = [] } = useQuery({
    queryKey: ['spin-reports', programmerProfile?.id],
    queryFn: () => base44.entities.AirplayReport.filter({
      radio_programmer_id: programmerProfile?.id,
      report_type: 'spin'
    }, '-created_date', 200),
    enabled: !!programmerProfile?.id,
  });

  const logSpinMutation = useMutation({
    mutationFn: async ({ track, spinCount, showName, notes }) => {
      await base44.entities.AirplayReport.create({
        radio_programmer_id: programmerProfile.id,
        station_name: programmerProfile.station_name,
        artist_profile_id: track.artist_profile_id,
        song_id: track.song_id,
        song_title: track.song_title,
        report_type: 'spin',
        rotation_status: track.radio_status,
        spin_count: spinCount,
        play_dates: [new Date().toISOString()],
        show_name: showName || '',
        notes: notes || '',
        is_private: true,
      });

      await base44.entities.RadioDownload.update(track.id, {
        spin_count: (track.spin_count || 0) + spinCount,
        last_spin_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['rotation-tracks'] });
      setShowLogForm(null);
    },
  });

  const totalSpins = spinReports.reduce((sum, r) => sum + (r.spin_count || 0), 0);
  const spinsThisWeek = spinReports.filter(r => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(r.created_date) > weekAgo;
  }).reduce((sum, r) => sum + (r.spin_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Gauge className="w-4 h-4 text-neon-magenta" />
            Spin Tracking
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Log and track airplay spins</p>
        </div>
      </div>

      {/* Spin Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover={false} className="p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-neon-cyan" />
          <p className="text-lg font-display font-bold text-neon-cyan">{totalSpins}</p>
          <p className="text-[10px] text-muted-foreground">Total Spins</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <Calendar className="w-4 h-4 mx-auto mb-1 text-neon-purple" />
          <p className="text-lg font-display font-bold text-neon-purple">{spinsThisWeek}</p>
          <p className="text-[10px] text-muted-foreground">This Week</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <Radio className="w-4 h-4 mx-auto mb-1 text-neon-magenta" />
          <p className="text-lg font-display font-bold text-neon-magenta">{rotationTracks.length}</p>
          <p className="text-[10px] text-muted-foreground">In Rotation</p>
        </GlassCard>
      </div>

      {/* Rotation Tracks with Spin Logging */}
      {rotationTracks.length > 0 ? (
        <div className="space-y-3">
          {rotationTracks.map(track => {
            const trackSpins = spinReports
              .filter(r => r.song_id === track.song_id)
              .reduce((sum, r) => sum + (r.spin_count || 0), 0);
            const isLogging = showLogForm === track.id;

            return (
              <GlassCard key={track.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{track.song_title}</h3>
                      <NeonBadge color="cyan">{track.artist_name}</NeonBadge>
                      <NeonBadge color="magenta">{track.radio_status?.replace(/_/g, ' ')}</NeonBadge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {trackSpins} spins logged
                      </span>
                      {track.last_spin_date && (
                        <span>Last spun: {new Date(track.last_spin_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isLogging ? 'ghost' : 'outline'}
                    onClick={() => setShowLogForm(isLogging ? null : track.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Log Spin
                  </Button>
                </div>

                {isLogging && (
                  <SpinLogForm
                    track={track}
                    onSubmit={(data) => logSpinMutation.mutate({ track, ...data })}
                    isLoading={logSpinMutation.isPending}
                  />
                )}
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard hover={false} className="p-12 text-center">
          <Gauge className="w-12 h-12 mx-auto mb-3 opacity-20 text-neon-magenta" />
          <p className="text-sm text-muted-foreground">No tracks in rotation yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add tracks to rotation from the Queue tab to start logging spins</p>
        </GlassCard>
      )}
    </div>
  );
}

function SpinLogForm({ track, onSubmit, isLoading }) {
  const [spinCount, setSpinCount] = useState(1);
  const [showName, setShowName] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="mt-4 p-3 bg-secondary/20 rounded-lg space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Spin Count</label>
          <input
            type="number"
            min="1"
            max="100"
            value={spinCount}
            onChange={(e) => setSpinCount(parseInt(e.target.value) || 1)}
            className="w-full px-2 py-1.5 rounded-md bg-secondary border border-border text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Show Name (optional)</label>
          <input
            type="text"
            value={showName}
            onChange={(e) => setShowName(e.target.value)}
            placeholder="Morning Drive, Afternoon Show..."
            className="w-full px-2 py-1.5 rounded-md bg-secondary border border-border text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Listener reaction, time slot, etc."
          className="w-full px-2 py-1.5 rounded-md bg-secondary border border-border text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => onSubmit({ spinCount, showName, notes })} disabled={isLoading}>
          {isLoading ? 'Logging...' : 'Log Spins'}
        </Button>
      </div>
    </div>
  );
}