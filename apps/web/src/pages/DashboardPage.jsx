import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  History, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Lock, 
  Calendar, 
  MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner';

import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';

const DashboardPage = () => {
  const { currentUser, isPremium, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!currentUser?.id || isAdmin) return;

      try {
        setLoading(true);
        setError(null);

        const records = await pb.collection('subscriptions').getFullList({
          filter: `user="${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });

        if (records.length > 0) {
          const sub = records[0];
          setSubscription({
            membership_type: sub.plan_type || 'premium',
            approval_status: sub.status,
            transaction_id: sub.transaction_id,
            end_date: sub.end_date
          });
        } else {
          if (isPremium) {
            setSubscription({
              membership_type: 'premium',
              approval_status: currentUser.approval_status || 'approved',
              transaction_id: null,
              end_date: currentUser.subscription_expiry_date
            });
          } else {
            setSubscription({
              membership_type: 'free',
              approval_status: 'active',
              transaction_id: null,
              end_date: null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err.message);
        toast.error('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [currentUser, isAdmin, isPremium]);

  const renderBanner = () => {
    if (!subscription) return null;

    const { membership_type, approval_status, transaction_id, end_date } = subscription;
    const isFreePlan = membership_type === 'free';
    const isPremiumPlan = membership_type === 'premium';

    if (isFreePlan && (approval_status === 'active' || approval_status === 'approved')) {
      return (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-primary shrink-0 sm:mt-0.5 hidden sm:block" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 sm:hidden" />
              Welcome to your Dashboard!
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base text-pretty">Your free membership is active. Explore basic temple services below.</p>
          </div>
        </div>
      );
    }

    if (isPremiumPlan && (approval_status === 'pending' || approval_status === 'pending_approval')) {
      return (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
          <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0 sm:mt-0.5 hidden sm:block" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-400 mb-1 flex items-center gap-2 truncate">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 sm:hidden" />
              Payment Verification
            </h2>
            <p className="text-amber-800 dark:text-amber-300 text-sm sm:text-base text-pretty">
              Your transaction {transaction_id ? `(ID: ${transaction_id})` : ''} is being reviewed. Premium features will unlock shortly.
            </p>
          </div>
        </div>
      );
    }

    if (isPremiumPlan && (approval_status === 'active' || approval_status === 'approved')) {
      const formattedDate = end_date ? new Date(end_date).toLocaleDateString() : 'N/A';
      return (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500 shrink-0 sm:mt-0.5 hidden sm:block" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-400 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0 sm:hidden" />
              🌟 Premium Member
            </h2>
            <p className="text-emerald-800 dark:text-emerald-300 text-sm sm:text-base text-pretty">
              Your membership is active until {formattedDate}. Thank you for your support!
            </p>
          </div>
        </div>
      );
    }

    if (isPremiumPlan && approval_status === 'rejected') {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
          <XCircle className="w-6 h-6 text-destructive shrink-0 sm:mt-0.5 hidden sm:block" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-destructive mb-1 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive shrink-0 sm:hidden" />
              Membership Rejected
            </h2>
            <p className="text-destructive/80 text-sm sm:text-base text-pretty">
              Your premium membership request was rejected. Please contact support for more information.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  const isPremiumActive = subscription?.membership_type === 'premium' && 
    (subscription?.approval_status === 'active' || subscription?.approval_status === 'approved');

  const isPremiumPending = subscription?.membership_type === 'premium' && 
    (subscription?.approval_status === 'pending' || subscription?.approval_status === 'pending_approval');

  const features = [
    {
      title: 'My Profile',
      description: 'Update your personal information',
      icon: User,
      link: '/dashboard/my-profile',
      isPremiumOnly: false
    },
    {
      title: 'Pooja Bookings',
      description: 'Manage your upcoming and past poojas',
      icon: Calendar,
      link: '/dashboard/my-bookings',
      isPremiumOnly: false
    },
    {
      title: 'Subscription History',
      description: 'View your subscription and payment history',
      icon: History,
      link: '/dashboard/santha-history',
      isPremiumOnly: false
    },
    {
      title: 'Financial Transparency',
      description: 'View detailed temple accounts and reports',
      icon: TrendingUp,
      link: '/financial-transparency',
      isPremiumOnly: true
    },
    {
      title: 'Direct Messaging',
      description: 'Contact temple administration directly',
      icon: MessageSquare,
      link: '/dashboard/user-messages',
      isPremiumOnly: true
    }
  ];

  if (isAdmin) return null;

  return (
    <div className="space-y-8 w-full">
      <Helmet>
        <title>Dashboard | Temple Portal</title>
      </Helmet>

      <div className="mb-8 min-w-0">
        <h1 className="text-fluid-h1 font-bold text-foreground tracking-tight mb-2 truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
          Welcome, {currentUser?.name || currentUser?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base text-pretty">
          Manage your membership and access temple services
        </p>
      </div>

      {loading ? (
        <div className="space-y-4 mb-8">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-8 text-center">
          <p className="text-destructive font-medium mb-4">Failed to load subscription status.</p>
          <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
        </div>
      ) : !subscription ? (
        <div className="bg-muted border rounded-xl p-8 mb-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
          <p className="text-muted-foreground mb-6">Please select a membership plan to access dashboard features.</p>
          <Button onClick={() => navigate('/membership/select')}>Select Membership</Button>
        </div>
      ) : (
        renderBanner()
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <TooltipProvider>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLocked = feature.isPremiumOnly && !isPremiumActive;
            const showLockedBadge = feature.isPremiumOnly && isPremiumPending;
            
            if (feature.isPremiumOnly && (!subscription || subscription.membership_type === 'free' || subscription.approval_status === 'rejected')) {
              return null;
            }

            const CardWrapper = ({ children }) => (
              <Card 
                className={`h-full flex flex-col border-border/50 shadow-sm transition-all duration-200 min-w-0 ${isLocked ? 'opacity-75' : 'hover:shadow-md cursor-pointer hover:-translate-y-1'}`}
                onClick={() => !isLocked && navigate(feature.link)}
              >
                {children}
              </Card>
            );

            const cardContent = (
              <CardWrapper>
                <CardHeader className="pb-3 flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    {showLockedBadge && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Lock className="w-3 h-3" /> Locked
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg sm:text-xl mt-4 truncate">{feature.title}</CardTitle>
                  <CardDescription className="text-sm mt-1 line-clamp-2">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <div className={`flex items-center text-sm font-medium ${isLocked ? 'text-muted-foreground' : 'text-primary'}`}>
                    {isLocked ? 'Pending Approval' : 'Access Feature'}
                    {!isLocked && <ArrowRight className="w-4 h-4 ml-1 shrink-0" />}
                  </div>
                </CardContent>
              </CardWrapper>
            );

            if (isLocked) {
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div className="h-full cursor-not-allowed">
                      {cardContent}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Unlock with premium membership</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={index} className="h-full">{cardContent}</div>;
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default DashboardPage;