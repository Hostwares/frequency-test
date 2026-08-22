import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getRoleDashboard } from '@/lib/roleDashboards';
import Home from '@/pages/Home';

/**
 * Sits at the "/" route. On a fresh login (flagged via sessionStorage by
 * the Login page), redirects to the user's role-appropriate dashboard.
 * On normal navigation to "/", renders the Home page as usual.
 */
export default function RoleDashboardRedirect() {
  const { user, authChecked } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authChecked || !user) return;

    const isFreshLogin = sessionStorage.getItem('fresh_login');
    if (isFreshLogin) {
      sessionStorage.removeItem('fresh_login');
      const dashboard = getRoleDashboard(user);
      if (dashboard && dashboard !== '/') {
        navigate(dashboard, { replace: true });
      }
    }
  }, [user, authChecked, navigate]);

  return <Home />;
}