import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import BookingDetailsCard from '@/components/BookingDetailsCard.jsx';
import MessageThread from '@/components/MessageThread.jsx';
import MessageInput from '@/components/MessageInput.jsx';
import { MessageSquare, AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const UserMessagesPage = () => {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [poojasMap, setPoojasMap] = useState({});
  const [messagesMap, setMessagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch user's active bookings (not completed/cancelled)
      const bookingsData = await pb.collection('pooja_bookings').getList(1, 50, {
        filter: `user_id="${currentUser.id}" && status != "Completed" && status != "Cancelled"`,
        sort: '-created',
        $autoCancel: false
      });
      
      // Fetch all poojas to map names
      const poojasData = await pb.collection('poojas').getFullList({
        $autoCancel: false
      });
      
      const pMap = {};
      poojasData.forEach(p => {
        pMap[p.id] = p;
      });
      
      // Fetch messages for these bookings
      const bookingIds = bookingsData.items.map(b => b.id);
      const mMap = {};
      
      if (bookingIds.length > 0) {
        const filterStr = bookingIds.map(id => `booking_id="${id}"`).join(' || ');
        const messagesData = await pb.collection('booking_messages').getFullList({
          filter: filterStr,
          sort: 'created',
          $autoCancel: false
        });
        
        messagesData.forEach(msg => {
          if (!mMap[msg.booking_id]) mMap[msg.booking_id] = [];
          mMap[msg.booking_id].push(msg);
        });
      }
      
      // Filter bookings to only show those that have messages OR are awaiting response
      const relevantBookings = bookingsData.items.filter(b => 
        (mMap[b.id] && mMap[b.id].length > 0) || b.status === 'Awaiting User Response'
      );
      
      setPoojasMap(pMap);
      setMessagesMap(mMap);
      setBookings(relevantBookings);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load your messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleSendMessage = async (bookingId, content) => {
    try {
      // Create message record
      const newMsg = await pb.collection('booking_messages').create({
        booking_id: bookingId,
        sender_type: 'user',
        sender_id: currentUser.id,
        message_content: content,
        read_status: false
      }, { $autoCancel: false });

      // Update local state
      setMessagesMap(prev => ({
        ...prev,
        [bookingId]: [...(prev[bookingId] || []), newMsg]
      }));

      toast.success('Message sent to Temple Admin');
    } catch (err) {
      console.error('Send message error:', err);
      toast.error('Failed to send message. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>My Messages | Sri Sithivinayagar Temple</title>
      </Helmet>

      <div className="max-w-5xl mx-auto w-full">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#8B0000] mb-2 font-serif">My Messages</h1>
            <p className="text-gray-600">Communicate with temple administrators regarding your bookings.</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" className="gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2].map(i => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 mb-2">Error Loading Messages</h3>
            <p className="text-red-600/80 mb-6">{error}</p>
            <Button onClick={fetchData} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
              Try Again
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Messages</h3>
            <p className="text-gray-500">You don't have any active conversations with the temple administrators.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {bookings.map((booking) => {
              const poojaName = poojasMap[booking.pooja_id]?.name;
              const bookingMessages = messagesMap[booking.id] || [];
              
              return (
                <div key={booking.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                  
                  {/* Left Column: Booking Details */}
                  <div className="flex flex-col gap-4">
                    <BookingDetailsCard booking={booking} poojaName={poojaName} />
                    {booking.status === 'Awaiting User Response' && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                          The temple admin has requested more information. Please reply using the message box to proceed with your booking.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Column: Messaging */}
                  <div className="flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden h-full min-h-[400px]">
                    <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#8B0000]" />
                      <h3 className="font-semibold text-sm text-gray-900">Conversation</h3>
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col gap-4">
                      <div className="flex-1">
                        <MessageThread messages={bookingMessages} currentUserRole="user" />
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200">
                        <MessageInput 
                          onSend={(content) => handleSendMessage(booking.id, content)} 
                          placeholder="Type your reply to the admin..."
                        />
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default UserMessagesPage;