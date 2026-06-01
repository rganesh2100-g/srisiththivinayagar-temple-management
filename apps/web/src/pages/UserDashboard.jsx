import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import SideMenu from '@/components/SideMenu.jsx';
import Header from '@/components/Header.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { User, Activity, Bell, Settings, ArrowRight } from 'lucide-react';

const UserDashboard = () => {
  const { currentUser } = useAuth();

  const quickLinks = [
    { title: 'My Profile', desc: 'Manage your personal information', icon: User, path: '/profile', color: 'bg-blue-50 text-blue-600' },
    { title: 'My Activity', desc: 'View bookings and donations', icon: Activity, path: '/activity', color: 'bg-green-50 text-green-600' },
    { title: 'Notifications', desc: 'Check messages from admin', icon: Bell, path: '/notifications', color: 'bg-amber-50 text-amber-600' },
    { title: 'Settings', desc: 'Update preferences and security', icon: Settings, path: '/settings', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F0] flex flex-col">
      <Helmet>
        <title>My Dashboard | Sri Sithivinayagar Temple</title>
      </Helmet>
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <SideMenu />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#8B0000] mb-1">
              Welcome back, {currentUser?.name || currentUser?.email?.split('@')[0]}!
            </h1>
            <p className="text-sm text-gray-600">Manage your temple activities and preferences from your dashboard.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.path} to={link.path} className="block group">
                  <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 h-full">
                    <CardContent className="p-5 flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${link.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#CC2222] transition-colors flex items-center gap-1.5">
                          {link.title}
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">{link.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;