import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Globe, MapPin, ChevronDown, ChevronRight, X, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';

// ─── Location parser ────────────────────────────────────────────────────────
// Expects "City, State/Region, Country" | "City, Country" | "Country"
function parseLocation(loc = '') {
  const parts = loc.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) return { city: parts[0], state: parts[1], country: parts[2] };
  if (parts.length === 2) return { city: parts[0], state: '',        country: parts[1] };
  if (parts.length === 1) return { city: '',       state: '',        country: parts[0] };
  return { city: 'Unknown', state: '', country: 'Unknown' };
}

const NEON = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6', '#f59e0b'];

// ─── Geo bar row ─────────────────────────────────────────────────────────────
function GeoBar({ label, count, total, color, sub, onFilter, isFiltered }) {
  const [open, setOpen] = useState(false);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div
        className={`flex items-center gap-3 py-2 rounded-lg px-2 -mx-2 transition-colors
          ${isFiltered ? 'bg-primary/10' : 'hover:bg-secondary/20'} cursor-pointer group`}
        onClick={() => {
          if (sub) setOpen(o => !o);
          onFilter(label);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {sub ? (
              open
                ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            ) : (
              <MapPin className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            )}
            <span className={`text-xs truncate font-medium ${isFiltered ? 'text-primary' : ''}`}>{label}</span>
            {isFiltered && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-1">filtered</span>}
          </div>
          <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
        <div className="text-right flex-shrink-0 w-14">
          <span className="text-xs font-bold" style={{ color }}>{count}</span>
          <span className="text-[10px] text-muted-foreground ml-1">{pct}%</span>
        </div>
      </div>

      {open && sub?.length > 0 && (
        <div className="ml-5 border-l border-border/30 pl-3 space-y-0.5 mb-1">
          {sub.map(({ label: sl, count: sc }, si) => (
            <GeoBar
              key={sl}
              label={sl}
              count={sc}
              total={count}
              color={NEON[(si + 2) % NEON.length]}
              onFilter={onFilter}
              isFiltered={isFiltered}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mini growth chart ────────────────────────────────────────────────────────
function GeoGrowthChart({ allocations, filterLabel, users }) {
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') };
    });

    // Build a set of fan_user_ids that match the filter
    const matchingFanIds = new Set();
    if (filterLabel) {
      allocations.forEach(a => {
        const user = users.find(u => u.id === a.fan_user_id);
        if (!user?.location) return;
        const { country, state, city } = parseLocation(user.location);
        if ([country, state, city, `${city}, ${country}`, `${state}, ${country}`, `${city}, ${state}`].includes(filterLabel)) {
          matchingFanIds.add(a.fan_user_id);
        }
      });
    }

    const pool = filterLabel
      ? allocations.filter(a => matchingFanIds.has(a.fan_user_id))
      : allocations;

    let cumulative = 0;
    return months.map(({ key, label }) => {
      const count = pool.filter(a => {
        const m = a.month || a.created_date?.slice(0, 7);
        return m === key;
      }).length;
      cumulative += count;
      return { label, new: count, cumulative };
    });
  }, [allocations, filterLabel, users]);

  const color = filterLabel ? '#d946ef' : '#06b6d4';

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
        <p className="text-xs font-medium text-muted-foreground">
          {filterLabel ? `Growth — ${filterLabel}` : 'Overall Supporter Growth'}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="geoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(260 20% 7%)', border: '1px solid hsl(260 15% 16%)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area type="monotone" dataKey="cumulative" name="Total" stroke={color} strokeWidth={2}
            fill="url(#geoGrad)" dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey="new" name="New" stroke={color} strokeWidth={1}
            strokeDasharray="4 2" fill="none" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FanbaseGeoBreakdown({ artistProfileId, supporters = [] }) {
  const [tab, setTab] = useState('country');       // country | state | city
  const [activeFilter, setActiveFilter] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['supporter-users', artistProfileId],
    queryFn: () => base44.entities.User.list(),
    enabled: !!artistProfileId && supporters.length > 0,
  });

  const geoStats = useMemo(() => {
    const fanUserIds = new Set(supporters.map(s => s.fan_user_id));
    const fanUsers = users.filter(u => fanUserIds.has(u.id) && u.location);
    const withoutLocation = supporters.length - fanUsers.length;

    const countryMap = {};
    fanUsers.forEach(u => {
      const { city, state, country } = parseLocation(u.location || '');
      const c = country || 'Unknown';
      if (!countryMap[c]) countryMap[c] = { count: 0, states: {}, cities: {} };
      countryMap[c].count++;
      if (state) countryMap[c].states[state] = (countryMap[c].states[state] || 0) + 1;
      if (city)  countryMap[c].cities[city]  = (countryMap[c].cities[city]  || 0) + 1;
    });

    const countries = Object.entries(countryMap)
      .map(([country, data]) => ({
        label: country,
        count: data.count,
        sub: Object.entries(data.states)
          .sort((a, b) => b[1] - a[1])
          .map(([l, c]) => ({ label: l, count: c })),
      }))
      .sort((a, b) => b.count - a.count);

    // Flat state list with nested cities
    const stateMap = {};
    fanUsers.forEach(u => {
      const { city, state, country } = parseLocation(u.location || '');
      if (!state) return;
      const key = `${state}, ${country}`;
      if (!stateMap[key]) stateMap[key] = { count: 0, cities: {} };
      stateMap[key].count++;
      if (city) stateMap[key].cities[city] = (stateMap[key].cities[city] || 0) + 1;
    });
    const states = Object.entries(stateMap)
      .map(([label, data]) => ({
        label,
        count: data.count,
        sub: Object.entries(data.cities).sort((a, b) => b[1] - a[1]).map(([l, c]) => ({ label: l, count: c })),
      }))
      .sort((a, b) => b.count - a.count);

    // Flat city list
    const cityMap = {};
    fanUsers.forEach(u => {
      const { city, country } = parseLocation(u.location || '');
      if (!city) return;
      const key = `${city}, ${country}`;
      cityMap[key] = (cityMap[key] || 0) + 1;
    });
    const cities = Object.entries(cityMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return { countries, states, cities, total: fanUsers.length, withoutLocation };
  }, [users, supporters]);

  const tabs = [
    { key: 'country', label: 'Country', list: geoStats.countries },
    { key: 'state',   label: 'State',   list: geoStats.states },
    { key: 'city',    label: 'City',    list: geoStats.cities },
  ];
  const activeList = tabs.find(t => t.key === tab)?.list ?? [];
  const showSub = tab === 'country' || tab === 'state';

  const handleFilter = (label) => {
    setActiveFilter(prev => prev === label ? null : label);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-neon-cyan" />
          <h2 className="font-display font-semibold text-sm">Fanbase Geography</h2>
        </div>
        <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5">
          {tabs.map(({ key, label }) => (
            <button key={key}
              onClick={() => { setTab(key); setActiveFilter(null); }}
              className={`px-3 py-1 rounded-md text-[11px] font-medium capitalize transition-colors
                ${tab === key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Fans', value: supporters.length, color: 'text-neon-cyan' },
          { label: 'Countries',  value: geoStats.countries.length, color: 'text-neon-purple' },
          { label: 'Cities',     value: geoStats.cities.length,    color: 'text-neon-magenta' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
            <p className={`text-base font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Active filter pill */}
      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/30">
            <MapPin className="w-3 h-3" />
            {activeFilter}
            <button onClick={() => setActiveFilter(null)} className="ml-0.5 hover:text-destructive transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Geo bars */}
      {supporters.length === 0 ? (
        <div className="py-8 text-center">
          <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No supporter data yet.</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className="py-6 text-center">
          <MapPin className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No location data for this view.</p>
          {geoStats.withoutLocation > 0 && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">{geoStats.withoutLocation} fans haven't set a location.</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {activeList.slice(0, 15).map(({ label, count, sub }, i) => (
            <GeoBar
              key={label}
              label={label}
              count={count}
              total={geoStats.total || supporters.length}
              color={NEON[i % NEON.length]}
              sub={showSub ? sub : undefined}
              onFilter={handleFilter}
              isFiltered={activeFilter === label}
            />
          ))}
          {geoStats.withoutLocation > 0 && (
            <p className="text-[10px] text-muted-foreground/50 pt-2 border-t border-border/20 mt-1">
              {geoStats.withoutLocation} fan{geoStats.withoutLocation !== 1 ? 's' : ''} have no location set.
            </p>
          )}
        </div>
      )}

      {/* Growth chart — responds to active filter */}
      <div className="pt-3 border-t border-border/30">
        <GeoGrowthChart
          allocations={supporters}
          filterLabel={activeFilter}
          users={users}
        />
      </div>
    </div>
  );
}