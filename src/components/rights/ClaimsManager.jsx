import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Gavel, Clock, Loader2, AlertTriangle, CheckCircle2, XCircle,
  ShieldAlert, Globe, FileText, Users, ChevronDown, ChevronUp, Plus, Scale
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import RightsClaimForm from '@/components/catalog/RightsClaimForm';
import { toast } from 'sonner';

const CLAIM_STATUS = {
  pending: { color: 'purple', icon: Clock, label: 'Pending' },
  under_review: { color: 'cyan', icon: Loader2, label: 'Under Review' },
  co_owner_notified: { color: 'blue', icon: Users, label: 'Co-Owner Notified' },
  resolved_upheld: { color: 'magenta', icon: CheckCircle2, label: 'Resolved — Upheld' },
  resolved_dismissed: { color: 'turquoise', icon: XCircle, label: 'Resolved — Dismissed' },
  withdrawn: { color: 'purple', icon: XCircle, label: 'Withdrawn' },
  escalated: { color: 'blue', icon: AlertTriangle, label: 'Escalated' },
};

const LICENSING_COLORS = {
  granted: 'turquoise',
  denied: 'magenta',
  pending: 'blue',
  not_applicable: 'purple',
};

export default function ClaimsManager({ user, artistProfile }) {
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const queryClient = useQueryClient();

  // Claims filed by the user
  const { data: myClaims = [], isLoading } = useQuery({
    queryKey: ['rights-claims', user?.id],
    queryFn: () => base44.entities.RightsClaim.filter({ claimant_user_id: user?.id }, '-created_date'),
    enabled: !!user?.id,
  });

  // Claims against the artist's songs (co-owner approval needed)
  const { data: incomingClaims = [] } = useQuery({
    queryKey: ['incoming-claims', artistProfile?.id],
    queryFn: () => base44.entities.RightsClaim.filter({ artist_profile_id: artistProfile?.id }, '-created_date'),
    enabled: !!artistProfile?.id,
  });

  const { data: mySongs = [] } = useQuery({
    queryKey: ['claims-songs', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, claimId, ...rest }) => base44.functions.invoke('processRightsAction', {
      action,
      claim_id: claimId,
      ...rest,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rights-claims'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-claims'] });
      toast.success('Action processed');
      setExpandedClaim(null);
    },
  });

  const handleAction = (action, claimId, extra = {}) => {
    actionMutation.mutate({ action, claimId, ...extra });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading claims...</p>;
  }

  const pendingIncoming = incomingClaims.filter(c =>
    ['pending', 'under_review', 'co_owner_notified'].includes(c.status)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Gavel className="w-4 h-4 text-neon-purple" />
            Copyright Claims
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Claims you filed and claims against your songs</p>
        </div>
        {mySongs.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setShowClaimForm(true)}>
            <Plus className="w-3 h-3 mr-1" /> File Claim
          </Button>
        )}
      </div>

      {/* Incoming Claims (against your songs) */}
      {pendingIncoming.length > 0 && (
        <GlassCard hover={false} className="p-4 border-neon-blue/30 bg-neon-blue/5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-neon-blue" />
            Claims Against Your Songs ({pendingIncoming.length})
          </h3>
          <div className="space-y-2">
            {pendingIncoming.map(claim => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                isIncoming
                expanded={expandedClaim === claim.id}
                onToggle={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
                resolutionNotes={resolutionNotes[claim.id] || ''}
                onNotesChange={(val) => setResolutionNotes({ ...resolutionNotes, [claim.id]: val })}
                onAction={handleAction}
                isPending={actionMutation.isPending}
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* All Claims */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          All Claims ({myClaims.length + incomingClaims.length})
        </h3>
        {myClaims.length + incomingClaims.length === 0 ? (
          <GlassCard hover={false} className="p-8 text-center">
            <Gavel className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No rights claims</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {[...myClaims, ...incomingClaims]
              .filter(c => !pendingIncoming.includes(c))
              .map(claim => (
                <ClaimRow
                  key={claim.id}
                  claim={claim}
                  isIncoming={incomingClaims.includes(claim)}
                  expanded={expandedClaim === claim.id}
                  onToggle={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
                  resolutionNotes={resolutionNotes[claim.id] || ''}
                  onNotesChange={(val) => setResolutionNotes({ ...resolutionNotes, [claim.id]: val })}
                  onAction={handleAction}
                  isPending={actionMutation.isPending}
                />
              ))}
          </div>
        )}
      </div>

      {showClaimForm && mySongs.length > 0 && user && artistProfile && (
        <RightsClaimForm
          song={mySongs[0]}
          artistProfile={artistProfile}
          user={user}
          isOpen={showClaimForm}
          onClose={() => setShowClaimForm(false)}
        />
      )}
    </div>
  );
}

function ClaimRow({ claim, isIncoming, expanded, onToggle, resolutionNotes, onNotesChange, onAction, isPending }) {
  const statusInfo = CLAIM_STATUS[claim.status] || CLAIM_STATUS.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <GlassCard hover={false} className="p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isIncoming && <NeonBadge color="blue">Incoming</NeonBadge>}
            <h4 className="text-sm font-semibold">{claim.song_title}</h4>
            <NeonBadge color={statusInfo.color}>
              <StatusIcon className={`w-3 h-3 inline mr-0.5 ${claim.status === 'under_review' ? 'animate-spin' : ''}`} />
              {statusInfo.label}
            </NeonBadge>
            {claim.takedown_issued && <NeonBadge color="magenta"><ShieldAlert className="w-3 h-3 inline mr-0.5" /> Takedown</NeonBadge>}
          </div>
          <p className="text-xs text-muted-foreground capitalize mb-1">
            {claim.claim_type.replace(/_/g, ' ')} · {claim.rights_category.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">{claim.description}</p>
          {claim.claimed_percentage && (
            <p className="text-xs text-neon-purple mt-1">Claimed: {claim.claimed_percentage}%</p>
          )}

          {/* Licensing & Territory */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {claim.licensing_permission && claim.licensing_permission !== 'not_applicable' && (
              <NeonBadge color={LICENSING_COLORS[claim.licensing_permission]}>
                <Scale className="w-3 h-3 inline mr-0.5" />
                License: {claim.licensing_permission}
              </NeonBadge>
            )}
            {claim.territory_restrictions && claim.territory_restrictions.length > 0 && (
              <NeonBadge color="purple">
                <Globe className="w-3 h-3 inline mr-0.5" />
                {claim.territory_restrictions.length} Territory Restriction{claim.territory_restrictions.length > 1 ? 's' : ''}
              </NeonBadge>
            )}
            {claim.co_owner_approval_required && !claim.co_owner_approved && (
              <NeonBadge color="blue">
                <Users className="w-3 h-3 inline mr-0.5" /> Awaiting Co-Owner
              </NeonBadge>
            )}
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={onToggle}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
          {claim.resolution_notes && (
            <div className="p-2 bg-secondary/20 rounded-md">
              <p className="text-xs text-muted-foreground italic">Resolution: {claim.resolution_notes}</p>
            </div>
          )}

          {/* Action buttons for active claims */}
          {['pending', 'under_review', 'co_owner_notified'].includes(claim.status) && (
            <>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Resolution notes (optional)..."
                className="text-xs min-h-[60px]"
              />

              <div className="flex flex-wrap gap-2">
                {isIncoming && claim.status !== 'co_owner_notified' && (
                  <Button size="sm" variant="outline" onClick={() => onAction('notify_co_owner', claim.id)} disabled={isPending}>
                    <Users className="w-3 h-3 mr-1" /> Notify Co-Owner
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-neon-turquoise border-neon-turquoise/30" onClick={() => onAction('approve_claim', claim.id, { resolution_notes: resolutionNotes })} disabled={isPending}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Uphold
                </Button>
                <Button size="sm" variant="outline" className="text-neon-magenta border-neon-magenta/30" onClick={() => onAction('dismiss_claim', claim.id, { resolution_notes: resolutionNotes })} disabled={isPending}>
                  <XCircle className="w-3 h-3 mr-1" /> Dismiss
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => onAction('issue_takedown', claim.id, { resolution_notes: resolutionNotes })} disabled={isPending}>
                  <ShieldAlert className="w-3 h-3 mr-1" /> Issue Takedown
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAction('escalate_claim', claim.id, { resolution_notes: resolutionNotes })} disabled={isPending}>
                  <AlertTriangle className="w-3 h-3 mr-1" /> Escalate
                </Button>
              </div>

              {/* Licensing Permission */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Licensing:</span>
                {['granted', 'denied', 'pending'].map(perm => (
                  <Button
                    key={perm}
                    size="sm"
                    variant="ghost"
                    className={`text-xs ${claim.licensing_permission === perm ? 'text-neon-cyan' : 'text-muted-foreground'}`}
                    onClick={() => onAction('update_licensing', claim.id, { licensing_permission: perm })}
                    disabled={isPending}
                  >
                    {perm}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
}