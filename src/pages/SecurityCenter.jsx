import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Shield, Ban, Flag, UserCheck, Clock, CheckCircle2, AlertCircle, LifeBuoy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const REPORT_STATUS_CONFIG = {
  pending: { color: 'cyan', icon: Clock, label: 'Pending' },
  under_review: { color: 'purple', icon: AlertCircle, label: 'Under Review' },
  resolved_warning: { color: 'blue', icon: CheckCircle2, label: 'Resolved — Warning' },
  resolved_banned: { color: 'magenta', icon: Ban, label: 'Resolved — Banned' },
  dismissed: { color: 'cyan', icon: CheckCircle2, label: 'Dismissed' },
};

export default function SecurityCenter() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blockedUsers = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['my-blocked-users', user?.id],
    queryFn: () => base44.entities.UserBlock.filter({ blocker_user_id: user.id, is_active: true }, '-created_date'),
    enabled: !!user?.id,
  });

  const { data: myReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['my-reports', user?.id],
    queryFn: () => base44.entities.UserReport.filter({ reporter_user_id: user.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const unblockMutation = useMutation({
    mutationFn: (blockId) => base44.entities.UserBlock.update(blockId, { is_active: false }),
    onSuccess: () => {
      toast.success('User unblocked.');
      queryClient.invalidateQueries(['my-blocked-users']);
    },
    onError: () => toast.error('Failed to unblock user.'),
  });

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-neon-purple/10">
            <Shield className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Security Center</h1>
            <p className="text-xs text-muted-foreground">Manage blocked users and review your reports</p>
          </div>
        </div>

        <Link
          to="/help"
          className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors mb-6"
        >
          <LifeBuoy className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Help & Guide</p>
            <p className="text-xs text-muted-foreground">Learn how your account works and get the most out of the platform</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Link>

        <Tabs defaultValue="blocked">
          <TabsList className="bg-secondary/50 border border-border/30">
            <TabsTrigger value="blocked" className="gap-2">
              <Ban className="w-3.5 h-3.5" />
              Blocked Users ({blockedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-3.5 h-3.5" />
              My Reports ({myReports.length})
            </TabsTrigger>
          </TabsList>

          {/* Blocked Users */}
          <TabsContent value="blocked" className="mt-6">
            {loadingBlocks ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : blockedUsers.length === 0 ? (
              <GlassCard hover={false} className="p-12 text-center">
                <UserCheck className="w-12 h-12 text-neon-cyan/40 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No blocked users</h3>
                <p className="text-sm text-muted-foreground">You haven't blocked anyone yet.</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map(block => (
                  <GlassCard key={block.id} hover={false} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Ban className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{block.blocked_user_name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">
                          Blocked on {new Date(block.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unblockMutation.mutate(block.id)}
                      disabled={unblockMutation.isPending}
                      className="gap-2 border-green-500/30 text-green-500 hover:bg-green-500/10"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Unblock
                    </Button>
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Reports */}
          <TabsContent value="reports" className="mt-6">
            {loadingReports ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : myReports.length === 0 ? (
              <GlassCard hover={false} className="p-12 text-center">
                <Flag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No reports filed</h3>
                <p className="text-sm text-muted-foreground">You haven't reported any users.</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {myReports.map(report => {
                  const statusConfig = REPORT_STATUS_CONFIG[report.status] || REPORT_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <GlassCard key={report.id} hover={false} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center">
                            <Flag className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Reported: {report.reported_user_name || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{(report.report_type || 'unknown').replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <NeonBadge color={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </NeonBadge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 p-3 rounded-lg bg-secondary/20">
                        {report.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Filed on {new Date(report.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}