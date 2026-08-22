import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Briefcase, ShieldCheck, Loader2, Globe, MapPin, Mail } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-400',
  under_review: 'bg-blue-500/15 text-blue-400',
  verified: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-destructive/15 text-destructive',
  more_info: 'bg-amber-500/15 text-amber-400',
  suspended: 'bg-destructive/15 text-destructive',
};

export default function BusinessPartnerReview() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [requestedInfo, setRequestedInfo] = useState('');

  const { data: partners, isLoading } = useQuery({
    queryKey: ['business-partners-pending'],
    queryFn: () => base44.entities.BusinessPartner.list('-updated_date', 100),
  });

  const selected = partners?.find((p) => p.id === selectedId);

  const decide = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const isApprove = decision === 'verified';
      const isReject = decision === 'rejected';
      const isMoreInfo = decision === 'more_info';

      const update = {
        verification_status: decision,
        decision_reason: reason,
        assigned_reviewer_id: user.id,
        assigned_reviewer_name: user.full_name,
      };

      if (isApprove) {
        update.is_verified = true;
        update.verified_date = new Date().toISOString();
        update.verification_type = 'verified_business_partner';
      }

      if (isMoreInfo) update.requested_information = requestedInfo;

      await base44.entities.BusinessPartner.update(selectedId, update);
    },
    onSuccess: () => {
      toast({ title: 'Decision recorded', description: `Profile marked ${decision}` });
      setDecision('');
      setReason('');
      setRequestedInfo('');
      qc.invalidateQueries({ queryKey: ['business-partners-pending'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Business Partner Verification</h1>
          <p className="text-sm text-muted-foreground">Admin review of business partner profiles</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="space-y-3">
          <h2 className="font-medium text-foreground">Profiles ({partners?.length || 0})</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {partners?.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setDecision(''); setReason(p.decision_reason || ''); setRequestedInfo(p.requested_information || ''); }}
                className={`w-full text-left rounded-xl border p-3 transition-all ${selectedId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground truncate">{p.business_name || 'Unnamed'}</span>
                  <span className="text-xs font-mono text-muted-foreground">+{p.public_handle}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground capitalize">{p.partner_category?.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[p.verification_status] || ''}`}>
                    {p.verification_status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </button>
            ))}
            {(!partners || partners.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No business partner profiles yet.</p>
            )}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
              Select a profile to review
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selected.business_name}</h2>
                    <p className="text-sm text-muted-foreground font-mono">+{selected.public_handle}</p>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{selected.partner_category?.replace(/_/g, ' ')}</p>
                  </div>
                  <Badge variant="outline" className={`${STATUS_COLORS[selected.verification_status] || ''}`}>
                    {selected.verification_status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-3">{selected.description}</p>
                )}
                {selected.services_offered?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-1">Services</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.services_offered.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
                  <Detail icon={Globe} label="Website" value={selected.website} link />
                  <Detail icon={Mail} label="Contact" value={selected.contact_email} />
                  <Detail icon={MapPin} label="Location" value={[selected.city, selected.region, selected.country].filter(Boolean).join(', ')} />
                  <Detail label="Legal name" value={selected.legal_name} />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {selected.qr_promotions_enabled && <Badge variant="outline" className="text-neon-cyan border-neon-cyan/30 text-xs">QR Promotions</Badge>}
                  {selected.referral_program_enabled && <Badge variant="outline" className="text-neon-purple border-neon-purple/30 text-xs">Referral</Badge>}
                  {selected.revenue_share_enabled && <Badge variant="outline" className="text-neon-turquoise border-neon-turquoise/30 text-xs">Revenue Share</Badge>}
                </div>
              </div>

              <div className="rounded-xl border border-border p-5">
                <h3 className="font-medium text-foreground mb-3">Verification decision</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Final approval authority belongs to authorized administrators.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1.5 block">Decision</Label>
                    <div className="flex flex-wrap gap-2">
                      {['verified', 'more_info', 'rejected'].map((d) => (
                        <Button
                          key={d}
                          variant={decision === d ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDecision(d)}
                        >
                          {d === 'verified' && <ShieldCheck className="w-4 h-4 mr-1" />}
                          {d === 'verified' ? 'Verify' : d.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {decision === 'more_info' && (
                    <div>
                      <Label className="mb-1.5 block">Information requested</Label>
                      <Textarea value={requestedInfo} onChange={(e) => setRequestedInfo(e.target.value)} rows={3} />
                    </div>
                  )}
                  <div>
                    <Label className="mb-1.5 block">Reason / notes</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                  </div>
                  <Button className="w-full" disabled={!decision || decide.isPending} onClick={() => decide.mutate()}>
                    {decide.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Submit ${decision || 'decision'}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value, link }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </dt>
      <dd className="text-foreground truncate">
        {link ? <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">{value}</a> : String(value)}
      </dd>
    </div>
  );
}