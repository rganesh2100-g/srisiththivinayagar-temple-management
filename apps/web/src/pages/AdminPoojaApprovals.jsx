import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Eye, Calendar, Clock, User, CreditCard, Hash } from 'lucide-react';

const AdminPoojaApprovals = () => {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('pooja_bookings').getFullList({
        sort: '-created',
        expand: 'pooja,user',
        $autoCancel: false
      });
      setBookings(records);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load pooja bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async (bookingId, newStatus) => {
    setActionLoading(true);
    try {
      // Fetch the full record first to ensure all required fields are included in the update payload
      const record = await pb.collection('pooja_bookings').getOne(bookingId, { $autoCancel: false });
      
      const updateData = {
        user: record.user,
        pooja: record.pooja,
        booking_date: record.booking_date,
        pooja_date: record.pooja_date,
        time_slot: record.time_slot,
        name: record.name,
        email: record.email,
        user_contact: record.user_contact,
        donation_amount: record.donation_amount,
        booking_time: record.booking_time,
        transaction_id: record.transaction_id,
        status: newStatus,
        payment_status: newStatus === 'approved' ? 'completed' : 'failed'
      };

      await pb.collection('pooja_bookings').update(bookingId, updateData, { $autoCancel: false });
      
      toast.success(`Booking ${newStatus} successfully.`);
      setDetailsModalOpen(false);
      fetchBookings();
    } catch (error) {
      console.error(`Error updating booking to ${newStatus}:`, error);
      toast.error(error?.response?.message || `Failed to update booking status. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (booking) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Approved</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Pending</Badge>;
    }
  };

  return (
    <AdminLayout>
      <Helmet><title>Pooja Approvals | Admin Portal</title></Helmet>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Pooja Booking Approvals</h1>
          <p className="text-muted-foreground text-lg mt-1">Review and manage devotee pooja booking requests.</p>
        </div>

        <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/20 border-b border-border/50">
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-16 rounded-lg" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="text-muted-foreground">No pooja bookings found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Devotee</TableHead>
                      <TableHead>Pooja Details</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map(booking => (
                      <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium text-foreground">{booking.name}</div>
                          <div className="text-xs text-muted-foreground">{booking.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.expand?.pooja?.name || 'Unknown Pooja'}</div>
                          <div className="text-xs text-muted-foreground">€{booking.donation_amount}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{new Date(booking.pooja_date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{booking.time_slot}</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded-md border border-border">
                            {booking.transaction_id || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(booking.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetails(booking)}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-primary">Booking Details</DialogTitle>
              <DialogDescription>Review the complete information for this booking request.</DialogDescription>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 border-b pb-2"><User className="w-4 h-4 text-primary" /> Devotee Info</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedBooking.name}</span></p>
                      <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedBooking.email}</span></p>
                      <p><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedBooking.user_contact}</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 border-b pb-2"><Calendar className="w-4 h-4 text-primary" /> Pooja Info</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Pooja:</span> <span className="font-medium">{selectedBooking.expand?.pooja?.name}</span></p>
                      <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(selectedBooking.pooja_date).toLocaleDateString()}</span></p>
                      <p><span className="text-muted-foreground">Time:</span> <span className="font-medium">{selectedBooking.time_slot}</span></p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Payment Verification</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Donation Amount</p>
                      <p className="text-xl font-bold text-foreground">€{selectedBooking.donation_amount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Transaction ID</p>
                      <p className="font-mono font-medium bg-background px-2 py-1 rounded border inline-block">
                        {selectedBooking.transaction_id || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex sm:justify-between gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setDetailsModalOpen(false)} disabled={actionLoading}>
                Close
              </Button>
              {selectedBooking?.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleAction(selectedBooking.id, 'rejected')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleAction(selectedBooking.id, 'approved')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPoojaApprovals;