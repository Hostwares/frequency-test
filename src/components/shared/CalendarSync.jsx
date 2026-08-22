import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CalendarPlus, CalendarCheck, ExternalLink, Loader2, LogIn } from 'lucide-react';

const CONNECTOR_ID = '6a36ebebc184d2dd233f7fb3';

/**
 * CalendarSync button — shown on each event card.
 * Handles: auth check → connect Google Calendar → sync event.
 */
export default function CalendarSync({ event }) {
  const [authed, setAuthed] = useState(null); // null = loading
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [calLink, setCalLink] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setAuthed);
  }, []);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setConnected(true);
      }
    }, 500);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncEventToCalendar', { event });
      if (res.data?.htmlLink) {
        setCalLink(res.data.htmlLink);
        setSynced(true);
      }
    } catch {
      // If call fails it likely means not connected yet — show connect flow
      setConnected(false);
    } finally {
      setSyncing(false);
    }
  };

  if (authed === null) return null;

  if (!authed) {
    return (
      <Button size="sm" variant="outline" onClick={() => base44.auth.redirectToLogin()}
        className="text-xs gap-1.5 border-border/40 text-muted-foreground">
        <LogIn className="w-3.5 h-3.5" /> Sign in to sync
      </Button>
    );
  }

  if (synced && calLink) {
    return (
      <a href={calLink} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="outline"
          className="text-xs gap-1.5 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10">
          <CalendarCheck className="w-3.5 h-3.5" />
          Added <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
        </Button>
      </a>
    );
  }

  if (!connected) {
    return (
      <Button size="sm" variant="outline" onClick={handleConnect}
        className="text-xs gap-1.5 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10">
        <CalendarPlus className="w-3.5 h-3.5" /> Connect Calendar
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}
      className="text-xs gap-1.5 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10">
      {syncing
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <CalendarPlus className="w-3.5 h-3.5" />}
      {syncing ? 'Syncing…' : 'Add to Calendar'}
    </Button>
  );
}