import React from 'react';
import { X, QrCode, CheckCircle2, Calendar, MapPin, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { format, parseISO } from 'date-fns';

export default function EventQRCode({ rsvp, event, onClose }) {
  // Generate a QR code using a free QR API based on the rsvp hash
  const qrData = JSON.stringify({
    event_id: rsvp.event_id,
    user_id: rsvp.user_id,
    hash: rsvp.qr_code_hash,
    name: rsvp.user_name,
    party: rsvp.party_size || 1,
  });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

  let formattedDate = '';
  try { formattedDate = format(parseISO(event.date), 'EEEE, MMMM d, yyyy · h:mm a'); } catch { formattedDate = event.date; }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-neon-cyan" />
              <h3 className="font-display font-bold text-lg">Entry Pass</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-xl">
              <img src={qrUrl} alt="Entry QR Code" className="w-48 h-48" />
            </div>
          </div>

          {/* Status */}
          {rsvp.checked_in ? (
            <div className="flex items-center justify-center gap-2 mb-3 text-neon-turquoise">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Checked In</span>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground mb-3">
              Present this QR code at the entrance for check-in
            </p>
          )}

          {/* Event Details */}
          <div className="space-y-1.5 text-sm border-t border-border/30 pt-3">
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />{formattedDate}
            </p>
            {event.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />{event.location}
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />{rsvp.user_name} · Party of {rsvp.party_size || 1}
            </p>
            {rsvp.seat_number && (
              <NeonBadge color="purple" className="mt-1">Seat: {rsvp.seat_section}-{rsvp.seat_row}{rsvp.seat_number}</NeonBadge>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}