import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart2, Eye, Music, Megaphone, TrendingUp, Users, UserPlus, Layers, ChevronDown, ChevronUp, DollarSign, Award } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import BreakoutArtistsVisual from '@/components/discovery/BreakoutArtistsVisual';
import PerformanceChart from '@/components/discovery/PerformanceChart';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid
} from 'recharts';

const NEON_COLORS = ['#a855f7', '#06b6d4', '#d946ef', '#3b82f6', '#14b8a6'];

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <GlassCard hover={false} className="p-4 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </GlassCard>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function ReferralTrackingSection({ partnerId, userId, spotlights, playlists }) {
  const [expanded, setExpanded] = React.useState(false);

  // Collect all artist_profile_ids this partner has spotlighted or curated playlists for
  const curatedArtistIds = useMemo(() => {
    const ids = new Set(spotlights.filter(s => s.is_published).map(s => s.artist_profile_id).filter(Boolean));
    return [...ids];
  }, [spotlights]);

  // Fetch support allocations for those artists — these are the "new fans" coming in
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['dp-referral-allocations', partnerId],
    queryFn: () => base44.entities.SupportAllocation.filter({ is_active: true }),
    enabled: curatedArtistIds.length > 0,
  });

  // Filter to only allocations for artists this partner spotlighted
  const curatedAllocations = useMemo(() =>
    allAllocations.filter(a => curatedArtistIds.includes(a.artist_profile_id)),
    [allAllocations, curatedArtistIds]
  );

  // Group by artist
  const byArtist = useMemo(() => {
    const map = {};
    curatedAllocations.forEach(a => {
      if (!map[a.artist_profile_id]) map[a.artist_profile_id] = { name: a.artist_name, fans: 0, total: 0 };
      map[a.artist_profile_id].fans += 1;
      map[a.artist_profile_id].total += a.amount || 0;
    });
    return Object.values(map).sort((a, b) => b.fans - a.fans);
  }, [curatedAllocations]);

  // Monthly new-fan trend (based on allocation created_date)
  const monthlyTrend = useMemo(() => {
    const counts = {};
    curatedAllocations.forEach(a => {
      const month = a.month || (a.created_date ? a.created_date.slice(0, 7) : null);
      if (month) counts[month] = (counts[month] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, fans]) => ({ month: month.slice(5), fans })); // show MM only
  }, [curatedAllocations]);

  // Spotlight attribution: how many fans per spotlight article
  const spotlightAttribution = useMemo(() => {
    return spotlights.filter(s => s.is_published).map(s => {
      const fans = curatedAllocations.filter(a => a.artist_profile_id === s.artist_profile_id).length;
      return { title: s.title, artist: s.artist_name, fans };
    }).sort((a, b) => b.fans - a.fans).slice(0, 6);
  }, [spotlights, curatedAllocations]);

  const totalFans = curatedAllocations.length;

  return (
    <GlassCard hover={false} className="p-5 border border-neon-purple/20">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between gap-2 mb-1"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-neon-purple" />
          <p className="font-display font-semibold text-sm">Fan Referral Tracking</p>
          <NeonBadge color="purple">{totalFans} fans</NeonBadge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <p className="text-[11px] text-muted-foreground mb-4">Fans supporting artists you've spotlighted or curated</p>

      {totalFans === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No fan support data yet for your spotlighted artists.</p>
      ) : (
        <>
          {/* Monthly trend always visible */}
          {monthlyTrend.length > 1 && (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Line type="monotone" dataKey="fans" name="New Fans" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-5 space-y-5">
              {/* Spotlight attribution table */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="w-3.5 h-3.5 text-neon-magenta" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">By Spotlight</p>
                </div>
                <div className="space-y-2">
                  {spotlightAttribution.map(s => (
                    <div key={s.title} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.title}</p>
                        <p className="text-[11px] text-neon-cyan">{s.artist}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-neon-purple">{s.fans}</p>
                        <p className="text-[10px] text-muted-foreground">fans</p>
                      </div>
                      <div className="w-20 h-1.5 bg-secondary/40 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-gradient-to-r from-neon-purple to-neon-magenta rounded-full"
                          style={{ width: `${totalFans > 0 ? Math.round((s.fans / totalFans) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top artists by fan count */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-3.5 h-3.5 text-neon-cyan" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Artists by Fan Acquisition</p>
                </div>
                <div className="space-y-2">
                  {byArtist.slice(0, 5).map(a => (
                    <div key={a.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{a.name}</span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold text-neon-cyan">{a.fans} fans</span>
                        <span className="text-muted-foreground">${a.total.toFixed(0)}/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}

export default function AnalyticsTab({ partnerId, userId }) {
  const { data: spotlights = [] } = useQuery({
    queryKey: ['dp-spotlights', partnerId],
    queryFn: () => base44.entities.ArtistSpotlight.filter({ discovery_partner_id: partnerId }, '-created_date', 50),
    enabled: !!partnerId,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['dp-playlists', userId],
    queryFn: () => base44.entities.Playlist.filter({ owner_user_id: userId, type: 'community' }),
    enabled: !!userId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['dp-submissions', partnerId],
    queryFn: () => base44.entities.ArtistSubmission.filter({ discovery_partner_id: partnerId }, '-created_date', 50),
    enabled: !!partnerId,
  });

  const totalViews = useMemo(() => spotlights.reduce((s, sp) => s + (sp.view_count || 0), 0), [spotlights]);
  const publishedSpotlights = useMemo(() => spotlights.filter(s => s.is_published), [spotlights]);
  const totalTracks = useMemo(() => playlists.reduce((s, p) => s + (p.song_ids?.length || 0), 0), [playlists]);
  const acceptedSubmissions = useMemo(() => submissions.filter(s => ['accepted', 'featured', 'recommended'].includes(s.status)), [submissions]);

  // Spotlight views bar chart data
  const spotlightChartData = useMemo(() =>
    publishedSpotlights
      .slice(0, 8)
      .map(s => ({ name: s.artist_name || s.title, views: s.view_count || 0 }))
      .sort((a, b) => b.views - a.views),
    [publishedSpotlights]
  );

  // Playlist track count bar chart data
  const playlistChartData = useMemo(() =>
    playlists
      .slice(0, 8)
      .map(p => ({ name: p.name, tracks: p.song_ids?.length || 0, followers: p.follower_count || 0 }))
      .sort((a, b) => b.followers - a.followers),
    [playlists]
  );

  // Submission status breakdown
  const submissionStatusData = useMemo(() => {
    const counts = {};
    submissions.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      count,
    }));
  }, [submissions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-4 h-4 text-neon-purple" />
        <h2 className="font-display font-semibold text-sm">Reach & Analytics</h2>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Eye}       label="Total Spotlight Views"  value={totalViews}                     color="text-neon-magenta" />
        <StatTile icon={Megaphone} label="Published Spotlights"   value={publishedSpotlights.length}     color="text-neon-purple" />
        <StatTile icon={Music}     label="Tracks Curated"         value={totalTracks}                    color="text-neon-cyan" />
        <StatTile icon={Users}     label="Accepted Submissions"   value={acceptedSubmissions.length}     color="text-neon-turquoise" />
      </div>

      {/* Performance Chart */}
      <PerformanceChart partnerId={partnerId} />

      {/* Spotlight views chart */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4 text-neon-magenta" />
          <p className="font-display font-semibold text-sm">Spotlight Views by Artist</p>
          <NeonBadge color="magenta">{publishedSpotlights.length} live</NeonBadge>
        </div>
        {spotlightChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spotlightChartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="views" name="Views" radius={[4, 4, 0, 0]}>
                {spotlightChartData.map((_, i) => (
                  <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No published spotlights yet.</p>
        )}
      </GlassCard>

      {/* Playlist reach chart */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-4 h-4 text-neon-cyan" />
          <p className="font-display font-semibold text-sm">Playlist Followers</p>
          <NeonBadge color="cyan">{playlists.length} playlists</NeonBadge>
        </div>
        {playlistChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={playlistChartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="followers" name="Followers" radius={[4, 4, 0, 0]}>
                {playlistChartData.map((_, i) => (
                  <Cell key={i} fill={NEON_COLORS[(i + 2) % NEON_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No playlists yet.</p>
        )}
      </GlassCard>

      {/* Fan Referral Tracking */}
      <ReferralTrackingSection partnerId={partnerId} userId={userId} spotlights={spotlights} playlists={playlists} />

      {/* Breakout Artists Connection */}
      <BreakoutArtistsVisual partnerId={partnerId} />

      {/* Submission pipeline */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-neon-purple" />
          <p className="font-display font-semibold text-sm">Submission Pipeline</p>
          <NeonBadge color="purple">{submissions.length} total</NeonBadge>
        </div>
        {submissionStatusData.length > 0 ? (
          <div className="space-y-2">
            {submissionStatusData.map(({ name, count }) => {
              const pct = Math.round((count / submissions.length) * 100);
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-muted-foreground">{name}</span>
                    <span className="font-medium">{count} <span className="text-muted-foreground">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No submissions yet.</p>
        )}
      </GlassCard>
    </div>
  );
}