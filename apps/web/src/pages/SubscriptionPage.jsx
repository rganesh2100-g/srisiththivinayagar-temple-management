import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SideMenu from '@/components/SideMenu.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Calendar, Hash, CheckCircle2, Clock, XCircle } from 'lucide-react';

const SubscriptionPage = () => {
  const { currentUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const records = await pb.collection('subscriptions').getFullList({
          filter: `user_id="${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        setSubscriptions(records);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError('Failed to load subscription history.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100', icon: CheckCircle2 },
      pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100', icon: Clock },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] flex flex-col">
      <Helmet>
        <title>My Subscriptions | Sri Sithivinayagar Temple</title>
      </Helmet>
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <SideMenu />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Subscriptions
            </h1>
            <p className="mt-2 text-gray-600 text-lg">
              View your subscription history and payment details
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-none shadow-md rounded-2xl bg-white">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-none shadow-md rounded-2xl bg-white">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-600 font-medium">{error}</p>
              </CardContent>
            </Card>
          ) : subscriptions.length === 0 ? (
            <Card className="border-none shadow-md rounded-2xl bg-white">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscriptions Yet</h3>
                <p className="text-gray-500 text-sm">
                  You haven't created any premium subscriptions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id} className="border-none shadow-md rounded-2xl bg-white overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#8B0000] to-[#FFD700]"></div>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-bold capitalize">
                        {subscription.membership_type || 'Premium'} Membership
                      </CardTitle>
                      {getStatusBadge(subscription.payment_status || subscription.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#8B0000]/10 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-[#8B0000]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Subscription Type</p>
                          <p className="text-base font-semibold text-gray-900">
                            {subscription.subscription_type || 'Premium'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Amount Paid</p>
                          <p className="text-base font-semibold text-gray-900">
                            €{subscription.amount?.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <Hash className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Transaction ID</p>
                          <p className="text-sm font-mono text-gray-900 break-all">
                            {subscription.transaction_id || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Payment Date</p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatDate(subscription.created)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {subscription.next_renewal_date && (
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Next Renewal:</span>
                          <span className="font-semibold text-gray-900">
                            {formatDate(subscription.next_renewal_date)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default SubscriptionPage;