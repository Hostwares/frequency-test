import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  {
    heading: 'Introduction',
    body: 'This Privacy Policy describes how The Mainstream Frequency ("Frequency," "we," "us," or "our") collects, uses, and shares your personal information when you use our website, mobile application, and services (the "Platform"). We are committed to protecting your privacy and being transparent about our data practices.',
  },
  {
    heading: 'Information We Collect',
    subsections: [
      {
        heading: 'Account Information',
        body: 'When you create an account, we collect:',
        list: [
          'Your full name',
          'Email address',
          'Password (stored as a secure hash, never in plain text)',
          'Role (fan, artist, admin, discovery partner, radio programmer)',
        ],
      },
      {
        heading: 'Usage Data',
        body: 'We collect information about your activity on the Platform:',
        list: [
          'Listening history and play counts',
          'Support and subscription activity',
          'Community participation (messages, polls, posts)',
          'Search queries and browsing patterns',
          'Playlist creation and management',
          'Event RSVPs and attendance',
        ],
      },
      {
        heading: 'Payment Information',
        body: 'Payment data is processed securely through Base44 Payments, which supports Stripe, PayPal, Cash App, Chime, Apple Pay, and Google Pay. We do not store full credit card numbers — only transaction records and last-four digits for display purposes.',
      },
      {
        heading: 'Device and Technical Information',
        body: 'We automatically collect:',
        list: [
          'IP address and approximate location',
          'Browser type and version',
          'Device type and operating system',
          'Referring URLs',
          'Cookies and similar technologies (see Cookie Policy)',
        ],
      },
      {
        heading: 'Artist-Specific Data',
        body: 'For artist accounts, we also collect:',
        list: [
          'Artist name, handle, and bio',
          'Genre and sub-genres',
          'Profile and cover images',
          'Social media links',
          'Uploaded music and metadata (ISRC, UPC, writers, producers)',
          'Banking and payout details (for artist payments)',
        ],
      },
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: 'We use your personal information for the following purposes:',
    list: [
      'Providing, operating, and maintaining the Platform',
      'Personalizing your experience and recommendations',
      'Processing payments, subscriptions, and artist payouts',
      'Sending service updates, notifications, and important announcements',
      'Improving the Platform through analytics and user feedback',
      'Preventing fraud, abuse, and unauthorized access',
      'Complying with legal obligations',
      'Facilitating community features and fan-to-artist interactions',
      'Generating aggregated, non-identifiable analytics and platform metrics',
    ],
  },
  {
    heading: 'Information Sharing',
    body: 'We do not sell your personal information. We share data only in the following circumstances:',
    subsections: [
      {
        heading: 'Service Providers',
        body: 'We share data with third-party service providers who help us operate the Platform, all under confidentiality agreements:',
        list: [
          'Base44 Payments / Stripe (payment processing)',
          'Cloud hosting and infrastructure providers',
          'Email delivery services',
          'Analytics providers',
        ],
      },
      {
        heading: 'Artists and Discovery Partners',
        body: 'When you support an artist or engage with a Discovery Partner, we share relevant information such as your display name and support amount with that artist or partner. This is necessary for the platform\'s fan-to-artist support model.',
      },
      {
        heading: 'Legal Requirements',
        body: 'We may disclose information when required by law, court order, or government authority, or when we believe in good faith that disclosure is necessary to protect our rights, safety, or property.',
      },
      {
        heading: 'Business Transfers',
        body: 'In the event of a merger, acquisition, or asset sale, user information may be transferred. We will notify you before such a transfer occurs.',
      },
    ],
  },
  {
    heading: 'Data Security',
    body: 'We implement industry-standard security measures to protect your data:',
    list: [
      'Encryption of data in transit (TLS/SSL) and at rest',
      'Secure password hashing (never stored in plain text)',
      'Role-based access controls for internal staff',
      'Regular security audits and vulnerability assessments',
      'Audit logging of sensitive platform actions',
      'Webhook signature verification for payment events',
    ],
    body2: 'However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but strive to use commercially acceptable means to protect your information.',
  },
  {
    heading: 'Your Rights',
    body: 'You have the following rights regarding your personal data:',
    list: [
      'Access: View your personal data through your account settings',
      'Update: Correct or update your information at any time',
      'Deletion: Request deletion of your account and associated data',
      'Export: Request an export of your data in a portable format',
      'Opt-out: Unsubscribe from marketing communications',
      'Restriction: Request restriction of processing in certain circumstances',
    ],
    body2: 'To exercise these rights, contact Base44 support through the Platform. We respond to requests within 30 days.',
  },
  {
    heading: 'Data Retention',
    body: 'We retain your data for as long as your account is active and as needed to provide services. After account deletion, we retain certain data for:',
    list: [
      'Financial records (7 years for tax compliance)',
      'Legal dispute records (duration of dispute plus statute of limitations)',
      'Anonymized analytics (indefinitely, as non-identifiable data)',
    ],
  },
  {
    heading: 'Cookies and Tracking',
    body: 'We use cookies and similar technologies for essential functionality, preferences, analytics, and marketing measurement. See our Cookie Policy for detailed information. You can manage cookies through your browser settings, though disabling essential cookies may affect Platform functionality.',
  },
  {
    heading: 'Children\'s Privacy',
    body: 'The Platform is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us and we will promptly delete it. Users between 13 and 18 require parental consent.',
  },
  {
    heading: 'International Users',
    body: 'The Platform is hosted in the United States. If you access the Platform from outside the U.S., your information is transferred to and processed in the U.S. We comply with applicable data protection laws, including GDPR for European users and CCPA for California residents.',
  },
  {
    heading: 'GDPR Rights (European Users)',
    body: 'If you are a resident of the European Economic Area, you have additional rights under the GDPR:',
    list: [
      'Right to be informed about data processing',
      'Right of access to your personal data',
      'Right to rectification of inaccurate data',
      'Right to erasure ("right to be forgotten")',
      'Right to restrict processing',
      'Right to data portability',
      'Right to object to processing',
      'Right to withdraw consent at any time',
    ],
  },
  {
    heading: 'CCPA Rights (California Residents)',
    body: 'California residents have rights under the California Consumer Privacy Act:',
    list: [
      'Right to know what personal information is collected',
      'Right to know if personal information is sold or disclosed (we do not sell data)',
      'Right to opt-out of the sale of personal information (not applicable)',
      'Right to request deletion of personal information',
      'Right to non-discrimination for exercising privacy rights',
    ],
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification. The "Last updated" date at the top reflects the most recent revision. Continued use of the Platform after changes take effect constitutes acceptance of the updated policy.',
  },
  {
    heading: 'Contact',
    body: 'If you have questions about this Privacy Policy or your personal data, please contact Base44 support through the Platform\'s help system.',
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="July 5, 2026"
      sections={SECTIONS}
      currentPath="/legal/privacy"
    />
  );
}