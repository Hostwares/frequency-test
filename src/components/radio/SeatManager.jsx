import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, UserPlus, UserMinus, Radio, Loader2, Mail, Shield } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const ROLE_LABELS = {
  music_director: 'Music Director',
  program_director: 'Program Director',
  specialty_show_host: 'Specialty Show Host',
  on_air_personality: 'On-Air Personality',
  station_manager: 'Station Manager',
  independent_curator: 'Independent Curator',
};

export default function SeatManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['station-seats'],
    queryFn: () => base44.functions.invoke('manageStationSeats', { action: 'list' }),
  });

  const station = data?.station;
  const seats = data?.seats || [];

  const addMutation = useMutation({
    mutationFn: (identifier) =>
      base44.functions.invoke('manageStationSeats', { action: 'add', identifier }),
    onSuccess: (res) => {
      toast({ title: 'Seat added', description: res?.message || 'Account holder added to your station.' });
      setEmail('');
      qc.invalidateQueries({ queryKey: ['station-seats'] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'Could not add that account.';
      toast({ title: 'Could not add seat', description: msg, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (programmerId) =>
      base44.functions.invoke('manageStationSeats', { action: 'remove', programmerId }),
    onSuccess: (res) => {
      toast({ title: 'Seat removed', description: res?.message || 'Account holder removed.' });
      qc.invalidateQueries({ queryKey: ['station-seats'] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'Could not remove that seat.';
      toast({ title: 'Could not remove seat', description: msg, variant: 'destructive' });
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    addMutation.mutate(email.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-neon-cyan/10">
            <Users className="w-5 h-5 text-neon-cyan" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold">Programmer Seats</h2>
            <p className="text-xs text-muted-foreground">
              {station?.name || 'Your station'} · {seats.length} {seats.length === 1 ? 'seat' : 'seats'} assigned
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Add seat */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-neon-purple" />
          Add a Radio Account Holder
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Enter the email of an existing radio account holder on Frequency to assign them as a programmer seat on your station.
        </p>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="programmer@email.com"
              className="pl-9"
              required
            />
          </div>
          <Button type="submit" disabled={addMutation.isPending || !email.trim()}>
            {addMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Add Seat
          </Button>
        </form>
      </GlassCard>

      {/* Seat list */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-display font-semibold mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4 text-neon-cyan" />
          Current Seats
        </h3>

        {seats.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20 text-neon-cyan" />
            <p className="text-sm text-muted-foreground">No seats assigned yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add a radio account holder above to build your team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seats.map((seat, i) => (
              <motion.div
                key={seat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-cyan/20 flex items-center justify-center shrink-0">
                    <Radio className="w-4 h-4 text-neon-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{seat.name}</p>
                      {seat.is_owner && <NeonBadge color="purple">Owner</NeonBadge>}
                      {seat.is_verified && (
                        <NeonBadge color="cyan">
                          <Shield className="w-3 h-3 mr-1" /> Verified
                        </NeonBadge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {seat.email || 'No email'} · {ROLE_LABELS[seat.role] || 'Programmer'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive shrink-0"
                  disabled={removeMutation.isPending || seat.is_owner}
                  onClick={() => removeMutation.mutate(seat.id)}
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}