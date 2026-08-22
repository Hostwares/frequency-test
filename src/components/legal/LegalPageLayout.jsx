import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ScrollText, Shield } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

const SIBLING_LINKS = [
  { to: '/legal/terms', label: 'Terms of Service', icon: FileText },
  { to: '/legal/privacy', label: 'Privacy Policy', icon: ScrollText },
  { to: '/legal/dmca', label: 'DMCA Policy', icon: Shield },
];

export default function LegalPageLayout({ title, lastUpdated, sections, currentPath }) {
  return (
    <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/legal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> All Policies
        </Link>

        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">{title}</h1>
        <p className="text-xs text-muted-foreground mb-6">Last updated: {lastUpdated}</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Table of contents */}
          <div className="md:col-span-1">
            <div className="sticky top-20 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Contents</p>
              {sections.map((section, idx) => (
                <a
                  key={idx}
                  href={`#section-${idx}`}
                  className="block px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors truncate"
                >
                  {idx + 1}. {section.heading}
                </a>
              ))}
              <div className="pt-3 mt-3 border-t border-border/30 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Related</p>
                {SIBLING_LINKS.filter(l => l.to !== currentPath).map(link => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-secondary/40 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" /> {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <GlassCard hover={false} className="p-6 md:p-8">
              <div className="space-y-8">
                {sections.map((section, idx) => (
                  <section key={idx} id={`section-${idx}`} className="scroll-mt-20">
                    <h2 className="font-display font-bold text-base mb-2 text-foreground">
                      {idx + 1}. {section.heading}
                    </h2>
                    {section.intro && (
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>
                    )}
                    {section.body && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
                    )}
                    {section.list && (
                      <ul className="space-y-1.5 mt-2">
                        {section.list.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                            <span className="text-primary flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.subsections && (
                      <div className="space-y-4 mt-3">
                        {section.subsections.map((sub, i) => (
                          <div key={i}>
                            <h3 className="font-medium text-sm text-foreground mb-1">{sub.heading}</h3>
                            {sub.body && <p className="text-sm text-muted-foreground leading-relaxed">{sub.body}</p>}
                            {sub.list && (
                              <ul className="space-y-1.5 mt-2">
                                {sub.list.map((item, j) => (
                                  <li key={j} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                                    <span className="text-primary flex-shrink-0">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.div>
    </div>
  );
}