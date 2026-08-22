import { Toaster } from "@/components/ui/toaster"
import { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PlayerProvider } from '@/context/PlayerContext';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';

import AppLayout from '@/components/layout/AppLayout';
import ArtistProfilePage from '@/pages/ArtistProfile';
import FanDashboard from '@/pages/FanDashboard';
import ArtistDashboard from '@/pages/ArtistDashboard';
import Frequencies from '@/pages/Frequencies';
import Artists from '@/pages/Artists';
import Events from '@/pages/Events';
import Marketplace from '@/pages/Marketplace';
import Playlists from '@/pages/Playlists';
import PlaylistDetail from '@/pages/PlaylistDetail';
import Wallet from '@/pages/Wallet';
import FrequencyDetail from '@/pages/FrequencyDetail';
import DiscoveryPartners from '@/pages/DiscoveryPartners';
import DiscoveryPartnerProfile from '@/pages/DiscoveryPartnerProfile';
import DiscoveryPartnerDashboard from '@/pages/DiscoveryPartnerDashboard';
import BreakoutArtists from '@/pages/BreakoutArtists';
import RadioProgrammerDashboard from '@/pages/RadioProgrammerDashboard';
import RadioApplication from '@/pages/RadioApplication';
import RadioVerificationReview from '@/pages/RadioVerificationReview';
import BusinessPartnerApplication from '@/pages/BusinessPartnerApplication';
import BusinessPartnerDashboard from '@/pages/BusinessPartnerDashboard';
import BusinessPartnerReview from '@/pages/BusinessPartnerReview';
import StaffManagement from '@/pages/StaffManagement';
import ArtistManagement from '@/pages/ArtistManagement';
import NotificationSettings from '@/pages/NotificationSettings';
import SecurityCenter from '@/pages/SecurityCenter';
import Help from '@/pages/Help';
import SongDetail from '@/pages/SongDetail';
import Catalog from '@/pages/Catalog';
import RightsManagement from '@/pages/RightsManagement';
import HeardFirstArchive from '@/pages/HeardFirstArchive';
import HallOfDiscovery from '@/pages/HallOfDiscovery';
import ThankYou from '@/pages/ThankYou';
import SearchResults from '@/pages/SearchResults';
import EventDetail from '@/pages/EventDetail';
import Pricing from '@/pages/Pricing';
import Legal from '@/pages/Legal';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import DMCAPolicy from '@/pages/DMCAPolicy';
import PlatformOperations from '@/pages/PlatformOperations';
import PayoutDashboard from '@/pages/PayoutDashboard';
import ModerationQueue from '@/pages/ModerationQueue';
import FrequencyGraph from '@/pages/FrequencyGraph';
import AdminPartnerDashboard from '@/pages/AdminPartnerDashboard';
import JournalistPortal from '@/pages/JournalistPortal';
import ArticleDetail from '@/pages/ArticleDetail';
import MyLifeAwards from '@/pages/MyLifeAwards';
import AcademyApplication from '@/pages/AcademyApplication';
import AcademyDashboard from '@/pages/AcademyDashboard';
import NomineeDetail from '@/pages/NomineeDetail';
import Onboarding from '@/pages/Onboarding';
import CollaboratorDashboard from '@/pages/CollaboratorDashboard';
import LaunchReadiness from '@/pages/LaunchReadiness';
import BetaModeControlCenter from '@/pages/BetaModeControlCenter';
import BetaFeedbackLog from '@/pages/BetaFeedbackLog';
import RoleGuard from '@/components/RoleGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleDashboardRedirect from '@/components/RoleDashboardRedirect';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (authError?.type === 'auth_required' && !redirectAttempted.current) {
      redirectAttempted.current = true;
      navigateToLogin();
    }
  }, [authError, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-display">Loading Frequency...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/ThankYou" element={<ThankYou />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoleDashboardRedirect />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artist/:id" element={<ArtistProfilePage />} />
          <Route path="/song/:id" element={<SongDetail />} />
          <Route path="/catalog" element={<RoleGuard roles={['artist']}><Catalog /></RoleGuard>} />
          <Route path="/rights-management" element={<RoleGuard roles={['artist']}><RightsManagement /></RoleGuard>} />
          <Route path="/heard-first" element={<HeardFirstArchive />} />
          <Route path="/hall-of-discovery" element={<HallOfDiscovery />} />
          <Route path="/fan-dashboard" element={<FanDashboard />} />
          <Route path="/artist-dashboard" element={<RoleGuard roles={['artist']}><ArtistDashboard /></RoleGuard>} />
          <Route path="/collaborator-dashboard" element={<RoleGuard roles={['fan', 'artist']}><CollaboratorDashboard /></RoleGuard>} />
          <Route path="/frequencies" element={<Frequencies />} />
          <Route path="/events" element={<Events />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/frequency/:id" element={<FrequencyDetail />} />
          <Route path="/discovery-partners" element={<DiscoveryPartners />} />
          <Route path="/discovery-partner/:id" element={<DiscoveryPartnerProfile />} />
          <Route path="/discovery-partner-dashboard" element={<RoleGuard roles={['discovery_partner']}><DiscoveryPartnerDashboard /></RoleGuard>} />
          <Route path="/breakout-artists" element={<BreakoutArtists />} />
          <Route path="/radio-application" element={<RadioApplication />} />
          <Route path="/radio-programmer-dashboard" element={<RoleGuard roles={['radio_programmer']}><RadioProgrammerDashboard /></RoleGuard>} />
          <Route path="/radio-verification-review" element={<RoleGuard roles="admin"><RadioVerificationReview /></RoleGuard>} />
          <Route path="/business-partner-application" element={<BusinessPartnerApplication />} />
          <Route path="/business-partner-dashboard" element={<BusinessPartnerDashboard />} />
          <Route path="/business-partner-review" element={<RoleGuard roles="admin"><BusinessPartnerReview /></RoleGuard>} />
          <Route path="/staff-management" element={<RoleGuard roles="master"><StaffManagement /></RoleGuard>} />
          <Route path="/artist-management" element={<RoleGuard roles="admin"><ArtistManagement /></RoleGuard>} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/security" element={<SecurityCenter />} />
          <Route path="/help" element={<Help />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/legal/terms" element={<TermsOfService />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/legal/dmca" element={<DMCAPolicy />} />
          <Route path="/platform-operations" element={<RoleGuard roles="admin"><PlatformOperations /></RoleGuard>} />
          <Route path="/moderation-queue" element={<RoleGuard roles="admin"><ModerationQueue /></RoleGuard>} />
          <Route path="/frequency-graph" element={<FrequencyGraph />} />
          <Route path="/admin-partner-dashboard" element={<RoleGuard roles={['admin', 'master_admin', 'admin_partner']}><AdminPartnerDashboard /></RoleGuard>} />
          <Route path="/journalist-portal" element={<RoleGuard roles={['fan', 'artist', 'discovery_partner', 'radio_programmer', 'business_partner', 'professional_consultant', 'community_manager']}><JournalistPortal /></RoleGuard>} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          <Route path="/my-life-awards" element={<MyLifeAwards />} />
          <Route path="/academy-application" element={<AcademyApplication />} />
          <Route path="/academy-dashboard" element={<RoleGuard roles={['fan', 'artist', 'discovery_partner', 'radio_programmer', 'business_partner', 'professional_consultant', 'community_manager']}><AcademyDashboard /></RoleGuard>} />
          <Route path="/nominee/:id" element={<NomineeDetail />} />
          <Route path="/payouts" element={<RoleGuard roles={['artist']}><PayoutDashboard /></RoleGuard>} />
          <Route path="/launch-readiness" element={<RoleGuard roles="master"><LaunchReadiness /></RoleGuard>} />
          <Route path="/beta-control" element={<RoleGuard roles="master"><BetaModeControlCenter /></RoleGuard>} />
          <Route path="/beta-feedback" element={<RoleGuard roles="admin"><BetaFeedbackLog /></RoleGuard>} />
        </Route>
      </Route>
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <PlayerProvider>
            <ErrorBoundary>
              <AuthenticatedApp />
            </ErrorBoundary>
          </PlayerProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App