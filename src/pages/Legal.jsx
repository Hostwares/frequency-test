import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, ScrollText, Cookie, Shield, Music, Users, Radio, MessageSquare, Cpu, Copyright, RotateCcw, ShoppingBag, Ticket, Accessibility, ArrowUpRight } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

const PRIMARY_POLICIES = [
  { to: '/legal/terms', title: 'Terms of Service', description: 'The terms and conditions governing your use of the Platform.', icon: FileText, color: '#a855f7' },
  { to: '/legal/privacy', title: 'Privacy Policy', description: 'How we collect, use, and protect your personal information.', icon: ScrollText, color: '#06b6d4' },
  { to: '/legal/dmca', title: 'DMCA Policy', description: 'How to report copyright infringement and file counter-notices.', icon: Shield, color: '#d946ef' },
];

const POLICIES = [
  {
    id: 'tos',
    title: 'Terms of Service',
    icon: FileText,
    content: `Terms of Service

Last updated: July 5, 2026

Welcome to The Mainstream Frequency ("Frequency," "we," "us," or "our"). By accessing or using our platform, you agree to these Terms of Service.

1. Eligibility
You must be at least 13 years old to use Frequency. Users under 18 require parental consent.

2. Accounts
You are responsible for maintaining the security of your account and password. Frequency cannot be liable for any loss or damage from your failure to comply with this security obligation.

3. Subscriptions
Paid subscription plans (Supporter, Premium Supporter, Patron) are billed on a monthly or annual basis. You can cancel at any time. Founding Member pricing is locked for life as long as the subscription remains active.

4. Artist Accounts
Artists join for free. Optional business services (merchandise fulfillment, ticketing, etc.) are charged only when used. Artists retain 85% of direct sales revenue.

5. Platform Fee
The default platform fee is 25% of subscription revenue, allocated to platform operations ($2.50/subscription) with the remainder supporting artists, communities, radio discovery, and discovery partners. This percentage may be adjusted between 15% and 30% with prior notice to subscribers.

6. Acceptable Use
You agree not to: upload copyrighted material you don't own, harass other users, spam, manipulate play counts or support metrics, or use automated systems without permission.

7. Termination
We reserve the right to suspend or terminate accounts that violate these terms.

8. Disclaimers
Frequency is provided "as is" without warranties of any kind.

9. Changes
We may update these terms periodically. Continued use constitutes acceptance of changes.`
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: ScrollText,
    content: `Privacy Policy

Last updated: July 5, 2026

1. Information We Collect
- Account information (name, email, password hash)
- Usage data (listening history, support activity, community participation)
- Payment information (processed securely through Base44 Payments)
- Device and browser information

2. How We Use Your Information
- Providing and personalizing our services
- Processing payments and subscriptions
- Sending service updates and notifications
- Improving our platform and recommendations
- Preventing fraud and abuse

3. Information Sharing
We do not sell your personal information. We share data only with:
- Payment processors (Base44 Payments/Stripe)
- Service providers under confidentiality agreements
- Legal authorities when required by law

4. Data Security
We use encryption, secure authentication, and regular security audits to protect your data.

5. Your Rights
You can access, update, or delete your personal information at any time through your account settings.

6. Cookies
See our Cookie Policy for details on how we use cookies.

7. Children's Privacy
Frequency is not directed to children under 13.`
  },
  {
    id: 'cookie',
    title: 'Cookie Policy',
    icon: Cookie,
    content: `Cookie Policy

Last updated: July 5, 2026

1. What Are Cookies
Cookies are small text files stored on your device when you visit a website.

2. How We Use Cookies
- Essential cookies: Required for login, playback, and core functionality
- Preference cookies: Remember your settings (theme, audio quality, etc.)
- Analytics cookies: Help us understand how the platform is used
- Marketing cookies: Used to measure the effectiveness of referrals

3. Managing Cookies
You can control cookies through your browser settings. Disabling essential cookies may affect functionality.

4. Third-Party Cookies
Base44 Payments and analytics providers may set their own cookies. We do not control these.`
  },
  {
    id: 'dmca',
    title: 'DMCA Policy',
    icon: Shield,
    content: `DMCA Policy

Last updated: July 5, 2026

1. Filing a DMCA Notice
To file a copyright infringement notice, provide:
- Your contact information
- Identification of the copyrighted work
- Identification of the infringing material
- A statement of good faith belief
- A statement of accuracy under penalty of perjury
- Your physical or electronic signature

2. Counter-Notice
If your content was removed and you believe it was in error, you may file a counter-notice.

3. Repeat Infringers
We will terminate accounts of repeat copyright infringers.

4. Response Time
We process DMCA notices within 10 business days of receipt.`
  },
  {
    id: 'artist-agreement',
    title: 'Artist Agreement',
    icon: Music,
    content: `Artist Agreement

Last updated: July 5, 2026

1. Artist Accounts
Artist accounts are free. No monthly fees or upload charges.

2. Revenue Share
Artists receive 85% of direct sales (merch, tickets, donations). The platform retains 15% for payment processing and infrastructure.

3. Rights & Ownership
Artists retain all rights to their music. By uploading, you grant Frequency a non-exclusive license to stream and distribute your content on the platform.

4. Split Sheets
Artists are responsible for accurately representing ownership splits. Co-owners must approve split sheets before revenue distribution.

5. Mainstream First™
Participation in Mainstream First exclusive releases is optional. Exclusive periods last 12 weeks before transitioning to Heard First.

6. Content Standards
Uploaded music must be properly licensed, with accurate metadata and rights information.

7. Optional Services
Business services (merchandise fulfillment, ticketing, print-on-demand) are charged only when used, with transparent pricing.

8. Payouts
Artist earnings are paid according to the payout schedule selected in the artist dashboard.`
  },
  {
    id: 'fan-agreement',
    title: 'Fan Agreement',
    icon: Users,
    content: `Fan Agreement

Last updated: July 5, 2026

1. Free Tier
Free users can listen to featured music, follow artists, join communities, create playlists, and browse events.

2. Paid Subscriptions
Subscribers receive benefits based on their plan tier. Support allocations are distributed to artists monthly.

3. Refund Policy
Monthly subscriptions can be canceled at any time. Annual subscriptions are non-refundable but can be canceled to prevent renewal.

4. Community Participation
Fans must follow Community Guidelines when participating in discussions, polls, and events.

5. Fan Badges
Badges are earned through support and engagement. Some badges (Mainstream First) are permanent and cannot be removed.`
  },
  {
    id: 'partner-agreement',
    title: 'Discovery Partner Agreement',
    icon: Radio,
    content: `Discovery Partner Agreement

Last updated: July 5, 2026

1. Role
Discovery Partners curate and recommend music, helping artists gain exposure.

2. Gratitude Payments
Fans and artists can send voluntary gratitude payments to Discovery Partners for their contributions.

3. Discovery Score
Partner reputation is measured by scout score, reputation score, and discovery success rate.

4. Transparency
Partners must disclose any conflicts of interest when recommending artists.

5. Code of Conduct
Partners must provide honest, merit-based recommendations. Manipulation of discovery metrics is prohibited.`
  },
  {
    id: 'radio-agreement',
    title: 'Radio Programmer Agreement',
    icon: Radio,
    content: `Radio Programmer Agreement

Last updated: July 5, 2026

1. Verification
Radio programmers must verify their station affiliation before accessing the Radio Portal.

2. Downloads
Programmers receive radio-quality downloads (WAV/MP3) for airplay consideration.

3. Airplay Reporting
Programmers are encouraged to report airplay data for artist analytics and royalty tracking.

4. Export
Programmers can export airplay data to Google Sheets for station reporting.

5. Code of Conduct
Downloads are for airplay evaluation only. Redistribution or unauthorized sharing is prohibited.`
  },
  {
    id: 'community-guidelines',
    title: 'Community Guidelines',
    icon: MessageSquare,
    content: `Community Guidelines

Last updated: July 5, 2026

1. Be Respectful
Treat all community members with respect. No harassment, hate speech, or personal attacks.

2. Stay On Topic
Keep discussions relevant to the community's genre and purpose.

3. No Spam
Don't post repetitive, promotional, or irrelevant content.

4. Report Issues
Use the report feature to flag inappropriate content or behavior.

5. Moderation
Community managers can warn, mute, or ban users who violate guidelines. Actions are logged and reviewable.

6. Content Standards
No explicit, illegal, or copyrighted material you don't own. AI-generated content must be disclosed.

7. Appeals
Banned users can appeal through the support system.`
  },
  {
    id: 'ai-policy',
    title: 'AI Content Policy',
    icon: Cpu,
    content: `AI Content Policy

Last updated: July 5, 2026

1. Disclosure Required
All content must disclose AI involvement:
- Human Created: No AI used
- Human-Assisted: AI tools used in production
- AI-Assisted: Significant AI contribution
- AI Generated: Primarily AI-created

2. Transparency
AI-generated content is clearly labeled across the platform with disclosure badges.

3. Rights
Creators using AI must have the rights to all inputs used. AI-generated content based on copyrighted material without permission is prohibited.

4. Discovery
AI content is eligible for discovery features but may be filtered by users who prefer human-created music.

5. Quality Standards
AI-generated content must meet the same audio quality and metadata standards as human-created content.`
  },
  {
    id: 'copyright',
    title: 'Copyright Policy',
    icon: Copyright,
    content: `Copyright Policy

Last updated: July 5, 2026

1. Ownership
Creators retain all copyrights to their original works uploaded to Frequency.

2. Split Sheets
All co-owners must be accurately represented in split sheet filings. Revenue is distributed according to verified splits.

3. Rights Claims
Rights claims can be filed for ownership disputes, unauthorized use, or split disagreements. Claims are reviewed and resolved through the Rights Management system.

4. Licensing
Artists can grant or deny licensing permissions for their work through the Rights Management portal.

5. Takedowns
Copyright-infringing content is removed upon verified DMCA notice or rights claim resolution.

6. Repeat Violators
Accounts with multiple copyright violations are terminated.`
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    icon: RotateCcw,
    content: `Refund Policy

Last updated: July 5, 2026

1. Subscriptions
Monthly subscriptions: Cancel anytime, no refund for the current billing period.
Annual subscriptions: Cancel anytime, access continues until the period ends. No refunds for unused time.
Founding Member: Locked pricing, cancel anytime.

2. Merchandise
Refunds within 30 days of delivery for unused items in original condition. Digital downloads are non-refundable.

3. Tickets
Refunds available up to 48 hours before the event. After that, refunds are at the artist's discretion.

4. Donations
Direct artist donations are non-refundable once processed.

5. Disputes
Contact support for billing disputes. We investigate all claims within 5 business days.`
  },
  {
    id: 'merch-policy',
    title: 'Merchandise Policy',
    icon: ShoppingBag,
    content: `Merchandise Policy

Last updated: July 5, 2026

1. Artist Storefronts
Artists can sell merchandise through integrated storefronts or direct sales.

2. Revenue Share
Artists receive 85% of merchandise revenue. The platform retains 15% for processing and infrastructure.

3. Fulfillment
Artists are responsible for fulfillment unless using optional fulfillment services (print-on-demand, etc.).

4. Shipping
Shipping costs and timelines are set by the artist. Tracking information should be provided when available.

5. Returns
Merchandise returns follow the Refund Policy. Defective items must be reported within 7 days.

6. Prohibited Items
No counterfeit goods, illegal items, or trademark-infringing merchandise.`
  },
  {
    id: 'ticket-policy',
    title: 'Ticket Policy',
    icon: Ticket,
    content: `Ticket Policy

Last updated: July 5, 2026

1. Ticket Tiers
Events may offer multiple ticket tiers (General Admission, VIP, Meet & Greet, etc.) with varying prices and perks.

2. Revenue Share
Artists receive 85% of ticket revenue. The platform retains 15% for processing.

3. QR Entry
Each ticket includes a unique QR code for event entry. Present the QR code at check-in.

4. Seating
Assigned seating events display interactive seating charts. Seat selections are reserved at purchase.

5. Transfers
Tickets are non-transferable unless the event allows transfers. Contact support for assistance.

6. Cancellations
If an event is canceled, all ticket holders receive a full refund. If postponed, tickets remain valid for the new date.

7. Check-In
Event staff scan QR codes or manually check in attendees. Duplicate check-ins are flagged.`
  },
  {
    id: 'accessibility',
    title: 'Accessibility Statement',
    icon: Accessibility,
    content: `Accessibility Statement

Last updated: July 5, 2026

1. Commitment
The Mainstream Frequency is committed to making our platform accessible to all users, including those with disabilities.

2. Standards
We strive to meet WCAG 2.1 AA accessibility standards.

3. Features
- Keyboard navigation support
- Screen reader compatibility
- High contrast themes
- Accessible seating options at events
- Alternative text for images
- Captioning support for video content

4. Ongoing Improvement
We continuously work to improve accessibility. If you encounter barriers, please contact us.

5. Third-Party Content
Some third-party content (embedded videos, external links) may not be fully accessible. We work with partners to improve compatibility.

6. Feedback
We welcome accessibility feedback and suggestions for improvement.`
  },
];

export default function Legal() {
  const [activePolicy, setActivePolicy] = useState('tos');
  const current = POLICIES.find(p => p.id === activePolicy);

  return (
    <div className="p-4 md:p-8 pb-24 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">Legal & Policies</h1>
        <p className="text-sm text-muted-foreground mb-6">The terms and policies that govern The Mainstream Frequency.</p>

        {/* Primary policy pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PRIMARY_POLICIES.map(policy => {
            const Icon = policy.icon;
            return (
              <Link key={policy.to} to={policy.to}>
                <GlassCard className="p-5 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${policy.color}20` }}>
                      <Icon className="w-5 h-5" style={{ color: policy.color }} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-sm mb-1">{policy.title}</h3>
                  <p className="text-xs text-muted-foreground">{policy.description}</p>
                </GlassCard>
              </Link>
            );
          })}
        </div>

        {/* Additional policies */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Additional Policies</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Policy list */}
          <div className="space-y-1">
            {POLICIES.map(policy => {
              const Icon = policy.icon;
              const isActive = activePolicy === policy.id;
              return (
                <button key={policy.id} onClick={() => setActivePolicy(policy.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                    isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{policy.title}</span>
                </button>
              );
            })}
          </div>

          {/* Policy content */}
          <div className="md:col-span-2">
            <GlassCard hover={false} className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                <current.icon className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-lg">{current.title}</h2>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-body text-sm text-muted-foreground leading-relaxed">{current.content}</pre>
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.div>
    </div>
  );
}