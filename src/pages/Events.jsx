import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Ticket, Video, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import HeroBannerCarousel from '@/components/hero/HeroBannerCarousel';

const typeColors = {
  live_show: 'purple',
  virtual_show: 'cyan',
  listening_party: 'magenta',
  festival: 'turquoise',
  meetup: 'blue',
};

export default function Events() {
  const navigate = useNavigate();
  const { data: events = [] } = useQuery({
    queryKey: ['all-events'],
    queryFn: () => base44.entities.Event.list('date', 50),
  });

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <HeroBannerCarousel />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">Events</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Shows, listening parties, and Frequency festivals
        </p>

        <div className="space-y-4">
          {events.map(event => (
            <GlassCard key={event.id} className="p-5 flex flex-col md:flex-row gap-5 cursor-pointer"
              onClick={() => navigate(`/event/${event.id}`)}>
              <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={event.cover_image || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80'}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <NeonBadge color={typeColors[event.event_type] || 'purple'}>
                    {event.event_type?.replace(/_/g, ' ')}
                  </NeonBadge>
                  {event.is_virtual && <NeonBadge color="cyan">Virtual</NeonBadge>}
                  {event.stream_status === 'live' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[10px] font-bold text-red-400">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE
                    </span>
                  )}
                  {event.stream_status === 'replay_available' && (
                    <NeonBadge color="turquoise"><PlayCircle className="w-2.5 h-2.5 mr-0.5 inline" />Replay</NeonBadge>
                  )}
                </div>
                <h3 className="text-lg font-display font-semibold truncate">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{event.location}
                    </span>
                  )}
                  {event.attendee_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />{event.attendee_count} attending
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {event.ticket_price > 0 ? (
                  <p className="text-xl font-bold text-neon-cyan">${event.ticket_price}</p>
                ) : (
                  <p className="text-sm font-semibold text-neon-turquoise">Free</p>
                )}
                <Button className="bg-gradient-neon hover:opacity-90 text-white text-sm px-5"
                  onClick={() => navigate(`/event/${event.id}`)}>
                  <Ticket className="w-4 h-4 mr-1" /> View Details
                </Button>
              </div>
            </GlassCard>
          ))}

          {events.length === 0 && (
            <GlassCard hover={false} className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display font-semibold mb-1">No Events Yet</h3>
              <p className="text-sm text-muted-foreground">Events will appear here as artists and communities create them.</p>
            </GlassCard>
          )}
        </div>
      </motion.div>
    </div>
  );
}