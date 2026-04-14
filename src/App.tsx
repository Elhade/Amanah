import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeaderDashboardPage } from './pages/LeaderDashboardPage';
import { AddDonationPage } from './pages/AddDonationPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { LeadersPage } from './pages/LeadersPage';
import { DonatePage } from './pages/DonatePage';
import type { Page } from './types';

function getInitialRoute(): { page: Page | 'donate'; slug?: string } {
  const hash = window.location.hash || '#/dashboard';

  if (hash.startsWith('#/donate')) {
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    return {
      page: 'donate',
      slug: params.get('ref') || undefined,
    };
  }

  const route = hash.replace('#/', '') as Page;

  const allowedPages: Page[] = [
    'dashboard',
    'leader-dashboard',
    'add-donation',
    'history',
    'projects',
    'leaders',
  ];

  if (allowedPages.includes(route)) {
    return { page: route };
  }

  return { page: 'dashboard' };
}

function AppInner() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page | 'donate'>(() => getInitialRoute().page);
  const [donateSlug, setDonateSlug] = useState<string | undefined>(() => getInitialRoute().slug);

  useEffect(() => {
    const handleHashChange = () => {
      const { page, slug } = getInitialRoute();
      setCurrentPage(page);
      setDonateSlug(slug);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.location.hash = `/${page}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-emerald-300 text-sm font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'donate') {
    return <DonatePage leaderSlug={donateSlug} />;
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  const isAdmin = profile.role === 'super_admin';

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'leader-dashboard':
        return <LeaderDashboardPage onNavigate={navigate} />;
      case 'add-donation':
        return <AddDonationPage onNavigate={navigate} />;
      case 'history':
        return <HistoryPage onNavigate={navigate} />;
      case 'projects':
        return isAdmin ? <ProjectsPage /> : <DashboardPage onNavigate={navigate} />;
      case 'leaders':
        return isAdmin ? <LeadersPage /> : <DashboardPage onNavigate={navigate} />;
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage as Page} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
