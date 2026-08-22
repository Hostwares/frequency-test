import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, Award, Vote, Lock, Shield, Clock, CheckCircle2,
  XCircle, AlertCircle, FileText, Users, Star, ChevronRight,
  Loader2, Calendar, ScrollText, Bell, Eye, BarChart3, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import AcademyVotingPanel from '@/components/academy/AcademyVotingPanel';
import GovernorPrivateGate from '@/components/academy/GovernorPrivateGate';
import NomineeBrowseSection from '@/components/academy/NomineeBrowseSection';

const STATUS_CONFIG = {
  pending: { color: 'blue', label: 'Pending Review', icon: Clock },
  under_review: { color: 'purple', label: 'Under Review', icon: Eye },
  approved: { color: 'turquoise', label: 'Approved', icon: CheckCircle2 },
  rejected: { color: 'magenta', label: 'Not Selected', icon: XCircle },
  suspended: { color: 'magenta', label: 'Suspended', icon: AlertCircle },
  removed: { color: 'magenta', label: 'Removed', icon: XCircle },
};

const VOTING_TIMELINE = [
  { period: 'January–February', desc: 'Academy applications open; existing membership reviewed.' },
  { period: 'March', desc: 'Eligibility finalized; nomination voting begins.' },
  { period: 'April', desc: 'Official nominees announced.' },
  { period: 'May', desc: 'Final Voting Council completes winner selection.' },
  { period: 'June', desc: 'Winners remain confidential; ceremony preparations.' },
  { period: 'July', desc: 'My Life Awards™ Ceremony.' },
];

export default function AcademyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['academy-member', user?.id],
    queryFn: () => base44.entities.AcademyMember.filter({ user_id: user.id }, '-applied_date', 1),
    enabled: !!user,
  });

  const { data: ceremonySettings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSetting.filter({}),
  });

  const ceremonyDate = ceremonySettings.find(s => s.setting_key === 'awards_ceremony_date')?.setting_value || 'July 2028';

  const member = members[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Voting view for active members
  if (view === 'voting' && member) {
    const isActive = member.application_status === 'approved' && member.membership_status === 'active';
    if (!isActive) {
      setView('dashboard');
      return null;
    }
    return (
      <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Vote className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">Academy Voting</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Cast your official votes for the My Life Awards™ {new Date().getFullYear()} cycle.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>
            <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
        <AcademyVotingPanel member={member} />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-2xl mx-auto text-center">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <h2 className="text-lg font-display font-bold mb-1">No Academy Application Found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          You haven't applied for Academy membership yet.
        </p>
        <Link to="/academy-application">
          <Button className="bg-gradient-neon hover:opacity-90 text-white">
            Apply for Membership
          </Button>
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[member.application_status] || STATUS_CONFIG.pending;
  const isActiveMember = member.application_status === 'approved' && member.membership_status === 'active';
  const StatusIcon = statusCfg.icon;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold">Academy Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            My Life Awards™ Academy — Member Portal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActiveMember && (
            <Button variant="outline" size="sm" onClick={() => setView('voting')}>
              <Vote className="w-4 h-4" /> Cast Votes
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/my-life-awards')}>
            <Trophy className="w-4 h-4" /> Awards Home
          </Button>
        </div>
      </div>

      {/* Membership Status */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            isActiveMember ? 'bg-neon-turquoise/15' : 'bg-primary/15'
          }`}>
            <StatusIcon className={`w-6 h-6 ${isActiveMember ? 'text-neon-turquoise' : 'text-primary'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg font-display font-bold">{member.applicant_name}</h2>
              <NeonBadge color={statusCfg.color}>{statusCfg.label}</NeonBadge>
              {isActiveMember && member.is_voting_council && (
                <NeonBadge color="magenta"><Vote className="w-3 h-3 inline" /> Final Voting Council</NeonBadge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {member.applicant_type?.replace(/_/g, ' ')}
              {member.member_since_date && (
                <> · Member since {new Date(member.member_since_date).toLocaleDateString()}</>
              )}
            </p>

            {member.application_status === 'rejected' && member.rejection_reason && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                {member.rejection_reason}
              </div>
            )}

            {member.application_status === 'pending' && (
              <p className="text-xs text-muted-foreground mt-2">
                Your application is being reviewed by the Master Admin and Awards Committee.
                Selection is based on merit, experience, diversity of perspective, and commitment to the platform.
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {isActiveMember && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GlassCard hover={false} className="p-4 text-center">
              <Vote className="w-4 h-4 text-neon-purple mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-purple">
                {member.is_voting_council ? 'Council' : 'Member'}
              </p>
              <p className="text-[10px] text-muted-foreground">Voting Status</p>
            </GlassCard>
            <GlassCard hover={false} className="p-4 text-center">
              <Star className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-cyan">
                {member.assigned_categories?.length || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Assigned Categories</p>
            </GlassCard>
            <GlassCard hover={false} className="p-4 text-center">
              <CheckCircle2 className="w-4 h-4 text-neon-turquoise mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-turquoise">
                {member.previous_voting_participation || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Previous Cycles</p>
            </GlassCard>
            <GlassCard hover={false} className="p-4 text-center">
              <Lock className="w-4 h-4 text-neon-magenta mx-auto mb-1" />
              <p className="text-lg font-bold text-neon-magenta">
                {member.confidentiality_agreed ? 'Signed' : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">Confidentiality</p>
            </GlassCard>
          </div>

          {/* Voting Eligibility & Deadlines */}
          <GlassCard hover={false} className="p-6">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary" /> Voting Timeline & Deadlines
            </h3>
            <div className="space-y-2">
              {VOTING_TIMELINE.map((phase, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {phase.period === 'July' ? `${phase.period} (${ceremonyDate})` : phase.period}
                    </p>
                    <p className="text-xs text-muted-foreground">{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Assigned Categories */}
          <GlassCard hover={false} className="p-6">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-neon-cyan" /> Assigned Categories
            </h3>
            {member.assigned_categories && member.assigned_categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {member.assigned_categories.map((cat, i) => (
                  <NeonBadge key={i} color="cyan">{cat}</NeonBadge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No categories assigned yet. Categories are assigned by the Awards Committee during the active voting cycle.
              </p>
            )}
          </GlassCard>

          {/* Browse Nominee Profiles */}
          <NomineeBrowseSection />

          {/* Conflict of Interest */}
          <GlassCard hover={false} className="p-6">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-neon-magenta" /> Conflict of Interest Disclosure
            </h3>
            {member.conflict_of_interest_disclosures ? (
              <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
                {member.conflict_of_interest_disclosures}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No conflicts of interest disclosed. Contact the Awards Committee if you need to update your disclosure.
              </p>
            )}
          </GlassCard>

          {/* Confidentiality Agreement */}
          <GlassCard hover={false} className="p-6">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-neon-turquoise" /> Confidentiality Agreement
            </h3>
            <div className="space-y-1.5">
              {[
                'Keep voting confidential.',
                'Avoid discussing internal deliberations.',
                'Report conflicts of interest.',
                'Maintain fairness and impartiality.',
                'Follow the Academy Code of Ethics.',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neon-turquoise flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{rule}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-secondary/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neon-turquoise flex-shrink-0" />
              <p className="text-xs text-foreground">
                You have agreed to the confidentiality terms and Code of Ethics.
              </p>
            </div>
          </GlassCard>

          {/* Academy Resources */}
          <GlassCard hover={false} className="p-6">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-neon-blue" /> Academy Resources
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Voting Guidelines & Rubric', icon: ScrollText },
                { label: 'Code of Ethics (Full Document)', icon: Shield },
                { label: 'Conflict of Interest Form', icon: AlertCircle },
                { label: 'Previous Cycle Results', icon: Trophy },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 p-2.5 bg-secondary/30 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground flex-1">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Governor Private Access — visible only to voting council members */}
          {member.is_voting_council && (
            <GovernorPrivateGate member={member} />
          )}

          {/* Announcements */}
          <GlassCard hover={false} className="p-6">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-neon-magenta" /> Academy Announcements
            </h3>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-foreground font-medium mb-1">
                Inaugural Ceremony Announced
              </p>
              <p className="text-xs text-muted-foreground">
                The first-ever My Life Awards™ ceremony will be held in {ceremonyDate}.
                Additional details will be shared as the date approaches.
              </p>
            </div>
          </GlassCard>
        </>
      )}

      {!isActiveMember && member.application_status !== 'rejected' && (
        <GlassCard hover={false} className="p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Your application is being reviewed. The Academy Dashboard will unlock once you're approved as a voting member.
          </p>
        </GlassCard>
      )}
    </div>
  );
}