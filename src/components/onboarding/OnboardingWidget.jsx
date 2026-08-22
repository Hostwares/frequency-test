import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircle2, Circle, ArrowRight, ChevronDown, ChevronUp, X, Sparkles
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';
import { getOnboardingSteps } from '@/lib/onboardingSteps';

export default function OnboardingWidget() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const role = user?.role || 'fan';
  const steps = getOnboardingSteps(role);

  const { data: progress } = useQuery({
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
  const completedCount = steps.filter(s => completedSteps.includes(s.key)).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const isComplete = completedCount === steps.length;

  const handleToggleStep = async (stepKey) => {
    if (!progress) return;

    const currentSteps = progress.completed_steps || [];
    const newSteps = currentSteps.includes(stepKey)
      ? currentSteps.filter(s => s !== stepKey)
      : [...currentSteps, stepKey];

    const newIsComplete = steps.every(s => newSteps.includes(s.key));

    queryClient.setQueryData(['onboarding-progress', user?.id], {
      ...progress,
      completed_steps: newSteps,
      is_complete: newIsComplete,
    });

    try {
      await base44.entities.OnboardingProgress.update(progress.id, {
        completed_steps: newSteps,
        is_complete: newIsComplete,
        ...(newIsComplete ? { completed_date: new Date().toISOString() } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', user?.id] });
    } catch {
      queryClient.setQueryData(['onboarding-progress', user?.id], progress);
      toast.error('Could not update step');
    }
  };

  if (!user || dismissed || isComplete) return null;

  const roleLabel = role.replace(/_/g, ' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <GlassCard hover={false} className="p-4 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-display font-bold">
                {roleLabel} Setup
              </h3>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{steps.length}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5 mt-1.5" />
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center flex-shrink-0"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 mt-3">
                {steps.map((step) => {
                  const isDone = completedSteps.includes(step.key);
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isDone ? 'bg-neon-turquoise/5' : 'hover:bg-accent/50'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleStep(step.key)}
                        className="flex-shrink-0 transition-transform hover:scale-110"
                        aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-neon-turquoise" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <StepIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          isDone ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {step.label}
                        </p>
                      </div>
                      {step.link && (
                        <Link
                          to={step.link}
                          className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center flex-shrink-0"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}