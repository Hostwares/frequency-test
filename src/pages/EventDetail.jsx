import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Ticket, Armchair, QrCode, Video, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import EventRSVPButton from '@/components/events/EventRSVPButton';
import EventCheckIn from '@/components/events/EventCheckIn';
import EventSeatingChart from '@/components/events/EventSeatingChart';
import EventLivestream from '@/components/events/EventLivestream';
import AddToCalendar from '@/components/shared/AddToCalendar';
import CalendarSync from '@/components/shared/CalendarSync';
import { format, parseISO } from 'date-fns';

const typeColors = {
  live_show: 'purple',
  virtual_show: 'cyan',
  listening_party: 'magenta',
  festival: 'turquoise',
  meetup: 'blue',
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('about');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => base44.entities.Event.filter({ id }),
    select: (data) => data[0],
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-48 bg-secondary/30 rounded-2xl animate-pulse mb-6" />
        <div className="h-6 w-48 bg-secondary/30 rounded animate-pulse mb-3" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/events')}>← Back to Events</Button>
      </div>
    );
  }

  let formattedDate = '';
  try { formattedDate = format(parseISO(event.date), 'EEEE, MMMM d, yyyy · h:mm a'); } catch { formattedDate = event.date; }

  const isManager = user && (event.artist_profile_id);

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        <button onClick={() => navigate('/events')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>

        {/* Hero */}
        <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden">
          <img src={event.cover_image || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80'}
            alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <NeonBadge color={typeColors[event.event_type] || 'purple'}>
                {event.event_type?.replace(/_/g, ' ')}
              </NeonBadge>
              {event.is_virtual && <NeonBadge color="cyan">Virtual</NeonBadge>}
              {event.is_free && <NeonBadge color="turquoise">Free</NeonBadge>}
              {event.stream_status === 'live' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[10px] font-bold text-red-400">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{event.title}</h1>
          </div>
        </div>

        {/* Event Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard hover={false} className="p-4 space-y-2">
            <p className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-neon-cyan" />{formattedDate}</p>
            {event.location && <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-neon-purple" />{event.location}</p>}
            <p className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-neon-turquoise" />
              {event.rsvp_count || event.attendee_count || 0} attending
              {event.max_capacity && ` / ${event.max_capacity} capacity`}
            </p>
          </GlassCard>
          <GlassCard hover={false} className="p-4 flex flex-col justify-center gap-2">
            {event.ticket_price > 0 ? (
              <p className="text-2xl font-bold text-neon-cyan">${event.ticket_price}</p>
            ) : (
              <p className="text-2xl font-bold text-neon-turquoise">Free Entry</p>
            )}
            <EventRSVPButton event={event} currentUser={user} />
            <div className="flex gap-2">
              <AddToCalendar event={event} />
              <CalendarSync event={event} />
            </div>
          </GlassCard>
        </div>

        {/* Livestream / Replay */}
        <EventLivestream event={event} />

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 overflow-x-auto">
          {[
            { id: 'about', label: 'About', icon: Calendar },
            { id: 'seating', label: 'Seating', icon: Armchair },
            { id: 'checkin', label: 'Check-In', icon: ScanLine },
          ].filter(t => t.id !== 'seating' || event.has_seating).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'about' && (
          <GlassCard hover={false} className="p-5">
            <h3 className="text-sm font-medium mb-2">About This Event</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {event.description || 'No description provided.'}
            </p>
          </GlassCard>
        )}

        {activeTab === 'seating' && event.has_seating && (
          <EventSeatingChart event={event} currentUser={user} />
        )}

        {activeTab === 'checkin' && (
          <EventCheckIn event={event} currentUser={user} />
        )}

      </motion.div>
    </div>
  );
}