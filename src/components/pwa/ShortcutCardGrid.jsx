import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, ListMusic, Users, Calendar, Trash2, Sparkles } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

const SHORTCUTS_KEY = 'tmf_pwa_shortcuts';

const ICONS = {
  artist: Music,
  playlist: ListMusic,
  community: Users,
  event: Calendar,
};

const ROUTES = {
  artist: '/artist/',
  playlist: '/playlist/',
  community: '/frequency/',
  event: '/event/',
};

export function addShortcut(item) {
  if (!item || !item.type || !item.id) return;
  const arr = readShortcuts();
  const exists = arr.some((s) => s.type === item.type && s.id === item.id);
  if (exists) return arr;
  arr.unshift({ type: item.type, id: item.id, label: item.label, sub: item.sub, image: item.image, added_at: Date.now() });
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(arr.slice(0, 12)));
}

function readShortcuts() {
  try { return JSON.parse(localStorage.getItem(SHORTCUTS_KEY) || '[]'); } catch { return []; }
}

export function removeShortcut(type, id) {
  const arr = readShortcuts().filter((s) => !(s.type === type && s.id === id));
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(arr));
}

export default function ShortcutCardGrid() {
  const [shortcuts, setShortcuts] = useState([]);

  useEffect(() => {
    const refresh = () => setShortcuts(readShortcuts());
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const handleRemove = (type, id) => {
    removeShortcut(type, id);
    setShortcuts(readShortcuts());
  };

  if (shortcuts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-neon-cyan" />
        <h2 className="text-sm font-semibold font-display">Quick Launch</h2>
        <span className="text-xs text-muted-foreground">PWA shortcuts</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {shortcuts.map((s) => {
          const Icon = ICONS[s.type] || Music;
          return (
            <GlassCard key={`${s.type}-${s.id}`} hover={false} className="relative p-3 group">
              <Link to={`${ROUTES[s.type] || '/'}${s.id}`} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/40 flex items-center justify-center flex-shrink-0">
                  {s.image ? (
                    <img src={s.image} alt={s.label} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.label}</p>
                  {s.sub && <p className="text-xs text-muted-foreground truncate capitalize">{s.sub}</p>}
                </div>
              </Link>
              <button
                onClick={() => handleRemove(s.type, s.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary/60 transition-opacity"
                aria-label="Remove shortcut"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}