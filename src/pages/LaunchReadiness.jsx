import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Rocket, CheckCircle2, Circle, Loader2, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';
import AccessDenied from '@/components/admin/AccessDenied';
import { toast } from 'sonner';

const CATEGORY_LABELS = {
  infrastructure: 'Infrastructure',
  payments: 'Payments & Billing',
  content: 'Content & Catalog',
  security: 'Security & Access',
  legal: 'Legal & Compliance',
  marketing: 'Marketing & Outreach',
  launch: 'Launch Day',
};

const DEFAULT_ITEMS = [
  { title: 'Production environment deployed', description: 'App is live and accessible at the production URL', category: 'infrastructure' },
  { title: 'Database backups configured', description: 'Automated daily backups are enabled and verified', category: 'infrastructure' },
  { title: 'Payment gateway configured', description: 'Base44 Payments (Wix) is set up and tested with a live transaction', category: 'payments' },
  { title: 'Subscription plans created', description: 'All fan and artist subscription tiers are configured', category: 'payments' },
  { title: 'Payout system verified', description: 'Artist payout flow is tested end-to-end', category: 'payments' },
  { title: 'Seed artists onboarded', description: 'At least 10 artists have profiles and uploaded music', category: 'content' },
  { title: 'Default platform artists set', description: 'Default artists every fan gets are configured', category: 'content' },
  { title: 'Hero banners created', description: 'Homepage banner rotation is populated with active banners', category: 'content' },
  { title: 'Frequency communities seeded', description: 'At least 5 Frequency communities are created and active', category: 'content' },
  { title: 'Admin accounts secured', description: 'All admin accounts have strong passwords and 2FA', category: 'security' },
  { title: 'Role-based access verified', description: 'Each role (fan, artist, admin, etc.) has correct permissions', category: 'security' },
  { title: 'Moderation queue tested', description: 'Report and flag workflows are verified', category: 'security' },
  { title: 'Terms of Service published', description: 'Legal terms are live at /legal/terms', category: 'legal' },
  { title: 'Privacy Policy published', description: 'Privacy policy is live at /legal/privacy', category: 'legal' },
  { title: 'DMCA Policy published', description: 'DMCA policy is live at /legal/dmca', category: 'legal' },
  { title: 'Launch announcement prepared', description: 'Email blast and social posts are drafted and scheduled', category: 'marketing' },
  { title: 'Onboarding checklist tested', description: 'Role-based onboarding flow is verified for each role', category: 'marketing' },
  { title: 'Final smoke test completed', description: 'Full end-to-end test of all critical user journeys', category: 'launch' },
  { title: 'Support channels live', description: 'Support email and help resources are accessible', category: 'launch' },
];

export default function LaunchReadiness() {
  const { user } = useAuth();
  const { isMasterAdmin, isLoading: permsLoading } = useAdminPermissions();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['launch-readiness-items'],
    queryFn: async () => {
      const existing = await base44.entities.LaunchReadinessItem.list('sort_order', 100);
      if (existing.length === 0) {
        const seeded = await base44.entities.LaunchReadinessItem.bulkCreate(
          DEFAULT_ITEMS.map((item, idx) => ({ ...item, sort_order: idx, status: 'pending' }))
        );
        return seeded.sort((a, b) => a.sort_order - b.sort_order);
      }
      return existing;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ item, newStatus }) => {
      return base44.entities.LaunchReadinessItem.update(item.id, {
        status: newStatus,
        updated_by_user_id: user.id,
        updated_by_name: user.full_name || user.email,
      });
    },
    onMutate: async ({ item, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['launch-readiness-items'] });
      const previous = queryClient.getQueryData(['launch-readiness-items']);
      queryClient.setQueryData(['launch-readiness-items'], (old) =>
        old.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
      return { previous };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['launch-readiness-items'], context.previous);
      toast.error('Failed to update item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-readiness-items'] });
    },
  });

  if (permsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isMasterAdmin) {
    return <AccessDenied message="The Launch Readiness checklist is restricted to Master Admins only." icon={Lock} />;
  }

  const completedCount = items.filter((i) => i.status === 'complete').length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const categories = Object.keys(CATEGORY_LABELS);
  const itemsByCategory = categories
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: items.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const handleToggle = (item) => {
    const newStatus = item.status === 'complete' ? 'pending' : 'complete';
    toggleMutation.mutate({ item, newStatus });
  };

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Launch Readiness</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pre-launch requirements checklist. Master Admin access only.
        </p>
      </div>

      <GlassCard hover={false} className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">Overall Progress</p>
            <p className="text-xs text-muted-foreground">{completedCount} of {totalCount} requirements complete</p>
          </div>
          <span className="text-3xl font-bold text-primary">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2.5" />
        {progressPercent === 100 && (
          <p className="text-sm text-neon-turquoise font-medium mt-3 text-center">
            🚀 All requirements met — ready for launch!
          </p>
        )}
      </GlassCard>

      <div className="space-y-6">
        {itemsByCategory.map((group) => (
          <div key={group.category}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.items.map((item) => {
                const isComplete = item.status === 'complete';
                return (
                  <GlassCard key={item.id} className={`p-4 ${isComplete ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-neon-turquoise" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={isComplete}
                        onCheckedChange={() => handleToggle(item)}
                        disabled={toggleMutation.isPending}
                        aria-label={`Toggle ${item.title}`}
                      />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}