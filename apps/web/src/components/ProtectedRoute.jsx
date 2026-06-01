import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, initialLoading, currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Wait until auth state is fully loaded from PocketBase
    if (initialLoading) return;

    // Check if user is authenticated
    if (!isAuthenticated || !currentUser) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    // Role-based access control
    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowedAdmin = allowedRoles.includes('admin') && (isAdmin || currentUser.role === 'admin');
      const isAllowedUser = allowedRoles.includes('user') && currentUser.role === 'user';
      
      if (!isAllowedAdmin && !isAllowedUser) {
        setAccessDenied(true);
      }
    }
  }, [initialLoading, isAuthenticated, currentUser, isAdmin, location.pathname, navigate, allowedRoles]);

  if (initialLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Access Denied</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
          You do not have the required permissions to view this page. If you believe this is an error, please contact an administrator.
        </p>
        <Button onClick={() => navigate('/')} size="lg" className="h-12 px-8 text-base">
          Return to Home
        </Button>
      </div>
    );
  }

  // Prevent flash of content before redirect
  if (!isAuthenticated || !currentUser) return null;

  return children;
};

export default ProtectedRoute;