import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import { getOnboardingSteps, getDashboardForRole } from '@/lib/onboardingSteps';

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [redirecting, setRedirecting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const role = user?.role || 'fan';
  const steps = getOnboardingSteps(role);

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding-progress', user?.id],
    queryFn: async () => {
      const existing = await base44.entities.OnboardingProgress.filter(
        { user_id: user.id },
        '-created_date',
        1
      );
      if (existing.length > 0) return existing[0];
      return await base44.entities.OnboardingProgress.create({
        user_id: user.id,
        role,
        completed_steps: [],
        is_complete: false,
      });
    },
    enabled: !!user?.id,
  });

  const completedSteps = progress?.completed_steps || [];
  const isComplete = steps.length > 0 && steps.every(s => completedSteps.includes(s.key));

  useEffect(() => {
    if (isComplete && !redirecting) {
      setRedirecting(true);
      if (progress && !progress.is_complete) {
        base44.entities.OnboardingProgress.update(progress.id, {
          is_complete: true,
          completed_date: new Date().toISOString(),
        }).catch(() => {});
      }
      const timer = setTimeout(() => {
        navigate(getDashboardForRole(role));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, redirecting, progress, role, navigate]);

  const handleToggleStep = async (stepKey) => {
    if (!progress) return;

    const currentSteps = progress.completed_steps || [];
    const newSteps = currentSteps.includes(stepKey)
      ? currentSteps.filter(s => s !== stepKey)
      : [...currentSteps, stepKey];

    queryClient.setQueryData(['onboarding-progress', user?.id], {
      ...progress,
      completed_steps: newSteps,
    });

    try {
      await base44.entities.OnboardingProgress.update(progress.id, {
        completed_steps: newSteps,
        is_complete: false,
      });
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', user?.id] });
    } catch {
      queryClient.setQueryData(['onboarding-progress', user?.id], progress);
      toast.error('Could not update step');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabel = role.replace(/_/g, ' ');

  return (
    <div className="p-4 md:p-8 pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Welcome to Frequency</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete these steps to get the most out of your {roleLabel} account.
        </p>
      </div>

      <OnboardingChecklist
        steps={steps}
        completedSteps={completedSteps}
        onToggleStep={handleToggleStep}
        isComplete={isComplete}
      />

      {redirecting && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground mt-4"
        >
          Redirecting to your dashboard…
        </motion.p>
      )}
    </div>
  );
}