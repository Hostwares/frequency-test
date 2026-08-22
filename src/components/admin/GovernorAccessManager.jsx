import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  KeyRound, Send, Loader2, CheckCircle2, Mail, ShieldCheck,
  Users, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function GovernorAccessManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sentTo, setSentTo] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['governor-members-for-codes'],
    queryFn: () => base44.entities.AcademyMember.filter(
      { application_status: 'approved', membership_status: 'active', is_voting_council: true },
      '-member_since_date', 200
    ),
  });

  const { data: recentCodes = [] } = useQuery({
    queryKey: ['recent-governor-codes'],
    queryFn: () => base44.entities.GovernorAccessCode.filter(
      {}, '-generated_date', 20
    ),
  });

  const sendMutation = useMutation({
    mutationFn: (memberId) => base44.functions.invoke('sendGovernorAccessCode', {
      action: 'send_code',
      member_id: memberId,
    }),
    onSuccess: (res, memberId) => {
      const data = res.data || res;
      if (data.success) {
        const member = members.find(m => m.id === memberId);
        setSentTo(member?.applicant_name || 'Governor');
        qc.invalidateQueries({ queryKey: ['recent-governor-codes'] });
        setTimeout(() => setSentTo(null), 4000);
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (codeId) => base44.functions.invoke('sendGovernorAccessCode', {
      action: 'revoke_code',
      code_id: codeId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-governor-codes'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <GlassCard hover={false} className="p-4 bg-gradient-card">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-neon-turquoise flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-display font-semibold mb-1">Governor Private Access Codes</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Send a confidential one-time access code to a verified governor. The code is delivered
              via email and allows the governor to view their voting completion badge on the Academy Dashboard.
              Codes expire after 7 days.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Governor list */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">Voting Council Governors</h3>
          <NeonBadge color="purple">{members.length}</NeonBadge>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No active voting council members found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-secondary/20 rounded-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{member.applicant_name}</p>
                    <NeonBadge color="cyan">
                      {member.governor_tier || 'member'}
                    </NeonBadge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {member.applicant_email}
                    {member.assigned_categories?.length > 0 && (
                      <> · {member.assigned_categories.length} categories assigned</>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-shrink-0"
                  disabled={sendMutation.isPending}
                  onClick={() => sendMutation.mutate(member.id)}
                >
                  {sendMutation.isPending && sendMutation.variables === member.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Send Code</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {sentTo && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-neon-turquoise/10 border border-neon-turquoise/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-neon-turquoise flex-shrink-0" />
            <p className="text-xs text-foreground">
              Access code sent to {sentTo} via email.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Recent codes */}
      {recentCodes.length > 0 && (
        <GlassCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-neon-magenta" />
            <h3 className="text-sm font-display font-semibold">Recently Issued Codes</h3>
          </div>
          <div className="space-y-1.5">
            {recentCodes.map(code => (
              <div key={code.id} className="flex items-center justify-between gap-2 p-2.5 bg-secondary/20 rounded-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium text-foreground truncate">{code.governor_name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {code.governor_email}
                    {code.generated_date && (
                      <> · {new Date(code.generated_date).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {code.is_used ? (
                    <NeonBadge color="turquoise">Used</NeonBadge>
                  ) : code.is_active ? (
                    <NeonBadge color="cyan">Active</NeonBadge>
                  ) : (
                    <NeonBadge color="magenta">Revoked</NeonBadge>
                  )}
                  {code.is_active && !code.is_used && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => revokeMutation.mutate(code.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}