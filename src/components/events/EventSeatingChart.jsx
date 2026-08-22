import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Armchair, Plus, X, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const SEAT_COLORS = {
  standard: 'border-border hover:border-primary/40 bg-secondary/30',
  vip: 'border-neon-purple/40 hover:border-neon-purple bg-neon-purple/10',
  premium: 'border-neon-magenta/40 hover:border-neon-magenta bg-neon-magenta/10',
  accessible: 'border-neon-cyan/40 hover:border-neon-cyan bg-neon-cyan/10',
  box: 'border-neon-turquoise/40 hover:border-neon-turquoise bg-neon-turquoise/10',
  standing: 'border-neon-blue/40 hover:border-neon-blue bg-neon-blue/10',
};

const SEAT_TYPE_LABELS = {
  standard: 'Standard',
  vip: 'VIP',
  premium: 'Premium',
  accessible: 'Accessible',
  box: 'Box',
  standing: 'Standing',
};

export default function EventSeatingChart({ event, currentUser }) {
  const qc = useQueryClient();
  const [showGenerator, setShowGenerator] = useState(false);
  const [genConfig, setGenConfig] = useState({
    sections: 'A,B',
    rowsPerSection: '5',
    seatsPerRow: '10',
    seatType: 'standard',
    price: '',
  });

  const { data: seats = [] } = useQuery({
    queryKey: ['event-seats', event.id],
    queryFn: () => base44.entities.EventSeat.filter({ event_id: event.id }, 'section', 500),
  });

  // Group seats by section
  const sections = {};
  seats.forEach(s => {
    if (!sections[s.section]) sections[s.section] = [];
    sections[s.section].push(s);
  });

  const generateSeats = useMutation({
    mutationFn: async () => {
      const sectionList = genConfig.sections.split(',').map(s => s.trim()).filter(Boolean);
      const rows = parseInt(genConfig.rowsPerSection) || 5;
      const seatsPerRow = parseInt(genConfig.seatsPerRow) || 10;
      const seatType = genConfig.seatType;
      const price = genConfig.price ? parseFloat(genConfig.price) : (event.ticket_price || 0);

      const newSeats = [];
      sectionList.forEach(section => {
        for (let r = 0; r < rows; r++) {
          const rowLabel = String.fromCharCode(65 + r); // A, B, C...
          for (let s = 1; s <= seatsPerRow; s++) {
            newSeats.push({
              event_id: event.id,
              section,
              row: rowLabel,
              seat_number: String(s),
              seat_label: `${section}-${rowLabel}${s}`,
              seat_type: seatType,
              price,
              is_available: true,
              is_accessible: seatType === 'accessible',
            });
          }
        }
      });
      return base44.entities.EventSeat.bulkCreate(newSeats);
    },
    onSuccess: () => {
      setShowGenerator(false);
      qc.invalidateQueries({ queryKey: ['event-seats', event.id] });
    },
  });

  const reserveSeat = useMutation({
    mutationFn: ({ seat, action }) => {
      if (action === 'reserve') {
        return base44.entities.EventSeat.update(seat.id, {
          is_reserved: true,
          is_available: false,
          reserved_by_user_id: currentUser.id,
          reserved_by_name: currentUser.full_name || currentUser.email,
        });
      } else {
        return base44.entities.EventSeat.update(seat.id, {
          is_reserved: false,
          is_available: true,
          reserved_by_user_id: undefined,
          reserved_by_name: undefined,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-seats', event.id] }),
  });

  const availableCount = seats.filter(s => s.is_available).length;
  const reservedCount = seats.filter(s => s.is_reserved).length;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3">
          <NeonBadge color="cyan">{availableCount} Available</NeonBadge>
          <NeonBadge color="magenta">{reservedCount} Reserved</NeonBadge>
          <NeonBadge color="purple">{seats.length} Total</NeonBadge>
        </div>
        {showGenerator && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowGenerator(false)}>
            <X className="w-3 h-3" />Close
          </Button>
        )}
      </div>

      {/* Seat Generator (for event creators) */}
      {showGenerator ? (
        <GlassCard hover={false} className="p-4 space-y-3 border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Grid3x3 className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium">Generate Seating Chart</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={genConfig.sections} onChange={e => setGenConfig(c => ({ ...c, sections: e.target.value }))}
              placeholder="Sections (A,B,C)" />
            <Input type="number" value={genConfig.rowsPerSection} onChange={e => setGenConfig(c => ({ ...c, rowsPerSection: e.target.value }))}
              placeholder="Rows per section" />
            <Input type="number" value={genConfig.seatsPerRow} onChange={e => setGenConfig(c => ({ ...c, seatsPerRow: e.target.value }))}
              placeholder="Seats per row" />
            <Select value={genConfig.seatType} onValueChange={v => setGenConfig(c => ({ ...c, seatType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SEAT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input type="number" value={genConfig.price} onChange={e => setGenConfig(c => ({ ...c, price: e.target.value }))}
            placeholder={`Price per seat (default: $${event.ticket_price || 0})`} />
          <Button size="sm" onClick={() => generateSeats.mutate()} disabled={generateSeats.isPending}>
            <Plus className="w-3.5 h-3.5" />Generate Seats
          </Button>
        </GlassCard>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowGenerator(true)}>
          <Grid3x3 className="w-3.5 h-3.5" />Generate Seating Chart
        </Button>
      )}

      {/* Stage indicator */}
      {seats.length > 0 && (
        <div className="text-center">
          <div className="inline-block px-8 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium">
            ★ STAGE ★
          </div>
        </div>
      )}

      {/* Seating Map */}
      {Object.keys(sections).length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Armchair className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No seating chart yet. Generate one above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4 overflow-x-auto">
          {Object.entries(sections).map(([sectionName, sectionSeats]) => {
            const rows = {};
            sectionSeats.forEach(s => {
              if (!rows[s.row]) rows[s.row] = [];
              rows[s.row].push(s);
            });
            return (
              <div key={sectionName}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Section {sectionName}</h4>
                </div>
                <div className="space-y-1">
                  {Object.entries(rows).map(([rowName, rowSeats]) => (
                    <div key={rowName} className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground w-4 text-center">{rowName}</span>
                      <div className="flex gap-1 flex-wrap">
                        {rowSeats.sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number)).map(seat => (
                          <button
                            key={seat.id}
                            disabled={!currentUser}
                            onClick={() => reserveSeat.mutate({ seat, action: seat.is_reserved ? 'release' : 'reserve' })}
                            title={`${seat.seat_label} — $${seat.price} (${SEAT_TYPE_LABELS[seat.seat_type]})`}
                            className={`w-7 h-7 rounded border text-[9px] flex items-center justify-center transition-colors ${
                              seat.is_reserved
                                ? 'bg-destructive/20 border-destructive/40 text-destructive cursor-not-allowed'
                                : SEAT_COLORS[seat.seat_type] || SEAT_COLORS.standard
                            } ${!currentUser ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {seat.seat_number}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {seats.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(SEAT_TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded border ${SEAT_COLORS[type]}`} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border bg-destructive/20 border-destructive/40" />
            <span className="text-[10px] text-muted-foreground">Reserved</span>
          </div>
        </div>
      )}
    </div>
  );
}