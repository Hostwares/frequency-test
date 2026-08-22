import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Shield, FileText, ShieldCheck, Gavel, ShieldAlert,
  Clock, XCircle
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SplitSheetsTab from '@/components/rights/SplitSheetsTab';
import OwnershipVerificationTab from '@/components/rights/OwnershipVerificationTab';
import ClaimsManager from '@/components/rights/ClaimsManager';
import DMAPortal from '@/components/rights/DMCAPortal';

export default function RightsManagement() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: artistProfile } = useQuery({
    queryKey: ['my-artist-profile', user?.id],
    queryFn: () => base44.entities.ArtistProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    select: (data) => data?.[0],
  });

  const { data: mySongs = [] } = useQuery({
    queryKey: ['catalog-songs-rights', artistProfile?.id],
    queryFn: () => base44.entities.Song.filter({ artist_profile_id: artistProfile?.id }),
    enabled: !!artistProfile?.id,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['rights-claims', user?.id],
    queryFn: () => base44.entities.RightsClaim.filter({ claimant_user_id: user?.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const { data: incomingClaims = [] } = useQuery({
    queryKey: ['incoming-claims', artistProfile?.id],
    queryFn: () => base44.entities.RightsClaim.filter({ artist_profile_id: artistProfile?.id }, '-created_date'),
    enabled: !!artistProfile?.id,
  });

  const { data: dmcaNotices = [] } = useQuery({
    queryKey: ['dmca-notices'],
    queryFn: () => base44.entities.DMCANotice.list('-created_date', 50),
  });

  const verifiedSongs = mySongs.filter(s => s.rights_verified).length;
  const pendingClaims = [...claims, ...incomingClaims].filter(c =>
    ['pending', 'under_review', 'co_owner_notified'].includes(c.status)
  ).length;
  const activeDmca = dmcaNotices.filter(d => !['dismissed', 'restored'].includes(d.status)).length;
  const removedContent = dmcaNotices.filter(d => d.status === 'content_removed').length;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Rights Management</h1>
            <p className="text-xs text-muted-foreground">
              Ownership verification, split sheets, co-owner approvals, copyright claims, takedowns & DMCA portal
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard hover={false} className="p-4">
            <ShieldCheck className="w-5 h-5 text-neon-turquoise mb-2" />
            <p className="text-2xl font-display font-bold">{verifiedSongs}</p>
            <p className="text-xs text-muted-foreground">Verified Songs</p>
          </GlassCard>
          <GlassCard hover={false} className="p-4">
            <Gavel className="w-5 h-5 text-neon-purple mb-2" />
            <p className="text-2xl font-display font-bold">{pendingClaims}</p>
            <p className="text-xs text-muted-foreground">Pending Claims</p>
          </GlassCard>
          <GlassCard hover={false} className="p-4">
            <ShieldAlert className="w-5 h-5 text-destructive mb-2" />
            <p className="text-2xl font-display font-bold">{activeDmca}</p>
            <p className="text-xs text-muted-foreground">Active DMCA</p>
          </GlassCard>
          <GlassCard hover={false} className="p-4">
            <XCircle className="w-5 h-5 text-neon-magenta mb-2" />
            <p className="text-2xl font-display font-bold">{removedContent}</p>
            <p className="text-xs text-muted-foreground">Content Removed</p>
          </GlassCard>
        </div>

        <Tabs defaultValue="splits">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="splits" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Split Sheets</TabsTrigger>
            <TabsTrigger value="verification" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Verification</TabsTrigger>
            <TabsTrigger value="claims" className="gap-1.5"><Gavel className="w-3.5 h-3.5" /> Claims</TabsTrigger>
            <TabsTrigger value="dmca" className="gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> DMCA Portal</TabsTrigger>
          </TabsList>

          <TabsContent value="splits">
            <SplitSheetsTab artistProfile={artistProfile} />
          </TabsContent>

          <TabsContent value="verification">
            <OwnershipVerificationTab artistProfile={artistProfile} />
          </TabsContent>

          <TabsContent value="claims">
            <ClaimsManager user={user} artistProfile={artistProfile} />
          </TabsContent>

          <TabsContent value="dmca">
            <DMAPortal user={user} artistProfile={artistProfile} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}