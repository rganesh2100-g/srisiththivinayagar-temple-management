import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

const DashboardRouter = () => {
  const { isAdmin, isPremium, initialLoading } = useAuth();
  
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // 1. Admin users are routed to the admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // 2. Regular users are routed based on their premium status
  return <Navigate to={isPremium ? "/dashboard/premium-member" : "/dashboard/free-member"} replace />;
};

export default DashboardRouter;