import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Trophy, Calendar, MapPin, Users, Lock, Vote, Award,
  ChevronRight, Sparkles, Star, Shield, ScrollText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const TIMELINE = [
  { month: 'Jan–Feb', title: 'Applications Open', desc: 'Academy applications open; existing membership reviewed.', icon: Users },
  { month: 'March', title: 'Eligibility Finalized', desc: 'Eligibility finalized; nomination voting begins.', icon: ScrollText },
  { month: 'April', title: 'Nominees Announced', desc: 'Official nominees announced.', icon: Star },
  { month: 'May', title: 'Final Voting', desc: 'Final Voting Council completes winner selection.', icon: Vote },
  { month: 'June', title: 'Confidential Period', desc: 'Winners remain confidential; ceremony preparations and media announcements.', icon: Lock },
  { month: 'July', title: 'Awards Ceremony', desc: 'My Life Awards™ Ceremony.', icon: Trophy },
];

const ELIGIBILITY_TYPES = [
  'Verified Artists', 'Discovery Partners', 'Radio Programmers',
  'Music Journalists', 'Community Managers', 'Music Educators',
  'Producers', 'Songwriters', 'Engineers', 'Entertainment Attorneys',
  'Venue Owners', 'Festival Organizers', 'Industry Professionals',
  'Long-standing Community Contributors', 'Selected Fan Representatives',
];

export default function MyLifeAwards() {
  const { user } = useAuth();

  const { data: member } = useQuery({
    queryKey: ['academy-member', user?.id],
    queryFn: () => base44.entities.AcademyMember.filter({ user_id: user.id }, '-applied_date', 1),
    enabled: !!user,
  });

  const { data: ceremonySettings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSetting.filter({}),
  });

  const ceremonyDate = ceremonySettings.find(s => s.setting_key === 'awards_ceremony_date')?.setting_value || 'July 2028';
  const ceremonyLocation = ceremonySettings.find(s => s.setting_key === 'awards_ceremony_location')?.setting_value || 'Sioux City, Iowa, USA';

  const hasApplication = member && member.length > 0;
  const isMember = hasApplication && member[0].application_status === 'approved' && member[0].membership_status === 'active';

  return (
    <div className="pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.15),_transparent_60%)]" />

        <div className="relative max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Trophy className="w-16 h-16 md:w-20 md:h-20 text-primary" />
              <Sparkles className="w-5 h-5 text-neon-cyan absolute -top-1 -right-1" />
            </div>
          </div>

          <NeonBadge color="purple" className="mb-4">Official Launch</NeonBadge>

          <h1 className="text-3xl md:text-5xl font-display font-bold text-gradient-neon mb-3">
            My Life Awards™
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4">
            Recognizing excellence, artistic achievement, discovery, community impact, and innovation
            across The Mainstream Frequency™.
          </p>

          {/* Official Motto */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-1">Official Motto</p>
            <p className="text-xl md:text-2xl font-display font-bold text-foreground italic">
              "Become Who You Were Meant to Be."
            </p>
          </div>

          {/* Ceremony details */}
          <GlassCard hover={false} className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-8 px-6 py-4 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Inaugural Ceremony</p>
                <p className="text-sm font-display font-semibold">{ceremonyDate}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border hidden md:block" />
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-neon-cyan" />
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</p>
                <p className="text-sm font-display font-semibold">{ceremonyLocation}</p>
              </div>
            </div>
          </GlassCard>

          <div className="flex flex-col md:flex-row items-center justify-center gap-3">
            {isMember ? (
              <Link to="/academy-dashboard">
                <Button className="bg-gradient-neon hover:opacity-90 text-white">
                  <Award className="w-4 h-4" /> Go to Academy Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/academy-application">
                <Button className="bg-gradient-neon hover:opacity-90 text-white">
                  <Users className="w-4 h-4" /> Apply for Academy Membership
                </Button>
              </Link>
            )}
            {hasApplication && !isMember && (
              <Link to="/academy-dashboard">
                <Button variant="outline">
                  Check Application Status
                </Button>
              </Link>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Additional ceremony details, venue, schedule, performers, presenters, and special events
            will be announced at a later date.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        {/* Purpose */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Purpose of the My Life Awards™
          </h2>
          <GlassCard hover={false} className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The My Life Awards™ were created to recognize artists whose work represents more than musical achievement.
              They celebrate the courage to create, the perseverance to overcome adversity, and the lasting impact that
              authentic artistry can have on individuals, communities, and culture.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unlike traditional awards that often focus primarily on commercial success or industry recognition, the
              My Life Awards™ honor artists through a balanced combination of verified platform achievement, professional
              evaluation, artistic excellence, and meaningful community impact. Success is measured not only by
              accomplishments, but also by integrity, growth, creativity, and the genuine relationships artists build
              with the people who support them.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The awards recognize that every artist's journey is unique. Some inspire through extraordinary songwriting.
              Others through perseverance, innovation, leadership, or the communities they build around their music. The
              My Life Awards™ celebrate those journeys while encouraging artists to continue growing both personally and
              professionally.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Eligibility is based on measurable accomplishments within The Mainstream Frequency, while final recipients
              are selected by an independent and diverse Academy representing artists, industry professionals, journalists,
              educators, radio programmers, discovery partners, and community leaders. This combination of objective
              achievement and thoughtful evaluation ensures that every honor reflects both artistic merit and meaningful
              contribution.
            </p>
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg mt-2">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs text-foreground">
                Above all, the My Life Awards™ exist to remind artists that lasting success is not defined solely by
                charts, sales, or popularity. It is defined by purpose, resilience, character, and the ability to move
                people through music.
              </p>
            </div>
          </GlassCard>
        </section>

        {/* The Meaning Behind the Award */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
            The Meaning Behind the Award
          </h2>
          <GlassCard hover={false} className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The My Life Award™ symbolizes the journey every artist takes through life. The figure represents every
              creator standing between who they once were and who they have the potential to become. Surrounded by
              passion, struggle, hope, balance, sacrifice, and opportunity, the figure reflects the constant tension
              between adversity and growth.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The flames symbolize passion and determination. The silver linings represent hope found through hardship.
              The opposing elements reflect life's balance, where challenges and triumphs shape character. In its hand,
              the figure holds the foundation of its future, seeing not only where it has been, but where it is capable
              of going.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The sculpture reminds every recipient that while fame, appearance, and recognition may change with time,
              character, purpose, and the legacy left through one's art endure far beyond the moment. It embodies the
              belief that those who continue reaching, learning, letting go of fear, and embracing growth create the
              greatest impact.
            </p>
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-1">Inscription</p>
              <p className="text-base font-display font-semibold text-foreground italic">
                "Appearance is temporary. The soul is eternal."
              </p>
            </div>

            {/* Award Video */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-2 text-center">
                See the Award
              </p>
              <div className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-black/40" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/1Jp0bqR0rBk"
                  title="My Life Awards™ — The Award"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Academy Overview */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            My Life Awards™ Academy
          </h2>
          <GlassCard hover={false} className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The Academy is the official governing body responsible for recognizing excellence across
              The Mainstream Frequency™. It consists of up to{' '}
              <span className="text-foreground font-semibold">1,000 Verified Voting Members</span> selected
              based on merit, experience, diversity of perspective, and commitment to the platform — not popularity.
            </p>
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Users className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs text-foreground">
                Each awards cycle, approximately <strong>300 Academy Members</strong> are selected to serve on the
                Final Voting Council, which determines the winners from the official nominees.
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Eligibility */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-neon-cyan" />
            Who Can Join the Academy
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ELIGIBILITY_TYPES.map(type => (
              <div key={type} className="flex items-center gap-2 p-2.5 bg-card/60 border border-border/40 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{type}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neon-magenta" />
            Awards Cycle Timeline
          </h2>
          <div className="space-y-2">
            {TIMELINE.map((phase, i) => (
              <GlassCard key={i} hover={false} className="p-4 flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <phase.icon className="w-4 h-4 text-primary" />
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className="w-px h-6 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <NeonBadge color="purple">{phase.month}</NeonBadge>
                    <span className="text-sm font-display font-semibold">{phase.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{phase.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Code of Ethics */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-neon-turquoise" />
            Academy Code of Ethics
          </h2>
          <GlassCard hover={false} className="p-6 space-y-2">
            {[
              'Keep voting confidential.',
              'Avoid discussing internal deliberations.',
              'Report conflicts of interest.',
              'Maintain fairness and impartiality.',
              'Follow the Academy Code of Ethics.',
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-neon-turquoise flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{rule}</p>
              </div>
            ))}
            <p className="text-xs text-destructive mt-3">
              Violations may result in suspension or permanent removal from the Academy.
            </p>
          </GlassCard>
        </section>

        {/* CTA */}
        {!isMember && (
          <section className="text-center py-8">
            <GlassCard hover={false} className="p-8 bg-gradient-card">
              <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-display font-bold mb-2">Ready to Join the Academy?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Applications are reviewed throughout the year by the Master Admin and Awards Committee.
              </p>
              <Link to="/academy-application">
                <Button className="bg-gradient-neon hover:opacity-90 text-white">
                  Start Your Application
                </Button>
              </Link>
              <div className="mt-5 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-1">Official Motto</p>
                <p className="text-base font-display font-bold text-foreground italic">
                  "Become Who You Were Meant to Be."
                </p>
              </div>
            </GlassCard>
          </section>
        )}
      </div>
    </div>
  );
}