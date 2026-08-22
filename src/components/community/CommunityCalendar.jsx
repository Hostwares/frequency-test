import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Calendar, Plus, MapPin, Clock, X, MessageSquare, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import CommunityChat from './CommunityChat';
import { format, parseISO } from 'date-fns';

const EVENT_TYPES = {
  meetup: { label: 'Meetup', color: 'cyan' },
  listening_party: { label: 'Listening Party', color: 'purple' },
  virtual_show: { label: 'Virtual Show', color: 'magenta' },
  live_show: { label: 'Live Show', color: 'blue' },
  festival: { label: 'Festival', color: 'turquoise' },
  qna: { label: 'Q&A Session', color: 'cyan' },
};

export default function CommunityCalendar({ community, currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [discussEvent, setDiscussEvent] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'meetup', date: '', location: '', is_virtual: false, cover_image: '',
  });

  const { data: events = [] } = useQuery({
    queryKey: ['community-events', community.id],
    queryFn: () => base44.entities.Event.filter({ community_id: community.id }, 'date', 50),
  });

  const createEvent = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      setShowForm(false);
      setForm({ title: '', description: '', event_type: 'meetup', date: '', location: '', is_virtual: false, cover_image: '' });
      qc.invalidateQueries({ queryKey: ['community-events', community.id] });
    },
  });

  const handleCreate = () => {
    if (!form.title.trim() || !form.date) return;
    createEvent.mutate({
      ...form,
      community_id: community.id,
      event_type: form.event_type,
      is_virtual: form.is_virtual,
    });
  };

  const upcoming = events.filter(e => new Date(e.date) >= new Date());
  const past = events.filter(e => new Date(e.date) < new Date()).reverse();

  const EventCard = ({ event }) => {
    const typeInfo = EVENT_TYPES[event.event_type] || EVENT_TYPES.meetup;
    let formattedDate;
    try { formattedDate = format(parseISO(event.date), 'EEE, MMM d · h:mm a'); } catch { formattedDate = event.date; }

    return (
      <GlassCard className="p-4 overflow-hidden">
        <div className="flex gap-3">
          {event.cover_image && (
            <img src={event.cover_image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <NeonBadge color={typeInfo.color}>{typeInfo.label}</NeonBadge>
              {event.is_virtual && <NeonBadge color="blue"><Video className="w-2.5 h-2.5 mr-0.5" />Virtual</NeonBadge>}
            </div>
            <h4 className="font-medium text-sm truncate">{event.title}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formattedDate}</span>
              {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{event.location}</span>}
            </div>
            {event.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Users className="w-3 h-3" />{event.attendee_count || 0} attending</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => setDiscussEvent(event)}>
                <MessageSquare className="w-3 h-3" />Discuss
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  };

  if (discussEvent) {
    return (
      <div className="space-y-3">
        <button onClick={() => setDiscussEvent(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <X className="w-4 h-4" />Back to calendar
        </button>
        <GlassCard hover={false} className="p-4">
          <h3 className="font-display font-bold text-lg mb-1">{discussEvent.title}</h3>
          <p className="text-xs text-muted-foreground mb-3">Event discussion</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <CommunityChat community={community} eventId={discussEvent.id} currentUser={currentUser} />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentUser && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />Add Event</>}
          </Button>
        </div>
      )}

      {showForm && (
        <GlassCard hover={false} className="p-4 space-y-3 border-primary/20">
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location or stream URL" />
          <Input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="Cover image URL (optional)" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_virtual} onChange={e => setForm(f => ({ ...f, is_virtual: e.target.checked }))} className="rounded" />
            Virtual event
          </label>
          <Button size="sm" onClick={handleCreate} disabled={!form.title.trim() || !form.date || createEvent.isPending}>
            Create Event
          </Button>
        </GlassCard>
      )}

      {upcoming.length === 0 && !showForm ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming events. Plan the next community gathering!</p>
        </GlassCard>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</h3>
              <div className="space-y-2">{upcoming.map(e => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Past Events</h3>
              <div className="space-y-2 opacity-60">{past.slice(0, 5).map(e => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}