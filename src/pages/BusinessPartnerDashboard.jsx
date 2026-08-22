import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Briefcase, ShieldCheck, ShieldAlert, Loader2, MapPin, Globe, Mail } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-400',
  under_review: 'bg-blue-500/15 text-blue-400',
  verified: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-destructive/15 text-destructive',
  more_info: 'bg-amber-500/15 text-amber-400',
  suspended: 'bg-destructive/15 text-destructive',
};

export default function BusinessPartnerDashboard() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-business-partner'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.BusinessPartner.filter({ user_id: user.id });
      return list?.[0] || null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Business Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your commercial partner profile</p>
        </div>
      </div>

      {!profile ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">You haven't created a business partner profile yet.</p>
          <Link to="/business-partner-application" className="text-primary hover:underline font-medium">
            Create your business partner profile →
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="h-28 bg-gradient-neon" />
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-10">
                <div className="w-20 h-20 rounded-xl bg-card border-2 border-card flex items-center justify-center">
                  <Briefcase className="w-10 h-10 text-primary" />
                </div>
                <Badge variant="outline" className={`${STATUS_COLORS[profile.verification_status]} mb-2`}>
                  {profile.verification_status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <h2 className="text-xl font-bold mt-3">{profile.business_name}</h2>
              <p className="text-sm text-muted-foreground font-mono">+{profile.public_handle}</p>
              <p className="text-sm text-muted-foreground mt-1 capitalize">{profile.partner_category?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {profile.verification_status === 'pending' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Awaiting verification</div>
                <p className="text-sm text-muted-foreground">
                  Your profile is pending administrator review. It will not be visible to the public until verified.
                </p>
              </div>
            </div>
          )}

          {profile.verification_status === 'verified' && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Verified Business Partner</div>
                <p className="text-sm text-muted-foreground">Your profile is live and your +handle is active.</p>
              </div>
            </div>
          )}

          {profile.verification_status === 'more_info' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="font-medium text-amber-400 mb-1">More information requested</div>
              <p className="text-sm text-muted-foreground">{profile.requested_information || 'An administrator will provide details.'}</p>
            </div>
          )}

          {profile.verification_status === 'rejected' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="font-medium text-destructive mb-1">Application rejected</div>
              <p className="text-sm text-muted-foreground">{profile.decision_reason || 'Contact support for details.'}</p>
            </div>
          )}

          {profile.description && (
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-medium text-foreground mb-2">About</h3>
              <p className="text-sm text-muted-foreground">{profile.description}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCard icon={MapPin} title="Location" value={[profile.city, profile.region, profile.country].filter(Boolean).join(', ')} />
            <InfoCard icon={Globe} title="Website" value={profile.website} link />
            <InfoCard icon={Mail} title="Contact" value={profile.contact_email} />
            <InfoCard icon={Briefcase} title="Services" value={(profile.services_offered || []).join(', ')} />
          </div>

          {profile.verification_status === 'verified' && (
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-medium text-foreground mb-3">Programs</h3>
              <div className="flex flex-wrap gap-2">
                {profile.qr_promotions_enabled && <Badge variant="outline" className="text-neon-cyan border-neon-cyan/30">QR Promotions</Badge>}
                {profile.referral_program_enabled && <Badge variant="outline" className="text-neon-purple border-neon-purple/30">Referral Program</Badge>}
                {profile.revenue_share_enabled && <Badge variant="outline" className="text-neon-turquoise border-neon-turquoise/30">Revenue Share</Badge>}
                {!profile.qr_promotions_enabled && !profile.referral_program_enabled && !profile.revenue_share_enabled && (
                  <p className="text-sm text-muted-foreground">No programs enabled.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, title, value, link }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="w-4 h-4" /> {title}
      </div>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate block">{value}</a>
      ) : (
        <p className="text-sm text-foreground truncate">{value}</p>
      )}
    </div>
  );
}