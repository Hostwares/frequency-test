import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Loader2, Radio, FileText, Link2, Music, Sparkles, ScrollText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  application_started: 'bg-muted text-muted-foreground',
  application_submitted: 'bg-blue-500/15 text-blue-400',
  ai_review_in_progress: 'bg-purple-500/15 text-purple-400',
  manual_review_required: 'bg-amber-500/15 text-amber-400',
  additional_information_requested: 'bg-amber-500/15 text-amber-400',
  verified: 'bg-emerald-500/15 text-emerald-400',
  verified_with_restrictions: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-destructive/15 text-destructive',
  suspended: 'bg-destructive/15 text-destructive',
  verification_expired: 'bg-muted text-muted-foreground',
  appeal_pending: 'bg-purple-500/15 text-purple-400',
};

const BADGE_TYPES = {
  verified_terrestrial_station: 'Verified Terrestrial Station',
  verified_internet_station: 'Verified Internet Station',
  verified_radio_network: 'Verified Radio Network',
  verified_radio_programmer: 'Verified Radio Programmer',
  none: 'Unverified',
};

export default function RadioVerificationReview() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [decision, setDecision] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [verificationType, setVerificationType] = useState('');
  const [requestedInfo, setRequestedInfo] = useState('');
  const [filterMode, setFilterMode] = useState('pending');

  const { data: stations, isLoading } = useQuery({
    queryKey: ['radio-stations-pending'],
    queryFn: () => base44.entities.RadioStation.list('-updated_date', 100),
  });

  const PENDING_STATUSES = ['application_started', 'application_submitted', 'email_verification_pending', 'ai_review_in_progress', 'manual_review_required', 'additional_information_requested', 'appeal_pending'];
  const filteredStations = (stations || []).filter((s) => {
    if (filterMode === 'pending') return PENDING_STATUSES.includes(s.verification_status);
    if (filterMode === 'verified') return ['verified', 'verified_with_restrictions'].includes(s.verification_status);
    if (filterMode === 'rejected') return ['rejected', 'suspended', 'verification_expired'].includes(s.verification_status);
    return true;
  });

  const selected = stations?.find((s) => s.id === selectedId);

  const { data: evidence } = useQuery({
    queryKey: ['radio-evidence', selectedId],
    queryFn: () => base44.entities.RadioVerificationEvidence.filter({ station_id: selectedId }),
    enabled: !!selectedId,
  });

  const { data: reviews } = useQuery({
    queryKey: ['radio-reviews', selectedId],
    queryFn: () => base44.entities.RadioVerificationReview.filter({ station_id: selectedId }),
    enabled: !!selectedId,
  });

  const decide = useMutation({
    mutationFn: async () => {
      const isApprove = decision === 'approved';
      const isReject = decision === 'rejected';
      const isMoreInfo = decision === 'more_info';
      const isRestricted = decision === 'restricted';

      const update = {
        verification_status: isApprove ? 'verified' : isReject ? 'rejected' : isMoreInfo ? 'additional_information_requested' : isRestricted ? 'verified_with_restrictions' : 'manual_review_required',
        decision_reason: decisionReason,
        assigned_reviewer_id: (await base44.auth.me()).id,
      };

      if (isApprove || isRestricted) {
        update.verified_date = new Date().toISOString();
        update.reverification_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        if (verificationType) update.verification_type = verificationType;
        // Assign public handle from official station identifier if not set
        if (!selected.public_handle && selected.official_station_identifier) {
          update.public_handle = selected.official_station_identifier.replace(/[^a-zA-Z0-9_]/g, '');
        }
      }
      if (isMoreInfo) update.requested_information = requestedInfo;

      await base44.entities.RadioStation.update(selectedId, update);
      await base44.entities.RadioVerificationReview.create({
        station_id: selectedId,
        application_id: selectedId,
        ai_score: selected.verification_score,
        risk_level: selected.risk_level,
        flags: selected.verification_flags || [],
        ai_summary: selected.ai_notes,
        review_stage: 'manual_review',
        decision,
        decision_reason: decisionReason,
        requested_information: isMoreInfo ? requestedInfo : '',
        review_date: new Date().toISOString(),
      });
      const me = await base44.auth.me();
      await base44.entities.AuditLog.create({
        user_id: me.id,
        user_name: me.full_name,
        user_email: me.email,
        action: 'radio_verification_decision',
        action_category: 'admin',
        entity_type: 'RadioStation',
        entity_id: selectedId,
        details: `${decision} — ${selected.official_station_name} (${selected.official_station_identifier || 'no id'})`,
        is_security_event: true,
        severity: decision === 'rejected' ? 'warning' : 'info',
        metadata: { decision, decision_reason: decisionReason, verification_type: verificationType },
      });
    },
    onSuccess: () => {
      toast({ title: 'Decision recorded', description: `Application marked ${decision}` });
      setDecision('');
      setDecisionReason('');
      setVerificationType('');
      setRequestedInfo('');
      qc.invalidateQueries({ queryKey: ['radio-stations-pending'] });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const runAi = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('verifyRadioApplication', { station_id: selectedId });
    },
    onSuccess: () => {
      toast({ title: 'AI review complete', description: 'Evidence & score updated — review the results below.' });
      qc.invalidateQueries({ queryKey: ['radio-stations-pending'] });
      qc.invalidateQueries({ queryKey: ['radio-evidence', selectedId] });
      qc.invalidateQueries({ queryKey: ['radio-reviews', selectedId] });
    },
    onError: (err) => toast({ title: 'AI review failed', description: err.message, variant: 'destructive' }),
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
          <Radio className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Radio Verification Review</h1>
          <p className="text-sm text-muted-foreground">Human review of radio station & programmer applications</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="space-y-3">
          <h2 className="font-medium text-foreground">Applications ({filteredStations.length})</h2>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[['pending', 'Pending'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['all', 'All']].map(([mode, label]) => (
              <button key={mode} onClick={() => setFilterMode(mode)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${filterMode === mode ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {filteredStations.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedId(s.id); setDecision(''); setDecisionReason(''); setVerificationType(s.verification_type || ''); setRequestedInfo(s.requested_information || ''); }}
                className={`w-full text-left rounded-xl border p-3 transition-all ${selectedId === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground truncate">{s.official_station_name || 'Unnamed'}</span>
                  <span className="text-xs font-mono text-muted-foreground">{s.official_station_identifier || ''}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground capitalize">{s.station_type?.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[s.verification_status] || ''}`}>
                    {s.verification_status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className={s.verification_score >= 70 ? 'text-emerald-400' : s.verification_score >= 50 ? 'text-amber-400' : 'text-destructive'}>
                    Score: {s.verification_score}/100
                  </span>
                  <span className="text-muted-foreground">Risk: {s.risk_level}</span>
                </div>
              </button>
            ))}
            {filteredStations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No applications in this view.</p>
            )}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
              Select an application to review
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selected.official_station_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selected.official_station_identifier} · {selected.band} {selected.frequency}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {[selected.city, selected.region, selected.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${selected.verification_score >= 70 ? 'text-emerald-400' : selected.verification_score >= 50 ? 'text-amber-400' : 'text-destructive'}`}>
                      {selected.verification_score}/100
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[selected.verification_status] || ''}`}>
                      {selected.verification_status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {selected.verification_flags?.length > 0 && (
                  <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                      <ShieldAlert className="w-4 h-4" /> AI flags
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                      {selected.verification_flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                {selected.ai_notes && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">AI summary: </span>{selected.ai_notes}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
                  <Detail label="Type" value={selected.station_type?.replace(/_/g, ' ')} />
                  {selected.terrestrial_subtype && <Detail label="Subtype" value={selected.terrestrial_subtype} />}
                  <Detail label="Band" value={selected.band} />
                  <Detail label="Frequency" value={selected.frequency} />
                  <Detail label="Website" value={selected.website} link />
                  <Detail label="Stream" value={selected.stream_url} link />
                  <Detail label="Schedule" value={selected.schedule_url} link />
                  <Detail label="Regulator" value={selected.regulator} />
                  <Detail label="License #" value={selected.government_license_number} />
                  <Detail label="License holder" value={selected.license_holder} />
                  <Detail label="Parent company" value={selected.parent_company} />
                  <Detail label="Network affiliation" value={selected.network_affiliation} />
                  <Detail label="Ownership type" value={selected.ownership_type} />
                  <Detail label="License expires" value={selected.license_expiration_date} />
                  <Detail label="Time zone" value={selected.time_zone} />
                  <Detail label="Language" value={selected.language} />
                  <Detail label="Applicant" value={selected.applicant_full_name} />
                  <Detail label="Applicant title" value={selected.applicant_title} />
                  <Detail label="Role" value={selected.applicant_station_role?.replace(/_/g, ' ')} />
                  <Detail label="Work email" value={selected.applicant_work_email} link />
                  <Detail label="Work phone" value={selected.applicant_work_phone} />
                  <Detail label="Department" value={selected.applicant_department} />
                  <Detail label="Manager" value={selected.applicant_manager_name} />
                  <Detail label="LinkedIn" value={selected.applicant_linkedin} link />
                  <Detail label="Submitted" value={selected.application_submitted_date ? new Date(selected.application_submitted_date).toLocaleString() : ''} />
                  <Detail label="Public handle" value={selected.public_handle ? `^${selected.public_handle}` : ''} />
                </div>

                {selected.genres_programmed?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5"><Music className="w-3.5 h-3.5" /> Genres programmed</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.genres_programmed.map((g) => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}
                    </div>
                  </div>
                )}

                {selected.station_description && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1">Station description</div>
                    <p className="text-sm text-foreground">{selected.station_description}</p>
                  </div>
                )}

                {hasSocial(selected) && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Social links</div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {Object.entries(selected.social_links || {}).filter(([, v]) => v).map(([k, v]) => (
                        <a key={k} href={v} target="_blank" rel="noreferrer" className="text-primary hover:underline capitalize">{k}</a>
                      ))}
                    </div>
                  </div>
                )}

                {selected.verification_documents?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Verification documents ({selected.verification_documents.length})</div>
                    <div className="space-y-1.5">
                      {selected.verification_documents.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-1.5">
                          <span className="text-foreground capitalize">{d.document_type?.replace(/_/g, ' ')}</span>
                          {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">View</a>}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Sensitive — not shown publicly.</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2 items-center">
                  <Button variant="outline" size="sm" disabled={runAi.isPending} onClick={() => runAi.mutate()}>
                    {runAi.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Run AI verification
                  </Button>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><ScrollText className="w-3 h-3" /> Decisions are recorded in the audit log</span>
                </div>
              </div>

              {evidence?.length > 0 && (
                <div className="rounded-xl border border-border p-5">
                  <h3 className="font-medium text-foreground mb-3">Verification evidence</h3>
                  <div className="space-y-2">
                    {evidence.map((e) => (
                      <div key={e.id} className="flex items-start justify-between gap-3 text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                        <div>
                          <div className="font-medium text-foreground capitalize">{e.evidence_type?.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-muted-foreground">{e.source}</div>
                          {e.ai_notes && <div className="text-xs text-muted-foreground mt-0.5">{e.ai_notes}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px]">{e.match_result}</Badge>
                          <div className="text-xs text-muted-foreground mt-1">+{e.confidence_score} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border p-5">
                <h3 className="font-medium text-foreground mb-3">Human review decision</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Final approval authority belongs to authorized administrators. AI assists but does not make the sole final decision.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1.5 block">Decision</Label>
                    <div className="flex flex-wrap gap-2">
                      {['approved', 'restricted', 'more_info', 'rejected'].map((d) => (
                        <Button
                          key={d}
                          variant={decision === d ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDecision(d)}
                        >
                          {d === 'approved' && <ShieldCheck className="w-4 h-4 mr-1" />}
                          {d.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {(decision === 'approved' || decision === 'restricted') && (
                    <div>
                      <Label className="mb-1.5 block">Verification badge type</Label>
                      <div className="flex flex-wrap gap-2">
                        {['verified_terrestrial_station', 'verified_internet_station', 'verified_radio_network', 'verified_radio_programmer'].map((t) => (
                          <Button
                            key={t}
                            variant={verificationType === t ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setVerificationType(t)}
                          >
                            {BADGE_TYPES[t]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {decision === 'more_info' && (
                    <div>
                      <Label className="mb-1.5 block">Information requested from applicant</Label>
                      <Textarea value={requestedInfo} onChange={(e) => setRequestedInfo(e.target.value)} rows={3} />
                    </div>
                  )}
                  <div>
                    <Label className="mb-1.5 block">Decision reason</Label>
                    <Textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} rows={2} />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!decision || decide.isPending}
                    onClick={() => decide.mutate()}
                  >
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

function hasSocial(s) {
  return s?.social_links && Object.values(s.social_links).some(Boolean);
}

function Detail({ label, value, link }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground truncate">
        {link ? <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">{value}</a> : String(value)}
      </dd>
    </div>
  );
}