import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import SubscriptionHistorySidebar from '@/components/SubscriptionHistorySidebar.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { 
  User, 
  Mail, 
  Shield, 
  Sparkles, 
  Heart, 
  ArrowRight,
  BookOpen,
  Clock,
  CheckCircle2
} from 'lucide-react';

const FreeMemberDashboard = () => {
  const { currentUser, isPremium } = useAuth();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);

  const handleSubscriptionsLoaded = useCallback((loadedSubs) => {
    setSubscriptions(loadedSubs);
  }, []);

  const displayName = useMemo(() => 
    currentUser?.full_name || currentUser?.fullName || currentUser?.name || 'Member', 
  [currentUser]);
  
  const accountType = useMemo(() => 
    currentUser?.account_type || (isPremium ? 'Premium Member' : 'Free Member'), 
  [currentUser, isPremium]);

  const hasPendingSubscription = useMemo(() => 
    subscriptions.some((s) => s.status === 'pending'), 
  [subscriptions]);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full">
        <Helmet>
          <title>Dashboard - Free Member</title>
        </Helmet>
        
        <div className="break-words">
          <h1 className="text-fluid-h1 text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl text-balance">
            Manage your account, view your bookings, and explore free temple services.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
            
            {!isPremium ? (
              <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 min-w-0">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap border border-accent/20">
                        <Sparkles className="w-3.5 h-3.5" /> Recommended
                      </div>
                      <h3 className="font-semibold text-2xl text-foreground truncate">Upgrade to Premium</h3>
                      <p className="text-muted-foreground text-base max-w-md text-pretty leading-relaxed">
                        Unlock exclusive benefits, priority event bookings, and detailed financial transparency reports.
                      </p>
                    </div>
                    
                    {hasPendingSubscription ? (
                      <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full sm:w-auto cursor-not-allowed">
                                <Button 
                                  disabled 
                                  className="whitespace-nowrap rounded-xl px-6 h-12 shadow-sm w-full text-base font-medium opacity-70 bg-muted text-muted-foreground border border-border/50 shrink-0 pointer-events-none"
                                >
                                  <Clock className="w-4 h-4 mr-2" /> Pending Admin Approval
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-center p-3 text-sm">
                              Your premium subscription request is currently being reviewed by our administrators.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-xs text-muted-foreground font-medium">Your request is under review</p>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => navigate('/membership/select')} 
                        className="whitespace-nowrap rounded-xl px-8 h-12 shadow-md w-full sm:w-auto text-base font-medium transition-all hover:shadow-lg active:scale-[0.98] shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Upgrade Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm border-emerald-500/20 rounded-2xl overflow-hidden bg-emerald-500/5 min-w-0">
                <CardContent className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl text-foreground">Premium Subscription Active</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Your account is upgraded to premium status.
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/dashboard/premium-member')} variant="outline" className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                    Go to Premium Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/poojas" className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group min-w-0">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1 truncate">Book a Pooja</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">Browse and reserve slots for upcoming poojas and rituals.</p>
                <div className="flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                  View Schedule <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
                </div>
              </Link>

              <Link to="/donate" className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group min-w-0">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground shrink-0">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1 truncate">Make a Donation</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">Support the temple's initiatives and community services.</p>
                <div className="flex items-center text-sm font-medium text-accent-foreground group-hover:translate-x-1 transition-transform">
                  Donate Now <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
                </div>
              </Link>
            </div>

          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-card min-w-0">
              <CardHeader className="bg-muted/40 pb-5 border-b border-border/50 shrink-0">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold truncate">
                  <User className="w-5 h-5 text-primary shrink-0" />
                  Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6 min-w-0">
                <div className="min-w-0">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Full Name</label>
                  <p className="text-base font-medium text-foreground mt-1 truncate" title={displayName}>{displayName}</p>
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" /> Email Address
                  </label>
                  <p className="text-base font-medium text-foreground mt-1 truncate" title={currentUser?.email}>
                    {currentUser?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 shrink-0" /> Account Type
                  </label>
                  <div className="mt-2">
                    <Badge variant="secondary" className="px-3 py-1 text-sm font-medium rounded-lg bg-secondary/80 text-secondary-foreground border border-border/50 truncate max-w-full block">
                      {accountType}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SubscriptionHistorySidebar 
              currentUser={currentUser} 
              onSubscriptionsLoaded={handleSubscriptionsLoaded} 
            />
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default FreeMemberDashboard;