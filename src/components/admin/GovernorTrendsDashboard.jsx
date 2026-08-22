import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import { TrendingUp, Vote, Users, Loader2, Activity, PieChart as PieIcon } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const TYPE_LABELS = {
  verified_artist: 'Artist', discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer', music_journalist: 'Journalist',
  community_manager: 'Community Manager', music_educator: 'Educator',
  producer: 'Producer', songwriter: 'Songwriter', engineer: 'Engineer',
  entertainment_attorney: 'Attorney', venue_owner: 'Venue Owner',
  festival_organizer: 'Festival Org.', industry_professional: 'Industry Pro',
  community_contributor: 'Contributor', fan_representative: 'Fan Rep',
};

const SECTOR_COLORS = [
  '#a855f7', '#06b6d4', '#d946ef', '#3b82f6',
  '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#22d3ee', '#f472b6', '#34d399', '#fb7185',
  '#a78bfa', '#60a5fa', '#2dd4bf',
];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(260 20% 7%)',
  border: '1px solid hsl(260 15% 20%)',
  borderRadius: '8px',
  fontSize: '11px',
  color: 'hsl(0 0% 95%)',
};

export default function GovernorTrendsDashboard() {
  const currentYear = new Date().getFullYear();

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['governors'],
    queryFn: () => base44.entities.AcademyMember.filter(
      { application_status: 'approved', membership_status: 'active' },
      '-community_impact_score', 200
    ),
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['awards-categories-trends', currentYear],
    queryFn: () => base44.entities.AwardsCategory.filter(
      { year: currentYear }, 'sort_order', 100
    ),
  });

  const { data: votes = [], isLoading: votesLoading } = useQuery({
    queryKey: ['governor-votes-trends'],
    queryFn: () => base44.entities.AwardsVote.filter({}, '-voted_date', 5000),
  });

  const { data: nominees = [] } = useQuery({
    queryKey: ['awards-nominees-trends', currentYear],
    queryFn: () => base44.entities.AwardsNominee.filter({ year: currentYear }, '-votes_count', 500),
  });

  const loading = membersLoading || catLoading || votesLoading;

  // Total votes per category
  const votesPerCategory = useMemo(() => {
    const map = {};
    votes.forEach(v => {
      const name = v.category_name || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    const entries = categories.map(cat => ({
      name: cat.name?.length > 25 ? cat.name.substring(0, 23) + '...' : (cat.name || 'Unknown'),
      fullName: cat.name || 'Unknown',
      votes: map[cat.name] || 0,
      phase: cat.voting_phase?.replace(/_/g, ' ') || '',
    }));
    // Include categories that have votes but might not be in the current year's list
    Object.keys(map).forEach(name => {
      if (!entries.some(e => e.fullName === name)) {
        entries.push({ name: name.length > 25 ? name.substring(0, 23) + '...' : name, fullName: name, votes: map[name], phase: '' });
      }
    });
    return entries.sort((a, b) => b.votes - a.votes);
  }, [votes, categories]);

  // Participation rate by academy sector (applicant_type)
  const sectorData = useMemo(() => {
    const sectorMap = {};
    members.forEach(m => {
      const sector = m.applicant_type || 'other';
      if (!sectorMap[sector]) sectorMap[sector] = { total: 0, voted: 0 };
      sectorMap[sector].total++;
    });
    // Count unique voters per sector
    const voterUserIds = new Set(votes.map(v => v.voter_user_id));
    members.forEach(m => {
      const sector = m.applicant_type || 'other';
      if (voterUserIds.has(m.user_id)) {
        sectorMap[sector].voted++;
      }
    });
    return Object.entries(sectorMap)
      .map(([sector, data]) => ({
        name: TYPE_LABELS[sector] || sector,
        total: data.total,
        voted: data.voted,
        rate: data.total > 0 ? Math.round((data.voted / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [members, votes]);

  // Votes over time (by month)
  const votesOverTime = useMemo(() => {
    const map = {};
    votes.forEach(v => {
      const date = new Date(v.voted_date || v.created_date);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: key, votes: 0, cumulative: 0 };
      map[key].votes++;
    });
    const sorted = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    let cumulative = 0;
    sorted.forEach(entry => {
      cumulative += entry.votes;
      entry.cumulative = cumulative;
      // Format month label
      const [year, month] = entry.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      entry.label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
    return sorted;
  }, [votes]);

  // Summary stats
  const summary = useMemo(() => {
    const totalMembers = members.length;
    const voterUserIds = new Set(votes.map(v => v.voter_user_id));
    const uniqueVoters = members.filter(m => voterUserIds.has(m.user_id)).length;
    const participationRate = totalMembers > 0 ? Math.round((uniqueVoters / totalMembers) * 100) : 0;
    const totalVotes = votes.length;
    const councilMembers = members.filter(m => m.is_voting_council).length;
    const councilVoters = members.filter(m => m.is_voting_council && voterUserIds.has(m.user_id)).length;
    const councilRate = councilMembers > 0 ? Math.round((councilVoters / councilMembers) * 100) : 0;
    return { totalMembers, uniqueVoters, participationRate, totalVotes, councilMembers, councilVoters, councilRate };
  }, [members, votes]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-display font-bold">Engagement Trends</h2>
          <p className="text-xs text-muted-foreground">Academy voting participation & category engagement — {currentYear}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4">
          <Vote className="w-4 h-4 text-neon-purple mb-1" />
          <p className="text-xl font-bold text-neon-purple">{summary.totalVotes}</p>
          <p className="text-[10px] text-muted-foreground">Total Votes Cast</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <Users className="w-4 h-4 text-neon-cyan mb-1" />
          <p className="text-xl font-bold text-neon-cyan">{summary.uniqueVoters}/{summary.totalMembers}</p>
          <p className="text-[10px] text-muted-foreground">Unique Voters</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <TrendingUp className="w-4 h-4 text-neon-turquoise mb-1" />
          <p className="text-xl font-bold text-neon-turquoise">{summary.participationRate}%</p>
          <p className="text-[10px] text-muted-foreground">Overall Participation</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <Vote className="w-4 h-4 text-neon-magenta mb-1" />
          <p className="text-xl font-bold text-neon-magenta">{summary.councilRate}%</p>
          <p className="text-[10px] text-muted-foreground">Council Participation</p>
        </GlassCard>
      </div>

      {/* Votes Over Time */}
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-neon-cyan" />
          <h3 className="text-sm font-display font-semibold">Voting Activity Over Time</h3>
        </div>
        {votesOverTime.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No voting activity recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={votesOverTime}>
              <defs>
                <linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(260 10% 55%)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(260 10% 55%)', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="votes" name="Votes/Month" stroke="#a855f7" fill="url(#voteGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="#06b6d4" fill="url(#cumGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Votes Per Category */}
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Vote className="w-4 h-4 text-neon-magenta" />
            <h3 className="text-sm font-display font-semibold">Total Votes Per Category</h3>
          </div>
          {votesPerCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No categories or votes yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={votesPerCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'hsl(260 10% 55%)', fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(260 10% 55%)', fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name, props) => [`${value} votes`, props.payload.fullName]}
                />
                <Bar dataKey="votes" fill="#d946ef" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Participation Rate by Sector */}
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-display font-semibold">Participation Rate by Academy Sector</h3>
          </div>
          {sectorData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No members or votes yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'hsl(260 10% 55%)', fontSize: 9 }} angle={-35} textAnchor="end" height={70} interval={0} />
                <YAxis tick={{ fill: 'hsl(260 10% 55%)', fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name, props) => {
                    if (name === 'rate') return [`${value}% participation`, props.payload.name];
                    return [value, name];
                  }}
                />
                <Bar dataKey="rate" name="rate" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* Sector Breakdown Table */}
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieIcon className="w-4 h-4 text-neon-purple" />
          <h3 className="text-sm font-display font-semibold">Sector Participation Breakdown</h3>
        </div>
        <div className="space-y-1.5">
          {sectorData.map((sector, idx) => (
            <div key={sector.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
              <span className="text-xs font-medium flex-1 truncate">{sector.name}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {sector.voted}/{sector.total} voted
              </span>
              <div className="w-24 h-2 bg-secondary/40 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${sector.rate}%`,
                    backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length],
                  }}
                />
              </div>
              <NeonBadge color={sector.rate >= 75 ? 'turquoise' : sector.rate >= 50 ? 'cyan' : sector.rate >= 25 ? 'purple' : 'blue'} className="text-[10px] w-10 text-center">
                {sector.rate}%
              </NeonBadge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}