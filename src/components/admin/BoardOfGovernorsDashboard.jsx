import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, Vote, Users, Star, Search, Loader2, Crown, Shield,
  TrendingUp, Award, ChevronRight, X, CheckCircle2, AlertCircle,
  Newspaper, Music, Calendar, Heart, FileSpreadsheet, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import GovernorTrendsDashboard from '@/components/admin/GovernorTrendsDashboard';

const TYPE_LABELS = {
  verified_artist: 'Artist', discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer', music_journalist: 'Journalist',
  community_manager: 'Community Manager', music_educator: 'Educator',
  producer: 'Producer', songwriter: 'Songwriter', engineer: 'Engineer',
  entertainment_attorney: 'Attorney', venue_owner: 'Venue Owner',
  festival_organizer: 'Festival Org.', industry_professional: 'Industry Pro',
  community_contributor: 'Contributor', fan_representative: 'Fan Rep',
};

const TIER_CONFIG = {
  founding: { color: 'magenta', label: 'Founding Governor', icon: Crown },
  senior: { color: 'purple', label: 'Senior Governor', icon: Award },
  member: { color: 'blue', label: 'Governor', icon: Users },
};

export default function BoardOfGovernorsDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [councilFilter, setCouncilFilter] = useState('all');
  const [detailMember, setDetailMember] = useState(null);
  const [categoryInput, setCategoryInput] = useState('');
  const [exportState, setExportState] = useState({ loading: false, result: null, error: null });
  const [activeView, setActiveView] = useState('governors');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['governors'],
    queryFn: () => base44.entities.AcademyMember.filter(
      { application_status: 'approved', membership_status: 'active' },
      '-community_impact_score',
      200
    ),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['governor-articles'],
    queryFn: () => base44.entities.EditorialArticle.filter({ status: 'published' }, '-published_date', 100),
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['governor-votes'],
    queryFn: () => base44.entities.AwardsVote.filter({}, '-voted_date', 200),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['governor-allocations'],
    queryFn: () => base44.entities.SupportAllocation.filter({ is_active: true }, '-created_date', 200),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['governor-events'],
    queryFn: () => base44.entities.EventRSVP.filter({}, '-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ member, updates }) => {
      await base44.entities.AcademyMember.update(member.id, updates);
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: 'governor_update',
        action_category: 'admin',
        entity_type: 'AcademyMember',
        entity_id: member.id,
        details: `Updated governor ${member.applicant_name}`,
        severity: 'info',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governors'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  // Compute live impact metrics from platform data
  const membersWithMetrics = useMemo(() => {
    return members.map(m => {
      const articleCount = articles.filter(a => a.author_user_id === m.user_id).length;
      const voteCount = votes.filter(v => v.voter_user_id === m.user_id).length;
      const currentCycleVotes = votes.filter(v => v.voter_user_id === m.user_id && v.voting_cycle === new Date().getFullYear()).length;
      const supportedArtists = allocations.filter(a => a.fan_user_id === m.user_id).length;
      const eventsAttended = events.filter(e => e.fan_user_id === m.user_id).length;
      const impactScore = (articleCount * 15) + (voteCount * 10) + (supportedArtists * 5) + (eventsAttended * 3) + (m.previous_voting_participation || 0) * 8;

      return {
        ...m,
        articles_published: articleCount,
        votes_cast: voteCount,
        votes_current_cycle: currentCycleVotes,
        artists_supported: supportedArtists,
        events_attended: eventsAttended,
        community_impact_score: impactScore,
      };
    });
  }, [members, articles, votes, allocations, events]);

  const filtered = useMemo(() => {
    return membersWithMetrics.filter(m => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!m.applicant_name?.toLowerCase().includes(q) && !m.applicant_email?.toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== 'all' && m.applicant_type !== typeFilter) return false;
      if (tierFilter !== 'all' && m.governor_tier !== tierFilter) return false;
      if (councilFilter === 'council' && !m.is_voting_council) return false;
      if (councilFilter === 'general' && m.is_voting_council) return false;
      return true;
    });
  }, [membersWithMetrics, searchQuery, typeFilter, tierFilter, councilFilter]);

  const stats = useMemo(() => {
    const councilCount = membersWithMetrics.filter(m => m.is_voting_council).length;
    const totalVotes = membersWithMetrics.reduce((s, m) => s + m.votes_cast, 0);
    const totalArticles = membersWithMetrics.reduce((s, m) => s + m.articles_published, 0);
    const totalImpact = membersWithMetrics.reduce((s, m) => s + m.community_impact_score, 0);
    const foundingCount = membersWithMetrics.filter(m => m.governor_tier === 'founding').length;
    return {
      total: membersWithMetrics.length,
      capacity: 1000,
      council: councilCount,
      councilCapacity: 300,
      totalVotes,
      totalArticles,
      totalImpact,
      founding: foundingCount,
    };
  }, [membersWithMetrics]);

  const handleAddCategory = () => {
    if (!categoryInput.trim() || !detailMember) return;
    const current = detailMember.assigned_categories || [];
    if (!current.includes(categoryInput.trim())) {
      const updates = { assigned_categories: [...current, categoryInput.trim()] };
      updateMutation.mutate({ member: detailMember, updates });
      setDetailMember({ ...detailMember, assigned_categories: [...current, categoryInput.trim()] });
    }
    setCategoryInput('');
  };

  const handleRemoveCategory = (cat) => {
    if (!detailMember) return;
    const updated = (detailMember.assigned_categories || []).filter(c => c !== cat);
    updateMutation.mutate({ member: detailMember, updates: { assigned_categories: updated } });
    setDetailMember({ ...detailMember, assigned_categories: updated });
  };

  const handleToggleCouncil = (member) => {
    updateMutation.mutate({
      member,
      updates: {
        is_voting_council: !member.is_voting_council,
        voting_council_year: !member.is_voting_council ? new Date().getFullYear() : null,
      }
    });
    if (detailMember?.id === member.id) {
      setDetailMember({ ...detailMember, is_voting_council: !member.is_voting_council });
    }
  };

  const handleSetTier = (tier) => {
    if (!detailMember) return;
    updateMutation.mutate({ member: detailMember, updates: { governor_tier: tier } });
    setDetailMember({ ...detailMember, governor_tier: tier });
  };

  const handleExportToSheets = async () => {
    setExportState({ loading: true, result: null, error: null });
    try {
      const res = await base44.functions.invoke('exportAwardsToSheets', {});
      setExportState({ loading: false, result: res.data, error: null });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to export to Google Sheets';
      setExportState({ loading: false, result: null, error: msg });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-display font-bold">Board of Governors</h2>
            <p className="text-xs text-muted-foreground">My Life Awards™ Academy — Verified Voting Members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-0.5">
            <button
              onClick={() => setActiveView('governors')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeView === 'governors' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Governors
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeView === 'trends' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Trends
            </button>
          </div>
          {activeView === 'governors' && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
              disabled={exportState.loading}
              onClick={handleExportToSheets}
            >
              {exportState.loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
              ) : (
                <><FileSpreadsheet className="w-3.5 h-3.5" /> Export to Sheets</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Export result / error */}
      {activeView === 'governors' && exportState.result && (
        <GlassCard hover={false} className="p-3 bg-neon-turquoise/5 border-neon-turquoise/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-neon-turquoise flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Exported {exportState.result.summary?.categories || 0} categories, {exportState.result.summary?.nominees || 0} nominees, and {exportState.result.summary?.votes || 0} votes.
              </p>
            </div>
            <a href={exportState.result.spreadsheetUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                Open <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </div>
        </GlassCard>
      )}
      {activeView === 'governors' && exportState.error && (
        <GlassCard hover={false} className="p-3 bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{exportState.error}</p>
          </div>
        </GlassCard>
      )}

      {activeView === 'trends' && <GovernorTrendsDashboard />}

      {activeView === 'governors' && (
      <>
      {/* Capacity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <Users className="w-4 h-4 text-neon-cyan" />
            <span className="text-[10px] text-muted-foreground">{stats.total}/{stats.capacity}</span>
          </div>
          <p className="text-xl font-bold text-neon-cyan">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Active Governors</p>
          <div className="w-full h-1 bg-secondary/50 rounded-full mt-2">
            <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${Math.min(100, (stats.total / stats.capacity) * 100)}%` }} />
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <Vote className="w-4 h-4 text-neon-magenta" />
            <span className="text-[10px] text-muted-foreground">{stats.council}/{stats.councilCapacity}</span>
          </div>
          <p className="text-xl font-bold text-neon-magenta">{stats.council}</p>
          <p className="text-[10px] text-muted-foreground">Voting Council</p>
          <div className="w-full h-1 bg-secondary/50 rounded-full mt-2">
            <div className="h-full bg-neon-magenta rounded-full" style={{ width: `${Math.min(100, (stats.council / stats.councilCapacity) * 100)}%` }} />
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <TrendingUp className="w-4 h-4 text-neon-purple mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-purple text-center">{stats.totalImpact.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground text-center">Total Impact Score</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4">
          <Crown className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
          <p className="text-xl font-bold text-neon-turquoise text-center">{stats.founding}</p>
          <p className="text-[10px] text-muted-foreground text-center">Founding Governors</p>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search governors by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-secondary/50"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="founding">Founding</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="member">Governor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={councilFilter} onValueChange={setCouncilFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="council">Council Only</SelectItem>
            <SelectItem value="general">General Only</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} shown</span>
      </div>

      {/* Governor List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No governors match your filters.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const tierCfg = TIER_CONFIG[member.governor_tier || 'member'] || TIER_CONFIG.member;
            const TierIcon = tierCfg.icon;
            return (
              <GlassCard key={member.id} hover={false} className="p-3">
                <div className="flex items-center gap-3">
                  {/* Tier icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.governor_tier === 'founding' ? 'bg-neon-magenta/15' :
                    member.governor_tier === 'senior' ? 'bg-neon-purple/15' : 'bg-neon-blue/15'
                  }`}>
                    <TierIcon className={`w-4 h-4 ${
                      member.governor_tier === 'founding' ? 'text-neon-magenta' :
                      member.governor_tier === 'senior' ? 'text-neon-purple' : 'text-neon-blue'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h4 className="text-sm font-display font-semibold truncate">{member.applicant_name}</h4>
                      <NeonBadge color={tierCfg.color} className="text-[10px]">{tierCfg.label}</NeonBadge>
                      {member.is_voting_council && <NeonBadge color="magenta" className="text-[10px]"><Vote className="w-2.5 h-2.5 inline" /> Council</NeonBadge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {TYPE_LABELS[member.applicant_type] || member.applicant_type}
                      {member.member_since_date && ` · Since ${new Date(member.member_since_date).getFullYear()}`}
                    </p>
                  </div>

                  {/* Impact metrics */}
                  <div className="hidden md:flex items-center gap-4 text-center">
                    <div>
                      <p className="text-sm font-bold text-neon-cyan">{member.community_impact_score}</p>
                      <p className="text-[9px] text-muted-foreground">Impact</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neon-purple">{member.votes_cast}</p>
                      <p className="text-[9px] text-muted-foreground">Votes</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neon-turquoise">{member.articles_published}</p>
                      <p className="text-[9px] text-muted-foreground">Articles</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neon-magenta">{member.artists_supported}</p>
                      <p className="text-[9px] text-muted-foreground">Supported</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setDetailMember(member); setCategoryInput(''); }}>
                      Details <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={member.is_voting_council ? 'ghost' : 'outline'}
                      className={`h-7 text-xs gap-1 ${member.is_voting_council ? 'text-neon-magenta' : 'border-neon-magenta/30 text-neon-magenta hover:bg-neon-magenta/10'}`}
                      onClick={() => handleToggleCouncil(member)}
                    >
                      <Vote className="w-3 h-3" /> {member.is_voting_council ? 'Council' : 'Add Council'}
                    </Button>
                  </div>
                </div>

                {/* Mobile metrics */}
                <div className="flex md:hidden items-center gap-4 mt-2 pt-2 border-t border-border/30 text-center">
                  <div className="flex-1"><p className="text-xs font-bold text-neon-cyan">{member.community_impact_score}</p><p className="text-[9px] text-muted-foreground">Impact</p></div>
                  <div className="flex-1"><p className="text-xs font-bold text-neon-purple">{member.votes_cast}</p><p className="text-[9px] text-muted-foreground">Votes</p></div>
                  <div className="flex-1"><p className="text-xs font-bold text-neon-turquoise">{member.articles_published}</p><p className="text-[9px] text-muted-foreground">Articles</p></div>
                  <div className="flex-1"><p className="text-xs font-bold text-neon-magenta">{member.artists_supported}</p><p className="text-[9px] text-muted-foreground">Supported</p></div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Governor Detail Dialog */}
      <Dialog open={!!detailMember} onOpenChange={(open) => !open && setDetailMember(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  {detailMember.applicant_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Profile */}
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    detailMember.governor_tier === 'founding' ? 'bg-neon-magenta/15' :
                    detailMember.governor_tier === 'senior' ? 'bg-neon-purple/15' : 'bg-neon-blue/15'
                  }`}>
                    {React.createElement(TIER_CONFIG[detailMember.governor_tier || 'member'].icon, {
                      className: `w-6 h-6 ${
                        detailMember.governor_tier === 'founding' ? 'text-neon-magenta' :
                        detailMember.governor_tier === 'senior' ? 'text-neon-purple' : 'text-neon-blue'
                      }`
                    })}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{detailMember.applicant_email}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[detailMember.applicant_type]}</p>
                    {detailMember.member_since_date && (
                      <p className="text-[10px] text-muted-foreground">Governor since {new Date(detailMember.member_since_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Tier Management */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Governor Tier</label>
                  <div className="flex gap-2">
                    {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
                      <Button
                        key={tier}
                        size="sm"
                        variant={detailMember.governor_tier === tier ? 'default' : 'outline'}
                        className="h-7 text-xs gap-1"
                        onClick={() => handleSetTier(tier)}
                      >
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Impact Metrics Grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { icon: TrendingUp, label: 'Impact', value: detailMember.community_impact_score, color: 'text-neon-cyan' },
                    { icon: Vote, label: 'Total Votes', value: detailMember.votes_cast, color: 'text-neon-purple' },
                    { icon: Star, label: 'This Cycle', value: detailMember.votes_current_cycle, color: 'text-neon-magenta' },
                    { icon: Newspaper, label: 'Articles', value: detailMember.articles_published, color: 'text-neon-turquoise' },
                    { icon: Heart, label: 'Artists', value: detailMember.artists_supported, color: 'text-neon-blue' },
                    { icon: Calendar, label: 'Events', value: detailMember.events_attended, color: 'text-neon-cyan' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
                      <p className={`text-sm font-bold ${color}`}>{value}</p>
                      <p className="text-[9px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Voting Status */}
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Vote className={`w-4 h-4 ${detailMember.is_voting_council ? 'text-neon-magenta' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{detailMember.is_voting_council ? 'Final Voting Council Member' : 'General Academy Member'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {detailMember.is_voting_council
                        ? `Selected for ${detailMember.voting_council_year || new Date().getFullYear()} cycle — confidential until voting concludes.`
                        : 'Not on the Final Voting Council for this cycle.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={detailMember.is_voting_council ? 'ghost' : 'outline'}
                    className={`h-7 text-xs ${detailMember.is_voting_council ? 'text-destructive' : 'border-neon-magenta/30 text-neon-magenta'}`}
                    onClick={() => handleToggleCouncil(detailMember)}
                  >
                    {detailMember.is_voting_council ? 'Remove' : 'Add to Council'}
                  </Button>
                </div>

                {/* Assigned Categories */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Assigned Voting Categories</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(detailMember.assigned_categories || []).length > 0 ? (
                      detailMember.assigned_categories.map((cat, i) => (
                        <div key={i} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full pl-2.5 pr-1 py-0.5">
                          <span className="text-xs text-foreground">{cat}</span>
                          <button onClick={() => handleRemoveCategory(cat)} className="hover:bg-destructive/20 rounded-full p-0.5">
                            <X className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No categories assigned yet.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add category (e.g. Artist of the Year)..."
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" className="h-8" onClick={handleAddCategory} disabled={!categoryInput.trim()}>Add</Button>
                  </div>
                </div>

                {/* Conflict of Interest */}
                {detailMember.conflict_of_interest_disclosures && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Conflict of Interest Disclosures</label>
                    <p className="text-xs bg-secondary/30 rounded-lg p-3">{detailMember.conflict_of_interest_disclosures}</p>
                  </div>
                )}

                {/* Participation History */}
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-neon-turquoise" />
                  <p className="text-xs text-foreground">
                    Participated in <strong>{detailMember.previous_voting_participation || 0}</strong> previous voting cycle(s).
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setDetailMember(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}