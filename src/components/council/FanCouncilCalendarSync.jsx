import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarCheck, ExternalLink, Loader2, LogIn } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

const CONNECTOR_ID = '6a36ebebc184d2dd233f7fb3';

/**
 * FanCouncilCalendarSync — allows artists and fans to connect their Google Calendar
 * to receive automated reminders for Fan Council meetings.
 */
export default function FanCouncilCalendarSync() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const connection = await base44.connectors.getAppUserConnection(CONNECTOR_ID);
      setConnected(!!connection);
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        checkConnection();
      }
    }, 500);
  };

  if (checking) {
    return (
      <GlassCard className="p-4 mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking calendar connection...
        </div>
      </GlassCard>
    );
  }

  if (connected) {
    return (
      <GlassCard className="p-4 mt-4 bg-neon-cyan/5 border-neon-cyan/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-neon-cyan" />
            <div>
              <p className="text-sm font-semibold text-neon-cyan">Calendar Connected</p>
              <p className="text-xs text-muted-foreground">You'll receive meeting reminders automatically</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleConnect}
            className="text-xs gap-1.5 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10">
            <ExternalLink className="w-3 h-3" />
            Reconnect
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 mt-4 bg-neon-purple/5 border-neon-purple/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neon-purple" />
          <div>
            <p className="text-sm font-semibold text-neon-purple">Connect Your Calendar</p>
            <p className="text-xs text-muted-foreground">Get automated reminders for council meetings</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleConnect}
          className="text-xs gap-1.5 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10">
          <Calendar className="w-3 h-3" />
          Connect
        </Button>
      </div>
    </GlassCard>
  );
}