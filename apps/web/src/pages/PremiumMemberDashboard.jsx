import React, { useEffect, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { Crown } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';

const PremiumProfileSection = lazy(() => import('@/components/PremiumProfileSection.jsx'));
const PremiumActionCards = lazy(() => import('@/components/PremiumActionCards.jsx'));

const ProfileSkeleton = () => <Skeleton className="h-[400px] w-full rounded-2xl" />;
const CardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
    <Skeleton className="h-[250px] w-full rounded-2xl" />
    <Skeleton className="h-[250px] w-full rounded-2xl" />
  </div>
);

const PremiumMemberDashboard = () => {
  const { currentUser, isPremium, fetchUserByEmail, refreshUserData } = useAuth();
  const [userData, setUserData] = useState(currentUser);
  const navigate = useNavigate();

  const userEmail = useMemo(() => currentUser?.email, [currentUser?.email]);

  useEffect(() => {
    if (currentUser && !isPremium) {
      navigate('/dashboard/free-member', { replace: true });
    }
  }, [isPremium, currentUser, navigate]);

  const loadUser = useCallback(async () => {
    if (userEmail) {
      try {
        const data = await fetchUserByEmail(userEmail);
        if (data) {
          setUserData(data);
          refreshUserData(data);
        }
      } catch (error) {
        console.error("Failed to refresh user data", error);
      }
    }
  }, [userEmail, fetchUserByEmail, refreshUserData]);

  useEffect(() => {
    loadUser();
    const intervalId = setInterval(loadUser, 30000); 
    return () => clearInterval(intervalId);
  }, [loadUser]);

  const handleNavigate = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  const displayName = useMemo(() => userData?.fullName || userData?.name || 'Member', [userData]);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full">
        <Helmet>
          <title>Premium Dashboard - Sri Siththi Vinayagar Temple</title>
        </Helmet>
        
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3" style={{ letterSpacing: '-0.02em' }}>
              Welcome, {displayName}
              <Crown className="w-8 h-8 text-[#FFD700] fill-[#FFD700]/20" />
            </h1>
            <p className="text-muted-foreground text-lg">Thank you for your premium support.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ErrorBoundary>
              <Suspense fallback={<ProfileSkeleton />}>
                <PremiumProfileSection userData={userData} />
              </Suspense>
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-2">
            <ErrorBoundary>
              <Suspense fallback={<CardsSkeleton />}>
                <PremiumActionCards onNavigate={handleNavigate} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PremiumMemberDashboard;