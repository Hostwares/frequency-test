import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Calendar, Plus, MapPin, Video, Ticket, Users, Trash2, Pencil, Clock, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EVENT_TYPES = [
  { value: 'live_show', label: 'Live Show' },
  { value: 'virtual_show', label: 'Virtual Show' },
  { value: 'listening_party', label: 'Listening Party' },
  { value: 'festival', label: 'Festival' },
  { value: 'meetup', label: 'Meetup' },
];

const emptyForm = {
  title: '', event_type: 'live_show', date: '', location: '',
  is_virtual: false, ticket_price: 0, max_capacity: 0, description: '', cover_image: ''
};

export default function ArtistEventManager({ artistProfile }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: events = [] } = useQuery({
    queryKey: ['artist-events', artistProfile?.id],
    queryFn: () => base44.entities.Event.filter({ artist_profile_id: artistProfile?.id }, 'date'),
    enabled: !!artistProfile?.id,
  });

  const now = new Date();
  const upcoming = events.filter(e => e.date && new Date(e.date) >= now);
  const past = events.filter(e => e.date && new Date(e.date) < now);
  const totalAttendees = events.reduce((sum, e) => sum + (e.attendee_count || 0), 0);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-events'] });
      toast.success('Event created');
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to create event'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-events'] });
      toast.success('Event updated');
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to update event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-events'] });
      toast.success('Event deleted');
    },
    onError: () => toast.error('Failed to delete event'),
  });

  const handleSubmit = () => {
    if (!form.title || !form.date) {
      toast.error('Title and date are required');
      return;
    }
    const payload = {
      ...form,
      artist_profile_id: artistProfile.id,
      ticket_price: Number(form.ticket_price) || 0,
      max_capacity: Number(form.max_capacity) || 0,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (event) => {
    setEditing(event);
    setForm({
      title: event.title || '',
      event_type: event.event_type || 'live_show',
      date: event.date ? event.date.slice(0, 16) : '',
      location: event.location || '',
      is_virtual: event.is_virtual || false,
      ticket_price: event.ticket_price || 0,
      max_capacity: event.max_capacity || 0,
      description: event.description || '',
      cover_image: event.cover_image || '',
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard hover={false} className="p-4 text-center">
          <Calendar className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="text-xl font-bold">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Users className="w-5 h-5 text-neon-purple mx-auto mb-2" />
          <p className="text-xl font-bold">{totalAttendees}</p>
          <p className="text-xs text-muted-foreground">Total Attendees</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Clock className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
          <p className="text-xl font-bold">{past.length}</p>
          <p className="text-xs text-muted-foreground">Past Events</p>
        </GlassCard>
      </div>

      {/* Create button */}
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2 bg-gradient-neon">
          <Plus className="w-4 h-4" />
          Create Event
        </Button>
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="font-display font-semibold text-sm mb-4">Upcoming Events</h3>
        {upcoming.length === 0 ? (
          <GlassCard hover={false} className="p-8 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event, i) => (
              <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={() => deleteMutation.mutate(event.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {past.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-sm mb-4">Past Events</h3>
          <div className="space-y-3">
            {past.slice(0, 10).map((event) => (
              <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={() => deleteMutation.mutate(event.id)} past />
            ))}
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-xs">Event Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Summer Tour NYC" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date & Time *</Label>
                <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue, City, State" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_virtual} onCheckedChange={v => setForm(f => ({ ...f, is_virtual: v }))} />
              <Label className="text-xs cursor-pointer">Virtual Event</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ticket Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.ticket_price} onChange={e => setForm(f => ({ ...f, ticket_price: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Max Capacity</Label>
                <Input type="number" min="0" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, onEdit, onDelete, past }) {
  const eventDate = event.date ? new Date(event.date) : null;
  const typeLabel = EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type;

  return (
    <GlassCard hover={false} className={`p-4 ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {eventDate && (
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-secondary/40 border border-border/40 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">{format(eventDate, 'MMM').toUpperCase()}</span>
            <span className="text-lg font-bold">{format(eventDate, 'd')}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{event.title}</h4>
            <NeonBadge color={event.is_virtual ? 'magenta' : 'cyan'}>{typeLabel}</NeonBadge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {eventDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(eventDate, 'MMM d, yyyy h:mm a')}</span>}
            {event.location && <span className="flex items-center gap-1">{event.is_virtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{event.location}</span>}
            {event.ticket_price > 0 && <span className="flex items-center gap-1"><Ticket className="w-3 h-3" />${event.ticket_price}</span>}
            {event.attendee_count > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.attendee_count} attending</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(event)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}