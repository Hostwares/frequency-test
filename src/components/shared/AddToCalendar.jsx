import React, { useState, useRef, useEffect } from 'react';
import { CalendarPlus, ChevronDown, ExternalLink } from 'lucide-react';

function formatDateForCal(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGoogleUrl(event) {
  const start = formatDateForCal(event.date);
  // Default 2-hour duration
  const end = formatDateForCal(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000));
  const details = [
    event.description || '',
    event.is_virtual ? '\n🌐 Virtual Event' : '',
    event.location ? `\n📍 ${event.location}` : '',
    event.ticket_price > 0 ? `\n🎟 Tickets: $${event.ticket_price}` : '\n🎟 Free Entry',
  ].join('');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details,
    location: event.location || (event.is_virtual ? 'Online' : ''),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsContent(event) {
  const start = formatDateForCal(event.date);
  const end = formatDateForCal(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000));
  const description = [
    event.description || '',
    event.is_virtual ? 'Virtual Event' : '',
    event.location ? `Location: ${event.location}` : '',
    event.ticket_price > 0 ? `Tickets: $${event.ticket_price}` : 'Free Entry',
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Frequency//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@frequency.app`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${event.location || (event.is_virtual ? 'Online' : '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function buildOutlookUrl(event) {
  const start = new Date(event.date).toISOString();
  const end = new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start,
    enddt: end,
    body: event.description || '',
    location: event.location || (event.is_virtual ? 'Online' : ''),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function downloadIcs(event) {
  const content = buildIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const OPTIONS = [
  {
    label: 'Google Calendar',
    icon: '🗓',
    action: (event) => window.open(buildGoogleUrl(event), '_blank'),
  },
  {
    label: 'Apple Calendar',
    icon: '🍎',
    action: (event) => downloadIcs(event),
  },
  {
    label: 'Outlook',
    icon: '📧',
    action: (event) => window.open(buildOutlookUrl(event), '_blank'),
  },
  {
    label: 'Download .ics',
    icon: '📥',
    action: (event) => downloadIcs(event),
  },
];

export default function AddToCalendar({ event }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 transition-all"
      >
        <CalendarPlus className="w-3.5 h-3.5" />
        Add to Calendar
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden min-w-[175px]">
          {OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => { opt.action(event); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:bg-secondary/60 transition-colors"
            >
              <span className="text-base">{opt.icon}</span>
              <span className="text-foreground/90">{opt.label}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}