import {
  User, Wallet, Radio, Heart, ListMusic, AtSign, Upload, Share2, CreditCard,
  Compass, Sparkles, Settings, Gavel, Crown, Megaphone, Mic2, Music,
  ShoppingBag, Calendar, Headphones, TrendingUp, Shield, Disc3, Scale, Banknote
} from 'lucide-react';

/**
 * Role-tailored help guide content.
 * Each guide explains how the user's profile works and how to use the platform for their role.
 */
export const HELP_GUIDES = {
  fan: {
    roleLabel: 'Fan',
    tagline: 'You power the artists you love — here’s how everything works.',
    profile: {
      icon: User,
      title: 'Your Fan Profile',
      body: 'Your profile is your home base as a supporter. It tracks the artists you back, the playlists you’ve built, and your lifetime impact. Personalize your name and avatar from Security, and your full support history lives in your Fan Dashboard.',
      link: '/security',
      linkLabel: 'Edit your profile',
    },
    features: [
      { icon: ListMusic, title: 'Playlists', description: 'Build living playlists. The artists in your playlist receive a share of your monthly subscription automatically.', link: '/playlists' },
      { icon: Radio, title: 'Frequencies', description: 'Join a Frequency — a music community — to connect with fans who share your taste and discover artists together.', link: '/frequencies' },
      { icon: Heart, title: 'Support Artists', description: 'Back artists with monthly support or one-time tips. Your contribution goes directly to the artist (minus a small platform fee).', link: '/artists' },
      { icon: Wallet, title: 'Your Wallet', description: 'Track your contributions, manage your monthly budget, and view your transaction history.', link: '/wallet' },
    ],
    howTo: [
      { title: 'Set your monthly budget', description: 'Decide how much to support artists each month — it’s split among the artists in your playlist.', link: '/fan-dashboard' },
      { title: 'Build your first playlist', description: 'Add artists and songs. The more you listen and support, the more your impact grows.', link: '/playlists' },
      { title: 'Discover new artists', description: 'Browse Artists, explore Breakout Artists, or check the Hall of Discovery to find your next favorite.', link: '/artists' },
    ],
    tips: [
      'Artists in your playlist automatically receive a share of your monthly support — keep it updated to match who you love.',
      'Joining a Frequency connects you with fans who share your taste.',
      'Your Resonance grows as you support and engage, unlocking badges and platform influence.',
    ],
  },

  artist: {
    roleLabel: 'Artist',
    tagline: 'Share your music, grow your audience, and get paid directly by fans.',
    profile: {
      icon: User,
      title: 'Your Artist Profile',
      body: 'Your artist profile is your public identity on the platform — your stage name, Artist Handle (!handle), bio, genres, images, and social links. It’s what fans discover, follow, and support. Manage it from your Artist Dashboard, where you’ll also find your catalog, earnings, and audience analytics.',
      link: '/artist-dashboard',
      linkLabel: 'Open Artist Dashboard',
    },
    features: [
      { icon: Disc3, title: 'Catalog Manager', description: 'Upload songs and organize releases. Each track is what fans stream, add to playlists, and support.', link: '/catalog' },
      { icon: Banknote, title: 'Payout Dashboard', description: 'Track your earnings, pending balance, and completed payouts. Funds are sent to your configured payment method.', link: '/payouts' },
      { icon: Scale, title: 'Rights Management', description: 'Manage split sheets, ownership claims, and DMCA tools so your rights and collaborators are protected.', link: '/rights-management' },
      { icon: TrendingUp, title: 'Audience Analytics', description: 'See your supporter count, monthly support, resonance score, and listener growth over time.', link: '/artist-dashboard' },
    ],
    howTo: [
      { title: 'Claim your Artist Handle', description: 'Set your unique !handle so fans can find and tag you across the platform.', link: '/artist-dashboard' },
      { title: 'Upload your first song', description: 'Add audio and metadata from the Catalog Manager to make your music available.', link: '/catalog' },
      { title: 'Set up your payout method', description: 'Configure where your earnings are sent so completed payouts reach you.', link: '/payouts' },
    ],
    tips: [
      'Complete your profile — bio, genres, images, and socials — so fans can discover and connect with you.',
      'Set up Revenue Splits to automatically share earnings with your collaborators.',
      'Songs added to fan playlists are locked for 30 days, guaranteeing that month’s disbursement stays with you.',
    ],
  },

  discovery_partner: {
    roleLabel: 'Discovery Partner',
    tagline: 'You spotlight the artists the world needs to hear.',
    profile: {
      icon: Compass,
      title: 'Your Partner Profile',
      body: 'Your discovery partner profile is your credibility as a tastemaker. It showcases the artists you’ve spotlighted, your curated playlists, and your track record of breaking artists. Manage it from your Discovery Dashboard.',
      link: '/discovery-partner-dashboard',
      linkLabel: 'Open Discovery Dashboard',
    },
    features: [
      { icon: Sparkles, title: 'Spotlights', description: 'Highlight artists you believe in. Spotlights elevate artists in front of fans and other partners.', link: '/discovery-partner-dashboard' },
      { icon: ListMusic, title: 'Curated Playlists', description: 'Assemble your discovery picks into playlists that showcase your taste.', link: '/discovery-partner-dashboard' },
      { icon: Heart, title: 'Follow Artists', description: 'Track artists you’re watching so you can champion them at the right moment.', link: '/discovery-partners' },
    ],
    howTo: [
      { title: 'Complete your partner profile', description: 'Set up your identity so artists and fans recognize your expertise.', link: '/discovery-partner-dashboard' },
      { title: 'Create your first spotlight', description: 'Put an artist in front of the community with a spotlight.', link: '/discovery-partner-dashboard' },
      { title: 'Build a curated playlist', description: 'Assemble your strongest discovery picks into a shareable playlist.', link: '/discovery-partner-dashboard' },
    ],
    tips: [
      'Consistent, well-written spotlights build your reputation as a trusted tastemaker.',
      'Follow artists early — you get credit when the artists you champion break out.',
      'Your curated playlists are your portfolio; keep them fresh.',
    ],
  },

  radio_programmer: {
    roleLabel: 'Radio Programmer',
    tagline: 'Bring fresh independent music to your station’s rotation.',
    profile: {
      icon: Mic2,
      title: 'Your Radio Profile',
      body: 'Your radio programmer profile represents your station. It tracks the artists you’ve added to rotation, your playlists, and airplay reports. Manage everything from the Radio Portal.',
      link: '/radio-programmer-dashboard',
      linkLabel: 'Open Radio Portal',
    },
    features: [
      { icon: Compass, title: 'Artist Submissions', description: 'Review music submitted by artists looking for airplay on your station.', link: '/radio-programmer-dashboard' },
      { icon: Radio, title: 'Rotation', description: 'Add artists to rotation and track spins with airplay reports.', link: '/radio-programmer-dashboard' },
      { icon: ListMusic, title: 'Radio Playlists', description: 'Build your station’s playlists from the artists you discover.', link: '/radio-programmer-dashboard' },
    ],
    howTo: [
      { title: 'Complete your station profile', description: 'Set up your station identity so artists know who’s reviewing their music.', link: '/radio-programmer-dashboard' },
      { title: 'Browse submissions', description: 'Review artist submissions and find tracks worth adding to rotation.', link: '/radio-programmer-dashboard' },
      { title: 'Add an artist to rotation', description: 'Start playing a track and log it with an airplay report.', link: '/radio-programmer-dashboard' },
    ],
    tips: [
      'Airplay reports feed artist discovery metrics — accurate reporting helps artists grow.',
      'Artists you add to rotation get a meaningful boost in their Resonance score.',
      'You can download submission audio for offline review from the Radio Portal.',
    ],
  },

  admin: {
    roleLabel: 'Admin',
    tagline: 'You keep the platform running smoothly and safely.',
    profile: {
      icon: Settings,
      title: 'Your Admin Access',
      body: 'Your admin role gives you oversight of platform operations, moderation, payments, and content. Your profile is the same as any user, but your dashboard unlocks operational tools. Start at Platform Operations for the full overview.',
      link: '/platform-operations',
      linkLabel: 'Open Platform Operations',
    },
    features: [
      { icon: Settings, title: 'Platform Operations', description: 'The admin overview — settings, payment gateways, hero banners, and platform health.', link: '/platform-operations' },
      { icon: Gavel, title: 'Moderation Queue', description: 'Review user reports and take action to keep the community safe.', link: '/moderation-queue' },
      { icon: CreditCard, title: 'Payment Gateways', description: 'Verify checkout and payment providers are configured correctly.', link: '/platform-operations' },
      { icon: Sparkles, title: 'Hero Banners', description: 'Curate the homepage banners that fans see first.', link: '/platform-operations' },
    ],
    howTo: [
      { title: 'Review platform operations', description: 'Check the admin overview dashboard for system health and pending items.', link: '/platform-operations' },
      { title: 'Handle the moderation queue', description: 'Triage user reports and resolve them appropriately.', link: '/moderation-queue' },
      { title: 'Verify payment gateways', description: 'Ensure checkout and payout providers are active and correct.', link: '/platform-operations' },
    ],
    tips: [
      'Use the Platform Operations dashboard as your daily command center.',
      'Respond to moderation reports promptly to keep the community trusted.',
      'Hero banners drive discovery — keep them fresh and relevant.',
    ],
  },

  master_admin: {
    roleLabel: 'Master Admin',
    tagline: 'Full platform control — operations, launch readiness, and beta mode.',
    profile: {
      icon: Crown,
      title: 'Your Master Admin Access',
      body: 'As Master Admin you have full control: everything an Admin sees, plus Launch Readiness, Beta Control Center, and platform-wide settings. Your profile is standard, but your dashboard includes the highest-level oversight tools.',
      link: '/platform-operations',
      linkLabel: 'Open Platform Operations',
    },
    features: [
      { icon: Settings, title: 'Platform Operations', description: 'Full admin overview — settings, payments, banners, and platform health.', link: '/platform-operations' },
      { icon: Sparkles, title: 'Launch Readiness', description: 'Track pre-launch requirements before going fully public.', link: '/launch-readiness' },
      { icon: Mic2, title: 'Beta Control Center', description: 'Manage beta mode, founding pricing, and the transition to public launch.', link: '/beta-control' },
      { icon: Gavel, title: 'Moderation Queue', description: 'Oversee community safety and user reports.', link: '/moderation-queue' },
    ],
    howTo: [
      { title: 'Review operations', description: 'Start at Platform Operations for the system-wide overview.', link: '/platform-operations' },
      { title: 'Check launch readiness', description: 'Walk the readiness checklist before public launch.', link: '/launch-readiness' },
      { title: 'Manage beta mode', description: 'Control beta settings, pricing, and deactivation from the Beta Control Center.', link: '/beta-control' },
    ],
    tips: [
      'Launch Readiness must be complete before transitioning out of beta.',
      'Beta deactivation has a 72-hour rollback window — plan transitions carefully.',
      'You can override an incomplete readiness checklist with a written reason, but use it sparingly.',
    ],
  },

  admin_partner: {
    roleLabel: 'Admin Partner',
    tagline: 'You share in platform revenue based on your role and permissions.',
    profile: {
      icon: Crown,
      title: 'Your Partner Access',
      body: 'Your Admin Partner account gives you scoped access to platform tools and a share of platform revenue. Your permissions determine what you can see and do. Manage your earnings and permissions from the Admin Partner Dashboard.',
      link: '/admin-partner-dashboard',
      linkLabel: 'Open Partner Dashboard',
    },
    features: [
      { icon: Crown, title: 'Your Permissions', description: 'Review exactly what areas of the platform you can access.', link: '/admin-partner-dashboard' },
      { icon: Wallet, title: 'Revenue Share', description: 'Track your earnings from the platform’s revenue share.', link: '/admin-partner-dashboard' },
    ],
    howTo: [
      { title: 'Review your permissions', description: 'See what you can access across the platform.', link: '/admin-partner-dashboard' },
      { title: 'View your earnings', description: 'Check your revenue share and payout history.', link: '/admin-partner-dashboard' },
    ],
    tips: [
      'Your permissions are scoped by Master Admin — request access if you need more.',
      'Revenue share is calculated and disbursed on the platform’s monthly cycle.',
    ],
  },

  community_manager: {
    roleLabel: 'Community Manager',
    tagline: 'You lead and nurture your Frequency community.',
    profile: {
      icon: Radio,
      title: 'Your Community Role',
      body: 'As a community manager you lead a Frequency — posting announcements, running polls, and keeping members engaged. Your community lives on the Frequencies page.',
      link: '/frequencies',
      linkLabel: 'Open Frequencies',
    },
    features: [
      { icon: Radio, title: 'Your Frequency', description: 'Open your community page to engage with members.', link: '/frequencies' },
      { icon: Megaphone, title: 'Announcements', description: 'Post updates and welcome new members to your community.', link: '/frequencies' },
    ],
    howTo: [
      { title: 'Visit your Frequency', description: 'Open your community page to see member activity.', link: '/frequencies' },
      { title: 'Post an announcement', description: 'Welcome members and share what’s happening.', link: '/frequencies' },
    ],
    tips: [
      'Active, welcoming communities grow faster — post regularly.',
      'Use polls to involve members in community decisions.',
    ],
  },
};

export const getHelpGuide = (role) => HELP_GUIDES[role] || HELP_GUIDES.fan;