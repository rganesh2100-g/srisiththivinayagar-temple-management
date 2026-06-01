import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import SideMenu from '@/components/SideMenu.jsx';
import Header from '@/components/Header.jsx';
import DonationActivityCard from '@/components/DonationActivityCard.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Heart, 
  FolderHeart as HandHeart, 
  WrapText as ReceiptText, 
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const MyActivity = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);

  const fetchAllActivity = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [bookingsRes, donationsRes, volunteerRes, transactionsRes] = await Promise.all([
        pb.collection('pooja_bookings').getList(1, 50, {
          filter: `user_id="${currentUser.id}"`,
          expand: 'pooja_id',
          sort: '-created_at',
          $autoCancel: false
        }),
        pb.collection('donations').getList(1, 50, {
          filter: `user_id="${currentUser.id}"`,
          sort: '-donation_date',
          $autoCancel: false
        }),
        pb.collection('volunteer_participation').getList(1, 50, {
          filter: `user_id="${currentUser.id}"`,
          sort: '-participation_date',
          $autoCancel: false
        }),
        pb.collection('transactions').getList(1, 50, {
          filter: `userId="${currentUser.id}"`,
          sort: '-createdAt',
          $autoCancel: false
        })
      ]);

      const combinedActivities = [];

      // Process Bookings
      bookingsRes.items.forEach(item => {
        combinedActivities.push({
          id: `booking_${item.id}`,
          type: 'booking',
          title: item.expand?.pooja_id?.name || 'Pooja Booking',
          date: item.created_at || item.created,
          status: item.status || item.booking_status,
          details: `Scheduled for: ${new Date(item.pooja_date).toLocaleDateString()}`,
          icon: Calendar,
          colorClass: 'text-blue-600 bg-blue-50 border-blue-100',
          rawRecord: item
        });
      });

      // Process Donations
      donationsRes.items.forEach(item => {
        combinedActivities.push({
          id: `donation_${item.id}`,
          type: 'donation',
          title: item.category ? `${item.category} Donation` : 'Temple Donation',
          date: item.donation_date || item.created,
          status: item.status,
          details: `Amount: €${item.amount}`,
          icon: Heart,
          colorClass: 'text-red-600 bg-red-50 border-red-100',
          rawRecord: item
        });
      });

      // Process Volunteer Participation
      volunteerRes.items.forEach(item => {
        combinedActivities.push({
          id: `volunteer_${item.id}`,
          type: 'volunteer',
          title: item.event_name || 'Volunteer Work',
          date: item.participation_date || item.created,
          status: item.status,
          details: item.hours ? `${item.hours} hours contributed` : 'Participation recorded',
          icon: HandHeart,
          colorClass: 'text-green-600 bg-green-50 border-green-100',
          rawRecord: item
        });
      });

      // Process Transactions
      transactionsRes.items.forEach(item => {
        combinedActivities.push({
          id: `transaction_${item.id}`,
          type: 'transaction',
          title: item.bookingType ? item.bookingType.replace('_', ' ') : 'Payment Transaction',
          date: item.createdAt || item.created,
          status: item.status,
          details: `Amount: €${item.amount} | TXN: ${item.transactionId}`,
          icon: ReceiptText,
          colorClass: 'text-purple-600 bg-purple-50 border-purple-100',
          rawRecord: item
        });
      });

      // Sort all activities chronologically (newest first)
      combinedActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setActivities(combinedActivities);
    } catch (err) {
      console.error('Error fetching activity:', err);
      setError('Failed to load your activity history. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAllActivity();
  }, [fetchAllActivity]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const StatusBadge = ({ status }) => {
    if (!status) return null;
    
    const normalizedStatus = status.toLowerCase();
    let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
    
    if (['approved', 'completed', 'confirmed', 'verified'].includes(normalizedStatus)) {
      colorClass = 'bg-green-100 text-green-800 border-green-200';
    } else if (['pending', 'pending approval', 'awaiting user response'].includes(normalizedStatus)) {
      colorClass = 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (['cancelled', 'failed', 'rejected'].includes(normalizedStatus)) {
      colorClass = 'bg-red-100 text-red-800 border-red-200';
    }

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] flex flex-col">
      <Helmet>
        <title>My Activity | Sri Siththi Vinayagar Tempel Kultur Verein e.V</title>
      </Helmet>
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <SideMenu />
        
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#8B0000] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Activity
            </h1>
            <p className="text-gray-600">A complete timeline of your bookings, donations, and contributions.</p>
          </div>

          {loading ? (
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-100 shrink-0 md:order-1 md:-translate-x-1/2 shadow-sm z-10">
                    <Skeleton className="w-4 h-4 rounded-full" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)]">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <p className="text-red-700 font-medium mb-6">{error}</p>
                <Button onClick={fetchAllActivity} variant="outline" className="bg-white hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry Loading
                </Button>
              </CardContent>
            </Card>
          ) : activities.length === 0 ? (
            <Card className="border-dashed border-2 shadow-sm bg-white/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Activity Yet</h3>
                <p className="text-gray-500 max-w-md">
                  Your timeline is empty. Once you book a pooja, make a donation, or volunteer, your activities will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    
                    {/* Timeline Dot */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${activity.colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {/* Content Card */}
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)]">
                      {activity.type === 'donation' ? (
                        <DonationActivityCard donation={activity.rawRecord} />
                      ) : (
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-none bg-white">
                          <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                              <div>
                                <h4 className="text-base font-bold text-gray-900 capitalize">{activity.title}</h4>
                                <p className="text-sm text-gray-500 mt-0.5">{formatDate(activity.date)}</p>
                              </div>
                              <StatusBadge status={activity.status} />
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm font-medium text-gray-700">{activity.details}</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyActivity;