import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { GENRES } from '@/lib/genres';

export default function GenreSelect({ value, onChange, placeholder = "Select genre", className = "" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search
    ? GENRES.filter(g => g.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : GENRES.slice(0, 100);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-secondary/50 border border-border/50 rounded-lg hover:border-primary/40 transition-colors"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
            />
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/50 border border-border/50 rounded-md outline-none focus:border-primary/40"
                placeholder="Search genres..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(genre => (
              <button
                key={genre}
                type="button"
                onClick={() => { onChange(genre); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors capitalize
                  ${value === genre ? 'text-primary bg-primary/10' : 'text-foreground'}`}
              >
                {genre}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No genres found</p>
            )}
            {!search && (
              <p className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
                Type to search all {GENRES.length} genres
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}