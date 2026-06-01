import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

import SideMenu from '@/components/SideMenu.jsx';
import PoojaCard from '@/components/PoojaCard.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { 
  User, CalendarDays, HeartHandshake, 
  FileText, CreditCard, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [featuredPoojas, setFeaturedPoojas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (currentUser?.id) {
          const data = await pb.collection('users').getOne(currentUser.id, { $autoCancel: false });
          setUserData(data);
        }

        const poojas = await pb.collection('poojas').getList(1, 3, {
          filter: 'status="published" && is_deleted=false',
          sort: '-created',
          $autoCancel: false
        });
        setFeaturedPoojas(poojas.items);

      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isPremium = userData?.subscription_status === 'premium' || userData?.membership_type === 'premium';

  const premiumFeatures = [
    {
      title: 'Financial Transparency',
      description: 'View detailed monthly income and expense reports.',
      icon: FileText,
      link: '/financial-transparency',
      color: 'bg-blue-50 text-blue-700'
    },
    {
      title: 'Subscription History',
      description: 'Manage your premium membership and billing.',
      icon: CreditCard,
      link: '/subscriptions',
      color: 'bg-purple-50 text-purple-700'
    }
  ];

  const regularFeatures = [
    {
      title: 'Browse Poojas',
      description: 'View and book upcoming poojas and ceremonies.',
      icon: CalendarDays,
      link: '/poojas',
      color: 'bg-orange-50 text-orange-700'
    },
    {
      title: 'Make a Donation',
      description: 'Support the temple through secure online donations.',
      icon: HeartHandshake,
      link: '/donate',
      color: 'bg-rose-50 text-rose-700'
    }
  ];

  const commonFeatures = [
    {
      title: 'My Profile',
      description: 'Update your personal information and preferences.',
      icon: User,
      link: '/my-profile',
      color: 'bg-emerald-50 text-emerald-700'
    }
  ];

  const displayFeatures = isPremium ? [...premiumFeatures, ...commonFeatures] : [...regularFeatures, ...commonFeatures];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Dashboard | Sri Siththi Vinayagar Temple</title>
      </Helmet>
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {currentUser && <SideMenu />}
        
        <main className={`flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 overflow-hidden min-w-0 ${!currentUser ? 'mx-auto w-full max-w-7xl' : ''}`}>
          
          {currentUser && (
            <section className="py-4">
              <p className="text-base font-medium text-foreground mb-2">
                Welcome, {userData?.name || currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}!
              </p>
              <p className="text-sm text-muted-foreground">
                May the blessings of Lord Ganesha be with you.
              </p>
            </section>
          )}

          <section className="bg-primary/5 rounded-3xl p-8 md:p-12 border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 relative z-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Sparkles className="w-4 h-4" /> Sacred Offerings
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Book a Pooja</h2>
                <p className="text-muted-foreground text-lg">
                  Participate in our sacred rituals and ceremonies. Browse our offerings and book your preferred time slot online.
                </p>
              </div>
              <Button asChild className="mt-6 md:mt-0 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/poojas">View All Poojas <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-2xl" />
                ))}
              </div>
            ) : featuredPoojas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {featuredPoojas.map((pooja, index) => (
                  <motion.div
                    key={pooja.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <PoojaCard pooja={pooja} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-background/50 rounded-xl border border-border">
                <p className="text-muted-foreground">No poojas available at the moment.</p>
              </div>
            )}
          </section>

          {currentUser && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="border-border shadow-sm overflow-hidden bg-card">
                    <div className="bg-muted/30 px-6 py-4 border-b border-border">
                      <h2 className="text-xl font-semibold text-foreground">Membership Status</h2>
                    </div>
                    <CardContent className="p-6">
                      {loading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-6 w-full" />
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-10 w-full mt-4" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-muted-foreground">Status</span>
                            {isPremium ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none shadow-none flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Premium Member
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-none shadow-none">
                                Free Member
                              </Badge>
                            )}
                          </div>
                          
                          {isPremium ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Tier</span>
                                <span className="font-medium text-primary capitalize">
                                  {userData?.membership_type || 'Premium'}
                                </span>
                              </div>
                              
                              {userData?.subscription_expiry_date && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Valid Until</span>
                                  <span className="font-medium text-sm text-foreground">
                                    {formatDate(userData.subscription_expiry_date)}
                                  </span>
                                </div>
                              )}
                              
                              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4 shadow-sm">
                                <Link to="/membership">Manage Membership</Link>
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Tier</span>
                                <span className="font-medium capitalize">{userData?.membership_type || 'Free'}</span>
                              </div>
                              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mt-4">
                                <h3 className="font-semibold text-accent-foreground mb-2">Upgrade to Premium</h3>
                                <p className="text-sm text-accent-foreground/80 mb-4">Get access to detailed financial transparency reports and priority pooja bookings.</p>
                                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                                  <Link to="/membership">Upgrade Now</Link>
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-foreground mb-6">Quick Access</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {displayFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 + (index * 0.1) }}
                      >
                        <Link to={feature.link} className="block h-full">
                          <Card className="h-full border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group bg-card">
                            <CardContent className="p-6 flex flex-col h-full">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                {feature.title}
                              </h3>
                              <p className="text-muted-foreground text-sm mb-6 flex-1">
                                {feature.description}
                              </p>
                              <div className="flex items-center text-sm font-medium text-primary mt-auto">
                                Access Feature <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Home;