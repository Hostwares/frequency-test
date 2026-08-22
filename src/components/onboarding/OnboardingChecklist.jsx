import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ArrowRight, PartyPopper } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/shared/GlassCard';

export default function OnboardingChecklist({ steps, completedSteps, onToggleStep, isComplete }) {
  const completedCount = steps.filter(s => completedSteps.includes(s.key)).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  if (isComplete) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <GlassCard hover={false} className="p-8 text-center">
          <PartyPopper className="w-12 h-12 mx-auto mb-4 text-neon-purple" />
          <h2 className="text-xl font-display font-bold mb-2">You're all set!</h2>
          <p className="text-sm text-muted-foreground">You've completed all onboarding steps.</p>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-display font-bold">Getting Started</h2>
            <p className="text-xs text-muted-foreground">{completedCount} of {steps.length} steps completed</p>
          </div>
          <span className="text-2xl font-bold text-primary">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </GlassCard>

      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isDone = completedSteps.includes(step.key);
          const StepIcon = step.icon;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className={`p-4 ${isDone ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleStep(step.key)}
                    className="flex-shrink-0 transition-transform hover:scale-110"
                    aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-neon-turquoise" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <StepIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                  </div>
                  {step.link && (
                    <Link
                      to={step.link}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}