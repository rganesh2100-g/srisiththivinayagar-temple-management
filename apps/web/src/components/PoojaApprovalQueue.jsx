import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const PoojaApprovalQueue = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchPendingBookings = async () => {
    try {
      const records = await pb.collection('pooja_bookings').getList(1, 50, {
        filter: 'status="pending"',
        expand: 'user_id,pooja_id',
        sort: '+booking_date',
        $autoCancel: false
      });
      setBookings(records.items);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
      toast.error('Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
  }, []);

  const handleAction = async (id, userId, poojaName, action) => {
    setProcessingId(id);
    try {
      const newStatus = action === 'approve' ? 'approved' : 'cancelled';
      
      // Update booking status
      await pb.collection('pooja_bookings').update(id, {
        status: newStatus
      }, { $autoCancel: false });

      // Send notification message
      const message = action === 'approve' 
        ? `Your booking for ${poojaName} has been approved.`
        : `Your booking for ${poojaName} has been cancelled. Please contact administration for details.`;

      await pb.collection('admin_messages').create({
        user_id: userId,
        message: message,
        sent_date: new Date().toISOString(),
        read_status: false
      }, { $autoCancel: false });

      toast.success(`Booking ${newStatus} successfully`);
      setBookings(bookings.filter(b => b.id !== id));
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      toast.error(`Failed to ${action} booking`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="p-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#CC2222]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold text-[#8B0000] flex items-center gap-2">
          <Clock className="w-5 h-5" /> Pending Pooja Approvals
        </CardTitle>
        <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
          {bookings.length} Pending
        </div>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No pending bookings to approve.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">User</th>
                  <th className="px-4 py-3">Pooja</th>
                  <th className="px-4 py-3">Requested Date</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {booking.expand?.user_id?.name || booking.expand?.user_id?.email || 'Unknown User'}
                    </td>
                    <td className="px-4 py-3">
                      {booking.expand?.pooja_id?.name || 'Unknown Pooja'}
                    </td>
                    <td className="px-4 py-3">{formatDate(booking.booking_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          disabled={processingId === booking.id}
                          onClick={() => handleAction(booking.id, booking.user_id, booking.expand?.pooja_id?.name, 'approve')}
                        >
                          {processingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          disabled={processingId === booking.id}
                          onClick={() => handleAction(booking.id, booking.user_id, booking.expand?.pooja_id?.name, 'reject')}
                        >
                          {processingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PoojaApprovalQueue;