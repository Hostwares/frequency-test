import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { QrCode, ScanLine, CheckCircle2, XCircle, Users, UserCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function EventCheckIn({ event, currentUser }) {
  const qc = useQueryClient();
  const [scanInput, setScanInput] = useState('');
  const [lastResult, setLastResult] = useState(null);

  // Only event creators or community managers can check people in
  const canCheckIn = event.artist_profile_id || event.community_id;

  const { data: rsvps = [] } = useQuery({
    queryKey: ['event-rsvps', event.id],
    queryFn: () => base44.entities.EventRSVP.filter({
      event_id: event.id,
      status: { $ne: 'not_going' }
    }, 'created_date', 500),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['event-checkins', event.id],
    queryFn: () => base44.entities.EventCheckIn.filter({ event_id: event.id }, '-checked_in_at', 100),
  });

  const checkedInIds = new Set(checkIns.map(c => c.user_id));

  const performCheckIn = useMutation({
    mutationFn: async ({ rsvp, method = 'qr_scan' }) => {
      // Create check-in record
      await base44.entities.EventCheckIn.create({
        event_id: event.id,
        event_title: event.title,
        user_id: rsvp.user_id,
        user_name: rsvp.user_name,
        rsvp_id: rsvp.id,
        check_in_method: method,
        checked_in_at: new Date().toISOString(),
        verified_by: currentUser.id,
        verified_by_name: currentUser.full_name || currentUser.email,
        party_size: rsvp.party_size || 1,
        seat_number: rsvp.seat_number,
        is_valid: !checkedInIds.has(rsvp.user_id),
      });
      // Mark RSVP as checked in
      return base44.entities.EventRSVP.update(rsvp.id, {
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: currentUser.id,
      });
    },
    onSuccess: (data, vars) => {
      setLastResult({
        success: !checkedInIds.has(vars.rsvp.user_id),
        name: vars.rsvp.user_name,
        party: vars.rsvp.party_size || 1,
        seat: vars.rsvp.seat_number,
      });
      setScanInput('');
      qc.invalidateQueries({ queryKey: ['event-rsvps', event.id] });
      qc.invalidateQueries({ queryKey: ['event-checkins', event.id] });
    },
  });

  const handleScan = () => {
    if (!scanInput.trim()) return;
    try {
      const parsed = JSON.parse(scanInput);
      const rsvp = rsvps.find(r => r.user_id === parsed.user_id && r.qr_code_hash === parsed.hash);
      if (rsvp) {
        performCheckIn.mutate({ rsvp, method: 'qr_scan' });
      } else {
        setLastResult({ success: false, name: parsed.name || 'Unknown', error: 'Invalid QR code or RSVP not found' });
        setScanInput('');
      }
    } catch {
      // Try matching by name
      const rsvp = rsvps.find(r => r.user_name.toLowerCase().includes(scanInput.toLowerCase()));
      if (rsvp) {
        performCheckIn.mutate({ rsvp, method: 'manual' });
      } else {
        setLastResult({ success: false, name: scanInput, error: 'No RSVP found' });
        setScanInput('');
      }
    }
  };

  const manualCheckIn = (rsvp) => {
    performCheckIn.mutate({ rsvp, method: 'manual' });
  };

  const going = rsvps.filter(r => r.status === 'going');
  const checkedInCount = going.filter(r => r.checked_in).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover={false} className="p-3 text-center">
          <Users className="w-4 h-4 mx-auto mb-1 text-neon-cyan" />
          <p className="text-lg font-bold text-neon-cyan">{going.length}</p>
          <p className="text-[10px] text-muted-foreground">RSVP'd</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <UserCheck className="w-4 h-4 mx-auto mb-1 text-neon-turquoise" />
          <p className="text-lg font-bold text-neon-turquoise">{checkedInCount}</p>
          <p className="text-[10px] text-muted-foreground">Checked In</p>
        </GlassCard>
        <GlassCard hover={false} className="p-3 text-center">
          <ScanLine className="w-4 h-4 mx-auto mb-1 text-neon-purple" />
          <p className="text-lg font-bold text-neon-purple">{going.length - checkedInCount}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </GlassCard>
      </div>

      {/* Scan Input */}
      <GlassCard hover={false} className="p-4 border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <QrCode className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">Check-In Scanner</h4>
        </div>
        <div className="flex gap-2">
          <Input
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder="Scan QR or type name..."
            className="flex-1"
          />
          <Button size="sm" onClick={handleScan} disabled={!scanInput.trim() || performCheckIn.isPending}>
            <ScanLine className="w-4 h-4" />
          </Button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${
            lastResult.success ? 'bg-neon-turquoise/10 border border-neon-turquoise/20' : 'bg-destructive/10 border border-destructive/20'
          }`}>
            {lastResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            <div className="text-xs">
              <p className={lastResult.success ? 'text-neon-turquoise' : 'text-destructive'}>
                {lastResult.success ? `${lastResult.name} checked in` : `${lastResult.name} — ${lastResult.error || 'Check-in failed'}`}
              </p>
              {lastResult.success && lastResult.party > 1 && <p className="text-muted-foreground">Party of {lastResult.party}</p>}
              {lastResult.success && lastResult.seat && <p className="text-muted-foreground">Seat: {lastResult.seat}</p>}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Manual Check-in List */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attendee List</h4>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {going.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No RSVPs yet.</p>
          ) : (
            going.map(rsvp => (
              <div key={rsvp.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-secondary/20 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  {rsvp.checked_in ? (
                    <CheckCircle2 className="w-4 h-4 text-neon-turquoise flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm truncate">{rsvp.user_name}</p>
                    <div className="flex items-center gap-2">
                      {rsvp.party_size > 1 && <span className="text-[10px] text-muted-foreground">Party of {rsvp.party_size}</span>}
                      {rsvp.seat_number && <NeonBadge color="purple" className="text-[9px]">Seat {rsvp.seat_section}-{rsvp.seat_row}{rsvp.seat_number}</NeonBadge>}
                    </div>
                  </div>
                </div>
                {!rsvp.checked_in && (
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0"
                    onClick={() => manualCheckIn(rsvp)} disabled={performCheckIn.isPending}>
                    Check In
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}