import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import DashboardNav from '@/components/DashboardNav.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Calendar, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const PremiumDashboard = () => {
  const { currentUser } = useAuth();
  const [activeSub, setActiveSub] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      pb.collection('subscriptions').getList(1, 1, {
        filter: `user_id="${currentUser.id}" && status="Approved"`,
        sort: '-created',
        $autoCancel: false
      }).then(res => {
        if (res.items.length > 0) setActiveSub(res.items[0]);
      }).catch(console.error);
    }
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] flex flex-col">
      <Helmet>
        <title>Premium Dashboard | Sri Sithivinayagar Temple</title>
      </Helmet>
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <DashboardNav />
        
        <main className="flex-1 p-6 md:p-8">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
              <Crown className="w-3 h-3" /> Premium Member
            </div>
            <h1 className="text-3xl font-bold text-[#8B0000] mb-2">Premium Dashboard</h1>
            <p className="text-gray-600">Welcome to your exclusive temple portal.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left Column: Membership Status */}
            <div className="lg:col-span-1">
              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-900">Membership Status</h2>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-gray-600">Status</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none shadow-none">Active</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tier</span>
                      <span className="font-medium text-[#8B0000]">Premium</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Renewal</span>
                      <span className="font-medium">Manually Renew</span>
                    </div>
                    {activeSub && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Period</span>
                        <span className="font-medium text-sm text-gray-900">
                          {formatDate(activeSub.approved_date || activeSub.created)} → {formatDate(activeSub.renewal_date)}
                        </span>
                      </div>
                    )}
                    <Button asChild className="w-full bg-[#8B0000] hover:bg-[#6b0000] text-white mt-4 shadow-sm">
                      <Link to="/membership">Membership Renew</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-none shadow-md bg-gradient-to-br from-[#8B0000] to-[#CC2222] text-white">
                <CardContent className="p-6">
                  <Star className="w-8 h-8 mb-4 opacity-80" />
                  <h3 className="text-xl font-bold mb-1">Priority Booking</h3>
                  <p className="text-white/80 text-sm">Book poojas with priority scheduling.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-white">
                <CardContent className="p-6">
                  <Calendar className="w-8 h-8 mb-4 text-[#CC2222]" />
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Special Events</h3>
                  <p className="text-gray-500 text-sm">Access to premium member-only events.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-white sm:col-span-2">
                <CardContent className="p-6">
                  <Heart className="w-8 h-8 mb-4 text-[#CC2222]" />
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Financial Reports</h3>
                  <p className="text-gray-500 text-sm">View detailed temple financial transparency.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PremiumDashboard;