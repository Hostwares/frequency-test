import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Lightbulb, ListChecks, BookOpen } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { getHelpGuide } from '@/lib/helpGuide';

export default function HelpCenter() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const role = user?.role || 'fan';
  const guide = getHelpGuide(role);
  const ProfileIcon = guide.profile.icon;

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neon-cyan/10">
            <BookOpen className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Help & Guide</h1>
            <p className="text-xs text-muted-foreground">Everything you need to know about your account and the platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <NeonBadge color="purple">{guide.roleLabel}</NeonBadge>
          <span className="text-sm text-muted-foreground">{guide.tagline}</span>
        </div>
      </motion.div>

      {/* Your Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
        <GlassCard hover={false} className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ProfileIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-display font-bold mb-1">{guide.profile.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{guide.profile.body}</p>
              {guide.profile.link && (
                <Link to={guide.profile.link} className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline">
                  {guide.profile.linkLabel || 'Open'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Key Features */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">Key Features</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {guide.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <Link to={f.link}>
                  <GlassCard className="p-4 h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{f.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* How to Use */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">How to Use the Platform</h2>
        <div className="space-y-2">
          {guide.howTo.map((step, i) => (
            <motion.div key={step.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <GlassCard hover={false} className="p-4 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {step.link && (
                  <Link to={step.link} className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">Tips & Best Practices</h2>
        <GlassCard hover={false} className="p-5">
          <ul className="space-y-3">
            {guide.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-neon-magenta flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* CTA to onboarding checklist */}
      <Link to="/onboarding">
        <GlassCard className="p-5 flex items-center gap-4 border-primary/20">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ListChecks className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Prefer a step-by-step checklist?</p>
            <p className="text-xs text-muted-foreground">Open Getting Started to track your setup progress</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </GlassCard>
      </Link>
    </div>
  );
}