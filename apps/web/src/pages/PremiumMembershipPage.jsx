import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Calendar, Heart, ArrowRight, ShieldCheck, FileText, MessageSquare, Clock } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PremiumMembershipPage = () => {
  const { currentUser } = useAuth();
  const { subscription } = useSubscriptionAccess(currentUser?.id);

  const formattedEndDate = subscription?.end_date 
    ? new Date(subscription.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A';

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Helmet>
        <title>Premium Dashboard | Temple Portal</title>
      </Helmet>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        {/* Welcome Banner */}
        <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
                Welcome back, {currentUser?.name || currentUser?.email?.split('@')[0]}
              </h1>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none shadow-none flex items-center gap-1 px-3 py-1 text-sm">
                <ShieldCheck className="w-4 h-4" /> Premium
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              Thank you for your continued support of our temple community.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 min-w-[240px] border border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-4 h-4" /> Next Renewal
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formattedEndDate}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Premium Features */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>View detailed temple accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-blue-50 group-hover:text-blue-700">
                <Link to="/financial-transparency">
                  View Reports <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <CardTitle>Direct Messaging</CardTitle>
              <CardDescription>Contact administration</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-purple-50 group-hover:text-purple-700">
                <Link to="/user-messages">
                  Open Inbox <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <CardTitle>Priority Booking</CardTitle>
              <CardDescription>Schedule poojas with priority</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-orange-50 group-hover:text-orange-700">
                <Link to="/poojas">
                  Book Now <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 mb-4">
                <Heart className="w-6 h-6" />
              </div>
              <CardTitle>Contributions</CardTitle>
              <CardDescription>Manage your donations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-rose-50 group-hover:text-rose-700">
                <Link to="/donate">
                  Donate <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
            <p>Your recent bookings and activities will appear here.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PremiumMembershipPage;