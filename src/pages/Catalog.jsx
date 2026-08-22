import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Disc3, Shield, Library } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SongCatalogManager from '@/components/catalog/SongCatalogManager';
import ReleaseManager from '@/components/catalog/ReleaseManager';
import GlassCard from '@/components/shared/GlassCard';
import { Link } from 'react-router-dom';

export default function Catalog() {
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

  if (!artistProfile) {
    return (
      <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
        <GlassCard hover={false} className="p-12 text-center">
          <Disc3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">Artist Profile Required</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You need an artist profile before managing your song catalog and releases.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Library className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Catalog Manager</h1>
            <p className="text-xs text-muted-foreground">{artistProfile.artist_name}</p>
          </div>
          <Link to="/rights-management" className="ml-auto">
            <button className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
              <Shield className="w-4 h-4" /> Rights Management
            </button>
          </Link>
        </div>

        <Tabs defaultValue="songs">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="songs" className="gap-1.5"><Disc3 className="w-3.5 h-3.5" /> Songs</TabsTrigger>
            <TabsTrigger value="releases" className="gap-1.5"><Library className="w-3.5 h-3.5" /> Releases</TabsTrigger>
          </TabsList>

          <TabsContent value="songs">
            <SongCatalogManager artistProfile={artistProfile} />
          </TabsContent>

          <TabsContent value="releases">
            <ReleaseManager artistProfile={artistProfile} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}