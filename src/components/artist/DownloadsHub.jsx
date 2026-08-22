import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Download, Users, Music, Calendar, DollarSign, ShoppingBag, FileSpreadsheet, Loader2
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DownloadsHub({ artistProfile, user, supporters = [] }) {
  const [downloading, setDownloading] = useState(null);

  const { data: songs = [] } = useQuery({
    queryKey: ['dl-songs', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['dl-events', artistProfile?.id],
    queryFn: () => base44.entities.Event.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const { data: merch = [] } = useQuery({
    queryKey: ['dl-merch', artistProfile?.id],
    queryFn: () => base44.entities.Product.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['dl-payouts', artistProfile?.id],
    queryFn: () => base44.entities.ArtistPayout.filter({ artist_profile_id: artistProfile?.id }, '-created_date', 500),
    enabled: !!artistProfile?.id,
  });

  const supporterUserIds = [...new Set(supporters.map(s => s.fan_user_id).filter(Boolean))];
  const { data: supporterUsers = [] } = useQuery({
    queryKey: ['dl-supporter-users', supporterUserIds.join(',')],
    queryFn: () => base44.entities.User.list(),
    enabled: supporterUserIds.length > 0,
    select: (users) => users.filter(u => supporterUserIds.includes(u.id)),
  });

  const exportSupporters = () => {
    if (supporters.length === 0) { toast.error('No supporters to export'); return; }
    setDownloading('supporters');
    const userMap = Object.fromEntries(supporterUsers.map(u => [u.id, u]));
    const rows = [['Fan Name', 'Email', 'Location', 'Tier', 'Monthly Support ($)', 'Support Since', 'Days as Supporter']];
    supporters.forEach(s => {
      const u = userMap[s.fan_user_id] || {};
      const d = s.created_date ? new Date(s.created_date) : null;
      rows.push([
        u.full_name || 'Anonymous Fan', u.email || '', u.location || 'Not specified',
        s.tier || 'basic', s.amount || 0,
        d ? d.toLocaleDateString() : '',
        d ? Math.floor((new Date() - d) / (1000 * 60 * 60 * 24)) : 0,
      ]);
    });
    downloadCSV(`${artistProfile.artist_name?.replace(/\s+/g, '-')}-supporters-${new Date().toISOString().split('T')[0]}.csv`, rows);
    toast.success(`Exported ${supporters.length} supporters`);
    setDownloading(null);
  };

  const exportSongs = () => {
    if (songs.length === 0) { toast.error('No songs to export'); return; }
    setDownloading('songs');
    const rows = [['Title', 'Genre', 'Release Date', 'Play Count', 'Support Count', 'Duration (sec)', 'ISRC', 'Explicit', 'AI Disclosure']];
    songs.forEach(s => {
      rows.push([
        s.title, s.genre || '', s.release_date || '', s.play_count || 0, s.support_count || 0,
        s.duration_seconds || '', s.isrc || '', s.explicit_flag ? 'Yes' : 'No', s.ai_disclosure || '',
      ]);
    });
    downloadCSV(`${artistProfile.artist_name?.replace(/\s+/g, '-')}-songs-${new Date().toISOString().split('T')[0]}.csv`, rows);
    toast.success(`Exported ${songs.length} songs`);
    setDownloading(null);
  };

  const exportEvents = () => {
    if (events.length === 0) { toast.error('No events to export'); return; }
    setDownloading('events');
    const rows = [['Title', 'Type', 'Date', 'Location', 'Virtual', 'Ticket Price', 'Attendees', 'Max Capacity']];
    events.forEach(e => {
      rows.push([
        e.title, e.event_type || '', e.date || '', e.location || '',
        e.is_virtual ? 'Yes' : 'No', e.ticket_price || 0, e.attendee_count || 0, e.max_capacity || '',
      ]);
    });
    downloadCSV(`${artistProfile.artist_name?.replace(/\s+/g, '-')}-events-${new Date().toISOString().split('T')[0]}.csv`, rows);
    toast.success(`Exported ${events.length} events`);
    setDownloading(null);
  };

  const exportPayouts = () => {
    if (payouts.length === 0) { toast.error('No payout data to export'); return; }
    setDownloading('payouts');
    const rows = [['Date', 'Amount ($)', 'Status', 'Method', 'Reference']];
    payouts.forEach(p => {
      rows.push([
        p.created_date ? new Date(p.created_date).toLocaleDateString() : '',
        p.amount || 0, p.status || '', p.method || '', p.reference || p.id || '',
      ]);
    });
    downloadCSV(`${artistProfile.artist_name?.replace(/\s+/g, '-')}-payouts-${new Date().toISOString().split('T')[0]}.csv`, rows);
    toast.success(`Exported ${payouts.length} payout records`);
    setDownloading(null);
  };

  const exportMerch = () => {
    if (merch.length === 0) { toast.error('No merch data to export'); return; }
    setDownloading('merch');
    const rows = [['Title', 'Category', 'Price ($)', 'Inventory', 'Total Sales', 'Total Revenue ($)', 'Available']];
    merch.forEach(p => {
      rows.push([
        p.title, p.category || '', p.price || 0, p.inventory_count || 0,
        p.total_sales || 0, p.total_revenue || 0, p.is_available ? 'Yes' : 'No',
      ]);
    });
    downloadCSV(`${artistProfile.artist_name?.replace(/\s+/g, '-')}-merch-${new Date().toISOString().split('T')[0]}.csv`, rows);
    toast.success(`Exported ${merch.length} products`);
    setDownloading(null);
  };

  const cards = [
    { key: 'supporters', icon: Users, label: 'Supporter List', desc: 'Fan names, emails, tiers, support amounts', count: supporters.length, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10', border: 'border-neon-cyan/20', action: exportSupporters },
    { key: 'songs', icon: Music, label: 'Song Catalog', desc: 'Track titles, genres, play counts, ISRC codes', count: songs.length, color: 'text-neon-purple', bg: 'bg-neon-purple/10', border: 'border-neon-purple/20', action: exportSongs },
    { key: 'events', icon: Calendar, label: 'Event History', desc: 'All events with dates, locations, attendance', count: events.length, color: 'text-neon-magenta', bg: 'bg-neon-magenta/10', border: 'border-neon-magenta/20', action: exportEvents },
    { key: 'payouts', icon: DollarSign, label: 'Payout Records', desc: 'Payment history for tax reporting', count: payouts.length, color: 'text-neon-turquoise', bg: 'bg-neon-turquoise/10', border: 'border-neon-turquoise/20', action: exportPayouts },
    { key: 'merch', icon: ShoppingBag, label: 'Merchandise Sales', desc: 'Product inventory, sales, revenue', count: merch.length, color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/20', action: exportMerch },
  ];

  return (
    <div className="space-y-6">
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-3 mb-2">
          <FileSpreadsheet className="w-5 h-5 text-neon-cyan" />
          <h3 className="font-display font-semibold">Export Center</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Download your artist data as CSV files for spreadsheets, accounting, and tax reporting.
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(({ key, icon: Icon, label, desc, count, color, bg, border, action }) => (
          <GlassCard key={key} hover={false} className={`p-5 border ${border}`}>
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{label}</h4>
                  <NeonBadge color="purple">{count} records</NeonBadge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{desc}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={action}
                  disabled={downloading === key || count === 0}
                >
                  {downloading === key ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Download CSV
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}