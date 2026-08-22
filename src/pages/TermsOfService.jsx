import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  {
    heading: 'Agreement to Terms',
    intro: 'These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("You") and The Mainstream Frequency ("Frequency," "we," "us," or "our"), concerning your access to and use of our website, mobile application, and services.',
    body: 'By accessing or using the Platform, you agree that you have read, understood, and agreed to be bound by all of these Terms. If you do not agree with all of these Terms, you are expressly prohibited from using the Platform and you must discontinue use immediately.',
  },
  {
    heading: 'Eligibility',
    body: 'You must be at least 13 years of age to use the Platform. Users between the ages of 13 and 18 must have the consent of a parent or legal guardian. By registering an account, you represent and warrant that you meet these eligibility requirements and that you will provide accurate and complete registration information.',
  },
  {
    heading: 'User Accounts',
    body: 'When you create an account on the Platform, you are responsible for maintaining the security of your account and password. You agree to notify us immediately of any unauthorized use of your account. Frequency cannot be liable for any loss or damage arising from your failure to comply with this obligation.',
    list: [
      'You may not use another person\'s account without permission',
      'You may not share your account credentials with others',
      'You are responsible for all activity that occurs under your account',
      'You must keep your account information current and accurate',
    ],
  },
  {
    heading: 'Subscription Plans',
    body: 'Frequency offers paid subscription plans for fans, including Supporter ($9.99/month), Premium Supporter ($14.99/month), Patron ($24.99/month), and Founding Supporter ($7.99/month, locked for life). Annual billing options are available at a discounted rate.',
    subsections: [
      {
        heading: 'Billing',
        body: 'Subscriptions are billed in advance on a monthly or annual basis through Base44 Payments, which supports Stripe, PayPal, Cash App, Chime, Apple Pay, and Google Pay. Your subscription will automatically renew at the end of each billing cycle unless you cancel before the renewal date.',
      },
      {
        heading: 'Cancellation',
        body: 'You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period — you will retain access until then. Founding Member pricing is locked for life as long as the subscription remains active; if canceled and later reactivated, standard pricing applies.',
      },
      {
        heading: 'Support Allocation',
        body: 'A portion of each subscription payment is allocated to artist support. The platform operations fee is $2.50 per subscription; the remainder is distributed to artists, communities, radio discovery, and Discovery Partners based on the subscriber\'s support allocations.',
      },
    ],
  },
  {
    heading: 'Artist Accounts',
    body: 'Artist accounts are free. There are no monthly fees or upload charges. Optional business services — including merchandise fulfillment, ticketing, print-on-demand, promotional campaigns, advanced analytics, and premium storage — are available at $1.99 per integration, charged only when activated.',
    list: [
      'Artists retain 85% of direct sales revenue (merch, tickets, donations)',
      'The platform retains 15% for payment processing and infrastructure',
      'Artists retain all rights to their music and content',
      'By uploading, artists grant Frequency a non-exclusive license to stream and distribute content on the Platform',
    ],
  },
  {
    heading: 'Platform Fee',
    body: 'The default platform fee is 25% of subscription revenue. This covers platform operations ($2.50 per subscription) with the remainder supporting artists, communities, radio discovery, and Discovery Partners. The platform fee percentage may be adjusted between 15% and 30% with prior notice to existing subscribers.',
  },
  {
    heading: 'Acceptable Use',
    body: 'You agree not to engage in any of the following prohibited activities:',
    list: [
      'Uploading copyrighted material you do not own or have rights to distribute',
      'Harassing, threatening, or intimidating other users',
      'Spamming, phishing, or sending unsolicited communications',
      'Manipulating play counts, support metrics, or discovery scores',
      'Using automated systems, bots, or scrapers without express permission',
      'Attempting to access non-public areas of the Platform',
      'Introducing malware, viruses, or other malicious code',
      'Impersonating another person or entity',
      'Selling or transferring your account without authorization',
    ],
  },
  {
    heading: 'Intellectual Property',
    body: 'The Platform and its original content, features, and functionality are owned by Frequency and are protected by copyright, trademark, patent, and other intellectual property laws. User-uploaded content remains the property of the respective creators.',
    subsections: [
      {
        heading: 'Artist Content',
        body: 'Artists retain all copyrights to their original works. By uploading content, artists grant Frequency a non-exclusive, royalty-free, worldwide license to host, stream, display, and distribute the content on the Platform. This license terminates upon removal of the content.',
      },
      {
        heading: 'AI Content Disclosure',
        body: 'All content must disclose the level of AI involvement: Human Created, Human-Assisted, AI-Assisted, or AI Generated. AI-generated content must be clearly labeled and creators must have rights to all inputs used.',
      },
    ],
  },
  {
    heading: 'Mainstream First™ Program',
    body: 'Participation in the Mainstream First exclusive release program is optional. During the 12-week exclusive period, tracks are available only on the Platform. After the period ends, tracks automatically transition to Heard First status, which is a permanent designation that cannot be removed.',
  },
  {
    heading: 'Payments and Payouts',
    body: 'All payments are processed through Base44 Payments. Artist earnings accumulate in their digital wallet and are paid out according to the payout schedule selected in the Artist Dashboard. Minimum payout thresholds may apply. Payment disputes must be reported within 30 days.',
  },
  {
    heading: 'Termination',
    body: 'We reserve the right to suspend or terminate your account at any time, with or without cause or notice, including for violations of these Terms. Upon termination, your right to use the Platform ceases immediately. Artists will receive any pending payouts upon termination.',
  },
  {
    heading: 'Disclaimers',
    body: 'The Platform is provided on an "as is" and "as available" basis without warranties of any kind, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or secure. We are not liable for any loss of data, content, or revenue arising from your use of the Platform.',
  },
  {
    heading: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, Frequency shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your access to or use of the Platform.',
  },
  {
    heading: 'Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts having jurisdiction over Frequency\'s principal place of business.',
  },
  {
    heading: 'Changes to Terms',
    body: 'We may update these Terms periodically. We will notify users of material changes via email or in-app notification. Continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.',
  },
  {
    heading: 'Contact',
    body: 'If you have questions about these Terms, please contact Base44 support through the Platform\'s help system.',
  },
];

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="July 5, 2026"
      sections={SECTIONS}
      currentPath="/legal/terms"
    />
  );
}