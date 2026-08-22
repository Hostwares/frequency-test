import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Search, Megaphone, CheckCircle2, Circle, Music,
  Calendar, Send, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function PitchReadyManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('artists');
  const [artistSearch, setArtistSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [notesMap, setNotesMap] = useState({});
  const [sending, setSending] = useState(null);

  const { data: artists = [], isLoading: loadingArtists } = useQuery({
    queryKey: ['pitch-artists'],
    queryFn: () => base44.entities.ArtistProfile.list('-pitch_ready_date', 50),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['pitch-events'],
    queryFn: () => base44.entities.Event.list('-pitch_ready_date', 50),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ entity, type, newValue }) => {
      const entityName = type === 'artist' ? 'ArtistProfile' : 'Event';
      const updates = {
        pitch_ready: newValue,
        pitch_ready_date: newValue ? new Date().toISOString() : null,
        pitch_alert_sent: false,
      };
      if (notesMap[entity.id] !== undefined) {
        updates.pitch_notes = notesMap[entity.id];
      }
      return base44.entities[entityName].update(entity.id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pitch-artists'] });
      qc.invalidateQueries({ queryKey: ['pitch-events'] });
    },
  });

  const sendAlertMutation = useMutation({
    mutationFn: async ({ entity, type }) => {
      return base44.functions.invoke('sendPitchReadyAlert', {
        entity_type: type,
        entity_id: entity.id,
        entity_name: type === 'artist' ? entity.artist_name : entity.title,
        pitch_notes: entity.pitch_notes || notesMap[entity.id] || '',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pitch-artists'] });
      qc.invalidateQueries({ queryKey: ['pitch-events'] });
      setSending(null);
    },
    onError: () => setSending(null),
  });

  const filteredArtists = artistSearch.trim()
    ? artists.filter(a => a.artist_name?.toLowerCase().includes(artistSearch.toLowerCase()))
    : artists;

  const filteredEvents = eventSearch.trim()
    ? events.filter(e => e.title?.toLowerCase().includes(eventSearch.toLowerCase()))
    : events;

  const pitchReadyArtists = filteredArtists.filter(a => a.pitch_ready);
  const pitchReadyEvents = filteredEvents.filter(e => e.pitch_ready);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard hover={false} className="p-4 text-center">
          <Music className="w-4 h-4 text-neon-purple mx-auto mb-1" />
          <p className="text-lg font-bold text-neon-purple">{pitchReadyArtists.length}</p>
          <p className="text-[10px] text-muted-foreground">Artists Pitch Ready</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 text-center">
          <Calendar className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
          <p className="text-lg font-bold text-neon-cyan">{pitchReadyEvents.length}</p>
          <p className="text-[10px] text-muted-foreground">Events Pitch Ready</p>
        </GlassCard>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <Megaphone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Marking an artist or event as <strong className="text-foreground">Pitch Ready</strong> automatically triggers
          an email alert to all registered journalists via Gmail, inviting them to cover the story in the Editorial Portal.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('artists')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'artists' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Music className="w-3.5 h-3.5" /> Artists
        </button>
        <button
          onClick={() => setTab('events')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'events' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Events
        </button>
      </div>

      {/* Artists Tab */}
      {tab === 'artists' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search artists..."
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-secondary/50"
            />
          </div>

          {loadingArtists ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : filteredArtists.length === 0 ? (
            <GlassCard hover={false} className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No artists found.</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {filteredArtists.map(artist => (
                <PitchReadyRow
                  key={artist.id}
                  entity={artist}
                  type="artist"
                  name={artist.artist_name}
                  subtitle={artist.genre}
                  image={artist.profile_image}
                  notesValue={notesMap[artist.id] !== undefined ? notesMap[artist.id] : (artist.pitch_notes || '')}
                  onNotesChange={(val) => setNotesMap(prev => ({ ...prev, [artist.id]: val }))}
                  onToggle={(newValue) => toggleMutation.mutate({ entity: artist, type: 'artist', newValue })}
                  onSendAlert={() => {
                    setSending(artist.id);
                    sendAlertMutation.mutate({ entity: artist, type: 'artist' });
                  }}
                  isSending={sending === artist.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-secondary/50"
            />
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : filteredEvents.length === 0 ? (
            <GlassCard hover={false} className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No events found.</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map(event => (
                <PitchReadyRow
                  key={event.id}
                  entity={event}
                  type="event"
                  name={event.title}
                  subtitle={event.event_type?.replace(/_/g, ' ')}
                  image={event.cover_image}
                  dateStr={event.date}
                  notesValue={notesMap[event.id] !== undefined ? notesMap[event.id] : (event.pitch_notes || '')}
                  onNotesChange={(val) => setNotesMap(prev => ({ ...prev, [event.id]: val }))}
                  onToggle={(newValue) => toggleMutation.mutate({ entity: event, type: 'event', newValue })}
                  onSendAlert={() => {
                    setSending(event.id);
                    sendAlertMutation.mutate({ entity: event, type: 'event' });
                  }}
                  isSending={sending === event.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PitchReadyRow({ entity, type, name, subtitle, image, dateStr, notesValue, onNotesChange, onToggle, onSendAlert, isSending }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-start gap-3">
        {/* Image */}
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/30">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {type === 'artist' ? <Music className="w-4 h-4 text-muted-foreground/30" /> : <Calendar className="w-4 h-4 text-muted-foreground/30" />}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h4 className="text-sm font-display font-semibold truncate">{name}</h4>
            {entity.pitch_ready && (
              <NeonBadge color={entity.pitch_alert_sent ? "turquoise" : "purple"}>
                {entity.pitch_alert_sent ? 'Alert Sent' : 'Pitch Ready'}
              </NeonBadge>
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {subtitle}
            {dateStr && ` · ${new Date(dateStr).toLocaleDateString()}`}
          </p>

          {/* Notes */}
          {showNotes && entity.pitch_ready && (
            <div className="mt-2">
              <Textarea
                placeholder="Add editorial notes for journalists..."
                value={notesValue}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs mt-1"
                onClick={() => onToggle(true)}
              >
                Save Notes
              </Button>
            </div>
          )}

          {entity.pitch_ready && entity.pitch_notes && !showNotes && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{entity.pitch_notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {entity.pitch_ready ? (
            <>
              {!entity.pitch_alert_sent && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-gradient-neon hover:opacity-90 text-white"
                  onClick={onSendAlert}
                  disabled={isSending}
                >
                  {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Send Alert
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setShowNotes(!showNotes)}
              >
                {showNotes ? <X className="w-3 h-3" /> : <Megaphone className="w-3 h-3" />}
                {showNotes ? 'Close' : 'Notes'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                onClick={() => onToggle(false)}
              >
                <Circle className="w-3 h-3" /> Unmark
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
              onClick={() => onToggle(true)}
            >
              <CheckCircle2 className="w-3 h-3" /> Mark Pitch Ready
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}