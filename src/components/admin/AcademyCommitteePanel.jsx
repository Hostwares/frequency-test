import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, CheckCircle2, XCircle, Eye, Vote, Users, Loader2,
  AlertCircle, Star, Award, Search
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

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All Members' },
];

const APPLICANT_TYPE_LABELS = {
  verified_artist: 'Verified Artist',
  discovery_partner: 'Discovery Partner',
  radio_programmer: 'Radio Programmer',
  music_journalist: 'Music Journalist',
  community_manager: 'Community Manager',
  music_educator: 'Music Educator',
  producer: 'Producer',
  songwriter: 'Songwriter',
  engineer: 'Engineer',
  entertainment_attorney: 'Entertainment Attorney',
  venue_owner: 'Venue Owner',
  festival_organizer: 'Festival Organizer',
  industry_professional: 'Industry Professional',
  community_contributor: 'Community Contributor',
  fan_representative: 'Fan Representative',
};

export default function AcademyCommitteePanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['academy-members', statusFilter],
    queryFn: () => {
      const query = statusFilter === 'all' ? {} : { application_status: statusFilter };
      return base44.entities.AcademyMember.filter(query, '-applied_date', 100);
    },
  });

  const filteredMembers = searchQuery.trim()
    ? members.filter(m => {
        const q = searchQuery.toLowerCase();
        return m.applicant_name?.toLowerCase().includes(q) ||
          m.applicant_email?.toLowerCase().includes(q) ||
          m.applicant_type?.toLowerCase().includes(q);
      })
    : members;

  const reviewMutation = useMutation({
    mutationFn: async ({ member, action, notes, reason }) => {
      const now = new Date().toISOString();
      const updates = {
        reviewed_by: user.id,
        reviewed_by_name: user.full_name || user.email,
        reviewed_date: now,
        review_notes: notes || '',
      };

      if (action === 'approve') {
        updates.application_status = 'approved';
        updates.membership_status = 'active';
        updates.member_since_date = now;
        updates.rejection_reason = null;
      } else if (action === 'under_review') {
        updates.application_status = 'under_review';
      } else if (action === 'reject') {
        updates.application_status = 'rejected';
        updates.rejection_reason = reason || 'Application not selected at this time.';
      } else if (action === 'suspend') {
        updates.membership_status = 'suspended';
      } else if (action === 'reactivate') {
        updates.membership_status = 'active';
      } else if (action === 'council') {
        updates.is_voting_council = !member.is_voting_council;
        if (!member.is_voting_council) {
          updates.voting_council_year = new Date().getFullYear();
        }
      }

      await base44.entities.AcademyMember.update(member.id, updates);

      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: `academy_${action}`,
        action_category: 'admin',
        entity_type: 'AcademyMember',
        entity_id: member.id,
        details: `${action} — ${member.applicant_name} (${member.applicant_type})`,
        severity: action === 'reject' || action === 'suspend' ? 'warning' : 'info',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy-members'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      setReviewDialog(null);
      setReviewNotes('');
      setRejectionReason('');
    },
  });

  const openReview = (member, action) => {
    setReviewDialog({ member, action });
    setReviewNotes(member.review_notes || '');
    setRejectionReason(member.rejection_reason || '');
  };

  const submitReview = () => {
    reviewMutation.mutate({
      member: reviewDialog.member,
      action: reviewDialog.action,
      notes: reviewNotes,
      reason: rejectionReason,
    });
  };

  const stats = {
    total: members.length,
    pending: members.filter(m => m.application_status === 'pending').length,
    approved: members.filter(m => m.application_status === 'approved').length,
    council: members.filter(m => m.is_voting_council).length,
  };

  const dialogTitle = reviewDialog?.action === 'approve' ? 'Approve Academy Member'
    : reviewDialog?.action === 'reject' ? 'Reject Application'
    : reviewDialog?.action === 'under_review' ? 'Mark Under Review'
    : reviewDialog?.action === 'suspend' ? 'Suspend Member'
    : reviewDialog?.action === 'reactivate' ? 'Reactivate Member'
    : reviewDialog?.action === 'council' ? 'Toggle Final Voting Council'
    : 'Review';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Total', value: stats.total, color: 'text-neon-cyan' },
          { icon: Eye, label: 'Pending', value: stats.pending, color: 'text-neon-purple' },
          { icon: CheckCircle2, label: 'Approved', value: stats.approved, color: 'text-neon-turquoise' },
          { icon: Vote, label: 'Voting Council', value: stats.council, color: 'text-neon-magenta' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_TABS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-secondary/50"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Member List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No members found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map(member => (
            <GlassCard key={member.id} hover={false} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-display font-semibold">{member.applicant_name}</h4>
                    <NeonBadge color="blue">
                      {APPLICANT_TYPE_LABELS[member.applicant_type] || member.applicant_type}
                    </NeonBadge>
                    {member.is_voting_council && (
                      <NeonBadge color="magenta"><Vote className="w-3 h-3 inline" /> Council</NeonBadge>
                    )}
                    {member.membership_status === 'suspended' && (
                      <NeonBadge color="magenta">Suspended</NeonBadge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.applicant_email}</p>
                  {member.professional_background && (
                    <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-1">
                      {member.professional_background}
                    </p>
                  )}
                  {member.applied_date && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Applied {new Date(member.applied_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(member.application_status === 'pending' || member.application_status === 'under_review') && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => openReview(member, 'under_review')}>
                        <Eye className="w-3 h-3" /> Review
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
                        onClick={() => openReview(member, 'approve')}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                        onClick={() => openReview(member, 'reject')}>
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </>
                  )}
                  {member.application_status === 'approved' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => openReview(member, 'council')}>
                        <Star className={`w-3 h-3 ${member.is_voting_council ? 'fill-primary text-primary' : ''}`} />
                        {member.is_voting_council ? 'Remove Council' : 'Add to Council'}
                      </Button>
                      {member.membership_status === 'active' ? (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive"
                          onClick={() => openReview(member, 'suspend')}>
                          <AlertCircle className="w-3 h-3" /> Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => openReview(member, 'reactivate')}>
                          <CheckCircle2 className="w-3 h-3" /> Reactivate
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog?.action === 'approve' && <CheckCircle2 className="w-5 h-5 text-neon-turquoise" />}
              {reviewDialog?.action === 'reject' && <XCircle className="w-5 h-5 text-destructive" />}
              {reviewDialog?.action === 'under_review' && <Eye className="w-5 h-5 text-neon-purple" />}
              {reviewDialog?.action === 'suspend' && <AlertCircle className="w-5 h-5 text-destructive" />}
              {reviewDialog?.action === 'reactivate' && <CheckCircle2 className="w-5 h-5 text-neon-turquoise" />}
              {reviewDialog?.action === 'council' && <Star className="w-5 h-5 text-neon-magenta" />}
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          {reviewDialog && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground bg-secondary/30 rounded-lg p-3">
                {reviewDialog.member.applicant_name}
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {APPLICANT_TYPE_LABELS[reviewDialog.member.applicant_type] || reviewDialog.member.applicant_type}
                </span>
              </p>

              {reviewDialog.action === 'approve' && (
                <p className="text-xs text-neon-turquoise">
                  Upon approval, this applicant will become an active Academy member with full voting privileges.
                </p>
              )}
              {reviewDialog.action === 'council' && (
                <p className="text-xs text-muted-foreground">
                  {reviewDialog.member.is_voting_council
                    ? 'Removing from the Final Voting Council.'
                    : 'Adding to the Final Voting Council for the current awards cycle. Council membership remains confidential until voting concludes.'}
                </p>
              )}

              {reviewDialog.action === 'reject' ? (
                <Textarea
                  placeholder="Rejection reason (visible to applicant)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              ) : (reviewDialog.action === 'approve' || reviewDialog.action === 'under_review' || reviewDialog.action === 'suspend') && (
                <Textarea
                  placeholder="Internal committee notes (logged in audit trail)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              variant={reviewDialog?.action === 'reject' || reviewDialog?.action === 'suspend' ? 'destructive' : 'default'}
              onClick={submitReview}
              disabled={reviewMutation.isPending || (reviewDialog?.action === 'reject' && !rejectionReason.trim())}
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {dialogTitle}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}