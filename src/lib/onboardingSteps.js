import {
  User, Wallet, Radio, Heart, ListMusic, AtSign,
  Upload, Share2, CreditCard, Compass, Sparkles,
  Settings, Gavel, Crown, Megaphone, Mic2, Briefcase, Gift, ShieldCheck
} from 'lucide-react';

export const ONBOARDING_STEPS = {
  fan: [
    { key: 'set_profile', label: 'Personalize your profile', description: 'Set your display name and avatar', icon: User, link: '/security' },
    { key: 'set_budget', label: 'Set your monthly budget', description: 'Configure your monthly support budget', icon: Wallet, link: '/fan-dashboard' },
    { key: 'join_frequency', label: 'Join a Frequency', description: 'Find and join a music community', icon: Radio, link: '/frequencies' },
    { key: 'support_artist', label: 'Support your first artist', description: 'Back an artist with monthly support', icon: Heart, link: '/artists' },
    { key: 'explore_playlists', label: 'Explore playlists', description: 'Discover curated playlists', icon: ListMusic, link: '/playlists' },
  ],
  artist: [
    { key: 'create_profile', label: 'Create your artist profile', description: 'Set up your artist identity', icon: User, link: '/artist-dashboard' },
    { key: 'set_handle', label: 'Claim your Artist Handle', description: 'Get your unique !handle', icon: AtSign, link: '/artist-dashboard' },
    { key: 'upload_song', label: 'Upload your first song', description: 'Share your music with the world', icon: Upload, link: '/artist-dashboard' },
    { key: 'add_socials', label: 'Add social links', description: 'Connect your social media', icon: Share2, link: '/artist-dashboard' },
    { key: 'setup_payments', label: 'Set up payouts', description: 'Configure your payment method', icon: CreditCard, link: '/artist-dashboard' },
  ],
  discovery_partner: [
    { key: 'complete_profile', label: 'Complete your partner profile', description: 'Set up your discovery partner identity', icon: User, link: '/discovery-partner-dashboard' },
    { key: 'follow_artist', label: 'Follow your first artist', description: 'Start tracking artists you discover', icon: Heart, link: '/discovery-partners' },
    { key: 'create_spotlight', label: 'Create your first spotlight', description: 'Highlight an artist you believe in', icon: Sparkles, link: '/discovery-partner-dashboard' },
    { key: 'curate_playlist', label: 'Build a curated playlist', description: 'Assemble your discovery picks', icon: ListMusic, link: '/discovery-partner-dashboard' },
  ],
  radio_programmer: [
    { key: 'complete_profile', label: 'Complete your radio profile', description: 'Set up your station identity', icon: Mic2, link: '/radio-programmer-dashboard' },
    { key: 'browse_submissions', label: 'Browse artist submissions', description: 'Review music from artists', icon: Compass, link: '/radio-programmer-dashboard' },
    { key: 'add_rotation', label: 'Add an artist to rotation', description: 'Start playing music on your station', icon: Radio, link: '/radio-programmer-dashboard' },
    { key: 'create_playlist', label: 'Create a radio playlist', description: "Build your station's playlist", icon: ListMusic, link: '/radio-programmer-dashboard' },
  ],
  admin: [
    { key: 'review_operations', label: 'Review platform operations', description: 'Check the admin overview dashboard', icon: Settings, link: '/platform-operations' },
    { key: 'check_moderation', label: 'Review the moderation queue', description: 'Handle pending user reports', icon: Gavel, link: '/moderation-queue' },
    { key: 'manage_banners', label: 'Manage hero banners', description: 'Curate the homepage banners', icon: Sparkles, link: '/platform-operations' },
    { key: 'verify_payments', label: 'Verify payment gateways', description: 'Ensure checkout is configured', icon: CreditCard, link: '/platform-operations' },
  ],
  master_admin: [
    { key: 'review_operations', label: 'Review platform operations', description: 'Check the admin overview dashboard', icon: Settings, link: '/platform-operations' },
    { key: 'check_moderation', label: 'Review the moderation queue', description: 'Handle pending user reports', icon: Gavel, link: '/moderation-queue' },
    { key: 'manage_banners', label: 'Manage hero banners', description: 'Curate the homepage banners', icon: Sparkles, link: '/platform-operations' },
    { key: 'verify_payments', label: 'Verify payment gateways', description: 'Ensure checkout is configured', icon: CreditCard, link: '/platform-operations' },
  ],
  admin_partner: [
    { key: 'review_permissions', label: 'Review your permissions', description: 'See what you can access', icon: Crown, link: '/admin-partner-dashboard' },
    { key: 'view_earnings', label: 'View your earnings', description: 'Check your revenue share', icon: Wallet, link: '/admin-partner-dashboard' },
  ],
  business_partner: [
    { key: 'complete_profile', label: 'Complete your business profile', description: 'Set up your partner identity', icon: Briefcase, link: '/business-partner-dashboard' },
    { key: 'await_verification', label: 'Await admin verification', description: 'Your profile is reviewed before going live', icon: ShieldCheck, link: '/business-partner-dashboard' },
    { key: 'add_offer', label: 'Add your first offer', description: 'Create an approved discount or benefit', icon: Gift, link: '/business-partner-dashboard' },
  ],
  community_manager: [
    { key: 'visit_frequency', label: 'Visit your Frequency', description: 'Open your community page', icon: Radio, link: '/frequencies' },
    { key: 'post_announcement', label: 'Post an announcement', description: 'Welcome your community members', icon: Megaphone, link: '/frequencies' },
  ],
};

export const getOnboardingSteps = (role) => {
  return ONBOARDING_STEPS[role] || ONBOARDING_STEPS.fan;
};

export const getDashboardForRole = (role) => {
  const map = {
    fan: '/fan-dashboard',
    artist: '/artist-dashboard',
    discovery_partner: '/discovery-partner-dashboard',
    radio_programmer: '/radio-programmer-dashboard',
    admin: '/platform-operations',
    master_admin: '/platform-operations',
    admin_partner: '/admin-partner-dashboard',
    business_partner: '/business-partner-dashboard',
    community_manager: '/frequencies',
  };
  return map[role] || '/fan-dashboard';
};