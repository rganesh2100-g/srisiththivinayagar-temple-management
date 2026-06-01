import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import { 
  User, 
  Activity, 
  Ticket, 
  MessageSquare, 
  Bell, 
  PieChart, 
  ArrowRight,
  Crown,
  CalendarDays,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils.js';

const FreeMembershipPage = () => {
  const { currentUser } = useAuth();

  const joinDate = currentUser?.created 
    ? new Date(currentUser.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const quickActions = [
    {
      title: 'My Profile',
      description: 'Manage your personal details and settings.',
      icon: User,
      path: '/my-profile',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'My Bookings',
      description: 'View your scheduled poojas and rituals.',
      icon: Ticket,
      path: '/my-bookings',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'My Activity',
      description: 'Track your donations and volunteer work.',
      icon: Activity,
      path: '/my-activity',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Messages',
      description: 'Communicate with temple administrators.',
      icon: MessageSquare,
      path: '/user-messages',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Notifications',
      description: 'Recent alerts and temple updates.',
      icon: Bell,
      path: '/notifications',
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
    },
    {
      title: 'Financial Transparency',
      description: 'View detailed temple financial reports.',
      icon: PieChart,
      path: '/financial-transparency',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      locked: true,
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Dashboard | Temple Portal</title>
      </Helmet>
      
      <Header />

      <div className="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden relative">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Welcome, {currentUser?.name || currentUser?.email?.split('@')[0]}
              </h1>
              <p className="text-muted-foreground">
                Manage your temple activities and access your personalized services.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-medium bg-muted text-foreground border-border">
                Free Membership
              </Badge>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>

          {/* Premium Upgrade Banner */}
          <Card className="border-none bg-primary text-primary-foreground shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-2">
                  <Crown className="w-3.5 h-3.5" />
                  Premium Access
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Elevate your spiritual journey
                </h2>
                <p className="text-primary-foreground/90 text-sm sm:text-base leading-relaxed">
                  Upgrade to Premium to unlock priority pooja bookings, exclusive temple financial reports, deeper engagement with administration, and special event invitations.
                </p>
              </div>
              <Button asChild size="lg" className="w-full md:w-auto bg-white text-primary hover:bg-white/90 font-semibold shrink-0 shadow-sm">
                <Link to="/membership-selection">
                  Upgrade to Premium
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions Bento Grid */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const isLocked = action.locked;

                return (
                  <Link 
                    key={idx} 
                    to={isLocked ? '/membership-selection' : action.path}
                    className={cn(
                      "block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl",
                      isLocked ? "cursor-pointer" : ""
                    )}
                  >
                    <Card className={cn(
                      "h-full transition-all duration-200 border-border/50",
                      isLocked 
                        ? "bg-muted/30 hover:bg-muted/50 opacity-90" 
                        : "hover:shadow-md hover:-translate-y-1 bg-card"
                    )}>
                      <CardHeader className="pb-3 relative">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2", action.bgColor, action.color)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        {isLocked && (
                          <div className="absolute top-6 right-6 text-muted-foreground/60">
                            <Lock className="w-5 h-5" />
                          </div>
                        )}
                        <CardTitle className="text-lg flex items-center gap-2">
                          {action.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {action.description}
                        </p>
                        <div className={cn(
                          "text-sm font-semibold flex items-center gap-1",
                          isLocked ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"
                        )}>
                          {isLocked ? 'Unlock with Premium' : 'View Details'}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default FreeMembershipPage;