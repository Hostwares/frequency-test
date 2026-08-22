import React from 'react';
import {
  Pencil, Send, Trash2, ExternalLink, Clock, Eye, TrendingUp, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const CATEGORY_LABELS = {
  artist_feature: 'Artist Feature', community_story: 'Community Story',
  interview: 'Interview', review: 'Review', opinion: 'Opinion',
  news: 'News', behind_the_scenes: 'Behind the Scenes', milestone_celebration: 'Milestone',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${Math.floor(diff / 60000)}m ago`;
}

function deadlineStatus(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { label: 'Overdue', color: 'magenta' };
  if (days === 0) return { label: 'Due Today', color: 'magenta' };
  if (days <= 3) return { label: `${days}d left`, color: 'purple' };
  return { label: `${days}d left`, color: 'blue' };
}

export default function DashboardArticleCard({ article, column, onEdit, onSubmit, onDelete }) {
  const catLabel = CATEGORY_LABELS[article.category] || article.category;
  const dl = deadlineStatus(article.feature_deadline);
  const canEdit = column === 'drafts';
  const isInReview = column === 'review';
  const isPublished = column === 'published';

  return (
    <GlassCard hover={false} className="p-3">
      {article.cover_image && (
        <div className="w-full h-20 rounded-lg overflow-hidden mb-2 bg-secondary/30">
          <img src={article.cover_image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <NeonBadge color="blue" className="text-[10px]">{catLabel}</NeonBadge>
        {article.status === 'rejected' && <NeonBadge color="magenta" className="text-[10px]">Rejected</NeonBadge>}
        {article.is_featured && <NeonBadge color="magenta" className="text-[10px]">Featured</NeonBadge>}
        {dl && <NeonBadge color={dl.color} className="text-[10px]"><Clock className="w-2.5 h-2.5 inline" /> {dl.label}</NeonBadge>}
      </div>
      <h4 className="text-xs font-display font-semibold text-foreground line-clamp-2 mb-1">{article.title}</h4>
      {article.excerpt && <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{article.excerpt}</p>}

      {article.status === 'rejected' && article.rejection_reason && (
        <div className="flex items-start gap-1 mb-2 p-1.5 bg-destructive/10 rounded text-[10px] text-destructive">
          <AlertCircle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{article.rejection_reason}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
        {isPublished ? (
          <>
            <Eye className="w-2.5 h-2.5" /> {article.view_count || 0}
            <TrendingUp className="w-2.5 h-2.5 ml-1" /> {article.like_count || 0}
            <span className="ml-auto">{timeAgo(article.published_date)}</span>
          </>
        ) : (
          <span>{isInReview ? `Submitted ${timeAgo(article.submitted_date)}` : `Updated ${timeAgo(article.updated_date)}`}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {canEdit && (
          <>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={() => onEdit(article)}>
              <Pencil className="w-2.5 h-2.5" /> Edit
            </Button>
            <Button size="sm" className="h-6 text-[10px] gap-1 px-2 bg-primary" onClick={() => onSubmit(article)}>
              <Send className="w-2.5 h-2.5" /> Submit
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2 ml-auto" onClick={() => onDelete(article)}>
              <Trash2 className="w-2.5 h-2.5" />
            </Button>
          </>
        )}
        {isPublished && (
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2 ml-auto" onClick={() => window.open(`/article/${article.id}`, '_blank')}>
            <ExternalLink className="w-2.5 h-2.5" /> View
          </Button>
        )}
      </div>
    </GlassCard>
  );
}