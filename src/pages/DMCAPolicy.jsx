import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  {
    heading: 'Overview',
    intro: 'The Mainstream Frequency ("Frequency," "we," "us," or "our") respects the intellectual property rights of others and expects users of our Platform to do the same. This Digital Millennium Copyright Act (DMCA) Policy describes how copyright owners can report alleged infringement and how affected users can respond.',
    body: 'It is our policy to respond to clear notices of alleged copyright infringement that comply with the DMCA (17 U.S.C. § 512). We reserve the right to remove or disable access to material that is claimed to be infringing, and to terminate accounts of repeat infringers.',
  },
  {
    heading: 'Filing a DMCA Takedown Notice',
    body: 'If you believe that material on the Platform infringes your copyright, you may submit a DMCA takedown notice. Your notice must include all of the following information:',
    list: [
      'A physical or electronic signature of the copyright owner or a person authorized to act on their behalf',
      'Identification of the copyrighted work claimed to have been infringed (or a representative list if multiple works)',
      'Identification of the specific material on the Platform that is claimed to be infringing, including the URL or location so we can locate it',
      'Your contact information, including full name, mailing address, telephone number, and email address',
      'A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law',
      'A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the owner\'s behalf',
    ],
  },
  {
    heading: 'Submitting Your Notice',
    body: 'DMCA notices should be submitted through the Platform\'s Rights Management portal, which provides a structured DMCA notice form. Alternatively, you may contact Base44 support through the Platform\'s help system with all required information listed above.',
    list: [
      'Use the DMCA Portal under Rights Management for fastest processing',
      'Include all required elements — incomplete notices will be returned for clarification',
      'Be specific about the infringing material (URLs, song titles, artist names)',
      'Ensure your signature is included (electronic signatures are accepted)',
    ],
  },
  {
    heading: 'Response Timeline',
    body: 'We process DMCA notices within 10 business days of receipt. Upon receiving a valid notice, we will:',
    list: [
      'Remove or disable access to the allegedly infringing material',
      'Notify the user who posted the material that it has been removed',
      'Provide the affected user with information about filing a counter-notice',
      'Document the action in our rights management records',
    ],
  },
  {
    heading: 'Filing a Counter-Notice',
    body: 'If your content was removed from the Platform and you believe it was removed in error or misidentification, you may file a counter-notice. Your counter-notice must include:',
    list: [
      'Your physical or electronic signature',
      'Identification of the material that was removed and the location where it appeared before removal',
      'A statement under penalty of perjury that you have a good faith belief the material was removed or disabled as a result of mistake or misidentification',
      'Your name, address, telephone number, and email address',
      'A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or if your address is outside the U.S., for any judicial district in which Frequency may be found)',
      'A statement that you will accept service of process from the person who filed the original takedown notice or their agent',
    ],
  },
  {
    heading: 'Counter-Notice Process',
    body: 'Upon receiving a valid counter-notice, we will:',
    list: [
      'Forward the counter-notice to the party who filed the original takedown notice',
      'Inform them that the removed material may be restored in 10 business days',
      'Restore the material within 10 to 14 business days unless we receive notice that the original complainant has filed a court action seeking to restrain the alleged infringer',
    ],
  },
  {
    heading: 'Repeat Infringer Policy',
    body: 'We will terminate the accounts of users who are determined to be repeat copyright infringers. A "repeat infringer" is a user who has had content removed for copyright infringement three (3) or more times. We maintain records of all takedown actions and track repeat violations.',
  },
  {
    heading: 'Split Sheets and Ownership Disputes',
    body: 'Frequency provides a Split Sheet management system within the Rights Management portal. Split sheets allow co-owners to document and agree on ownership percentages. When disputes arise about ownership splits:',
    list: [
      'Co-owners can file a Rights Claim through the Rights Management portal',
      'All documented co-owners must be notified of the claim',
      'Claims are reviewed and resolved through the platform\'s dispute resolution process',
      'Revenue distribution may be held pending resolution',
    ],
  },
  {
    heading: 'Licensing and Permissions',
    body: 'Artists can grant or deny licensing permissions for their work through the Rights Management portal. This includes:',
    list: [
      'Sync licensing for film, TV, and advertising',
      'Cover song permissions',
      'Sampling permissions',
      'Radio airplay permissions',
    ],
    body2: 'Unauthorized use of Frequency-hosted content outside the Platform\'s licensing framework may result in content removal and account action.',
  },
  {
    heading: 'False Claims',
    body: 'Filing a false DMCA notice or counter-notice may result in legal liability under Section 512(f) of the DMCA for any damages, including costs and attorney fees, incurred by the alleged infringer or the service provider. We may also suspend accounts that repeatedly file false claims.',
  },
  {
    heading: 'Good Faith Use',
    body: 'Frequency supports fair use of copyrighted material. If you believe your use of content qualifies as fair use (e.g., commentary, criticism, news reporting, teaching), you may include this in your counter-notice. However, fair use is a legal determination ultimately made by courts.',
  },
  {
    heading: 'Agent for Notice',
    body: 'Frequency has designated an agent to receive notifications of claimed infringement. All DMCA notices should be submitted through the Platform\'s DMCA Portal or to Base44 support, which will route them to our designated agent for expedited processing.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this DMCA Policy periodically to reflect changes in the law or our practices. The "Last updated" date at the top reflects the most recent revision.',
  },
  {
    heading: 'Contact',
    body: 'For questions about this DMCA Policy or to submit a notice, use the DMCA Portal under Rights Management in the Platform, or contact Base44 support through the Platform\'s help system.',
  },
];

export default function DMCAPolicy() {
  return (
    <LegalPageLayout
      title="DMCA Policy"
      lastUpdated="July 5, 2026"
      sections={SECTIONS}
      currentPath="/legal/dmca"
    />
  );
}