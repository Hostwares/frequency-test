import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Newspaper, Eye, CheckCircle2, XCircle, Send, Clock,
  Loader2, AlertCircle, ExternalLink, FileText, TrendingUp, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const STATUS_FILTERS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export default function EditorialReviewPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['editorial-review', statusFilter],
    queryFn: () => {
      const query = statusFilter === 'all' ? {} : { status: statusFilter };
      return base44.entities.EditorialArticle.filter(query, '-updated_date', 50);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ article, action, notes, reason }) => {
      const now = new Date().toISOString();
      const updates = {
        reviewed_by: user.id,
        reviewed_by_name: user.full_name || user.email,
        reviewed_date: now,
        review_notes: notes || '',
      };

      if (action === 'approve') {
        updates.status = 'approved';
        updates.rejection_reason = null;
      } else if (action === 'publish') {
        updates.status = 'published';
        updates.published_date = now;
        updates.rejection_reason = null;
      } else if (action === 'under_review') {
        updates.status = 'under_review';
      } else if (action === 'reject') {
        updates.status = 'rejected';
        updates.rejection_reason = reason || 'Article does not meet editorial guidelines';
      } else if (action === 'feature') {
        updates.is_featured = !article.is_featured;
      }

      await base44.entities.EditorialArticle.update(article.id, updates);

      // Audit log
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: `editorial_${action}`,
        action_category: 'moderation',
        entity_type: 'EditorialArticle',
        entity_id: article.id,
        details: `${action} on "${article.title}" by ${article.author_name}. ${notes || reason || ''}`,
        severity: action === 'reject' ? 'warning' : 'info',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['editorial-review'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      setReviewDialog(null);
      setReviewNotes('');
      setRejectionReason('');
    },
  });

  const openReview = (article, action) => {
    setReviewDialog({ article, action });
    setReviewNotes('');
    setRejectionReason('');
  };

  const submitReview = () => {
    reviewMutation.mutate({
      article: reviewDialog.article,
      action: reviewDialog.action,
      notes: reviewNotes,
      reason: rejectionReason,
    });
  };

  const stats = {
    submitted: articles.filter(a => a.status === 'submitted').length,
    underReview: articles.filter(a => a.status === 'under_review').length,
    approved: articles.filter(a => a.status === 'approved').length,
    published: articles.filter(a => a.status === 'published').length,
  };

  const dialogTitle = reviewDialog?.action === 'approve' ? 'Approve Article'
    : reviewDialog?.action === 'publish' ? 'Publish Article'
    : reviewDialog?.action === 'under_review' ? 'Mark Under Review'
    : reviewDialog?.action === 'reject' ? 'Reject Article'
    : reviewDialog?.action === 'feature' ? 'Toggle Featured'
    : 'Review Article';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Send, label: 'Submitted', value: stats.submitted, color: 'text-neon-purple' },
          { icon: Clock, label: 'Under Review', value: stats.underReview, color: 'text-neon-cyan' },
          { icon: CheckCircle2, label: 'Approved', value: stats.approved, color: 'text-neon-turquoise' },
          { icon: Newspaper, label: 'Published', value: stats.published, color: 'text-neon-magenta' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} hover={false} className="p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </span>
      </div>

      {/* Article list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No {statusFilter === 'all' ? '' : statusFilter.replace(/_/g, ' ')} articles.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <GlassCard key={article.id} hover={false} className="p-4">
              <div className="flex gap-4">
                {/* Cover */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/30">
                  {article.cover_image ? (
                    <img src={article.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <NeonBadge color={
                      article.status === 'published' ? 'turquoise' :
                      article.status === 'approved' ? 'cyan' :
                      article.status === 'rejected' ? 'magenta' :
                      'purple'
                    }>
                      {article.status.replace(/_/g, ' ')}
                    </NeonBadge>
                    <NeonBadge color="blue">
                      {article.category?.replace(/_/g, ' ')}
                    </NeonBadge>
                    {article.is_featured && <NeonBadge color="magenta"><Star className="w-3 h-3 inline" /> Featured</NeonBadge>}
                    <span className="text-[10px] text-muted-foreground">
                      by {article.author_name || 'Unknown'}
                    </span>
                  </div>

                  <h4 className="text-sm font-display font-semibold truncate">{article.title}</h4>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{article.excerpt}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/30 flex-wrap">
                    {article.status === 'published' && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                        onClick={() => window.open(`/article/${article.id}`, '_blank')}>
                        <ExternalLink className="w-3 h-3" /> View
                      </Button>
                    )}
                    {(article.status === 'submitted') && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => openReview(article, 'under_review')}>
                        <Eye className="w-3 h-3" /> Review
                      </Button>
                    )}
                    {(article.status === 'submitted' || article.status === 'under_review') && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-neon-turquoise/30 text-neon-turquoise hover:bg-neon-turquoise/10"
                          onClick={() => openReview(article, 'approve')}>
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                          onClick={() => openReview(article, 'reject')}>
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </>
                    )}
                    {article.status === 'approved' && (
                      <Button size="sm" className="h-7 text-xs gap-1 bg-gradient-neon hover:opacity-90 text-white"
                        onClick={() => openReview(article, 'publish')}>
                        <Newspaper className="w-3 h-3" /> Publish
                      </Button>
                    )}
                    {(article.status === 'published' || article.status === 'approved') && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                        onClick={() => openReview(article, 'feature')}>
                        <Star className={`w-3 h-3 ${article.is_featured ? 'fill-primary text-primary' : ''}`} />
                        {article.is_featured ? 'Unfeature' : 'Feature'}
                      </Button>
                    )}
                  </div>
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
              {reviewDialog?.action === 'publish' && <Newspaper className="w-5 h-5 text-neon-magenta" />}
              {reviewDialog?.action === 'reject' && <XCircle className="w-5 h-5 text-destructive" />}
              {reviewDialog?.action === 'under_review' && <Eye className="w-5 h-5 text-neon-purple" />}
              {reviewDialog?.action === 'feature' && <Star className="w-5 h-5 text-neon-magenta" />}
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          {reviewDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {reviewDialog.action === 'publish'
                  ? 'This article will be published and visible to all users immediately.'
                  : reviewDialog.action === 'reject'
                  ? 'The journalist will be notified with your rejection reason.'
                  : reviewDialog.action === 'feature'
                  ? 'Toggle the Editor\'s Pick status for this article.'
                  : `You are about to ${reviewDialog.action} this article.`}
              </p>
              <p className="text-sm font-medium text-foreground bg-secondary/30 rounded-lg p-3">
                "{reviewDialog.article.title}"
              </p>
              <p className="text-xs text-muted-foreground">
                by {reviewDialog.article.author_name}
              </p>

              {reviewDialog.action === 'reject' ? (
                <Textarea
                  placeholder="Rejection reason (visible to the journalist)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              ) : reviewDialog.action !== 'feature' ? (
                <Textarea
                  placeholder="Review notes (internal, logged in audit trail)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              variant={reviewDialog?.action === 'reject' ? 'destructive' : 'default'}
              onClick={submitReview}
              disabled={reviewMutation.isPending || (reviewDialog?.action === 'reject' && !rejectionReason.trim())}
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : dialogTitle}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}