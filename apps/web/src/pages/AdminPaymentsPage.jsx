import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { Search, Filter, DollarSign, CheckCircle, Clock, XCircle, MoreHorizontal, Download } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { verifyQueryExpand } from '@/lib/relationshipVerification.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import PaymentDetailsModal from '@/components/PaymentDetailsModal.jsx';

const formatEuro = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
};

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const refreshPayments = async () => {
    setIsLoading(true);
    try {
      const queryOptions = {
        sort: '-created',
        expand: 'user,approved_by',
        $autoCancel: false,
      };
      verifyQueryExpand('payments', queryOptions);

      const records = await pb.collection('payments').getFullList(queryOptions);
      setPayments(records);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPayments();
  }, []);

  const handleStatusChange = async (payment, newStatus) => {
    try {
      if (newStatus === 'approved') {
        const response = await apiServerClient.fetch(`/admin-payments/${payment.id}/approve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_notes: 'Approved from dashboard' })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to approve payment');
        }

        toast.success('Payment successfully approved and user upgraded.');
      } else {
        try {
          await pb.collection('payments').update(payment.id, {
            status: newStatus,
          }, { $autoCancel: false });
          toast.success(`Payment successfully marked as ${newStatus}.`);
        } catch (err) {
          toast.error(`Failed to update payment status to ${newStatus}`);
          return false;
        }
      }

      await refreshPayments();
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(error.message || 'An unexpected error occurred.');
      return false;
    }
  };

  const handleDownloadReceipt = async (payment) => {
    if (!payment.receipt_pdf) {
      toast.error('No receipt PDF is available for this payment.');
      return;
    }

    setIsDownloading(true);
    const loadingToast = toast.loading('Preparing receipt for download...');

    try {
      const url = pb.files.getUrl(payment, payment.receipt_pdf);
      
      if (!url) {
        throw new Error('Failed to generate URL');
      }

      window.open(url, '_blank');
      toast.success('Receipt downloaded successfully.', { id: loadingToast });
    } catch (error) {
      console.error('Error getting receipt URL:', error);
      toast.error('Failed to retrieve receipt. It may have been deleted or moved.', { id: loadingToast });
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      
      const userName = (payment.expand?.user?.name || payment.expand?.user?.fullName || '').toLowerCase();
      const userEmail = (payment.expand?.user?.email || payment.email || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = userName.includes(query) || userEmail.includes(query);
      
      return matchesStatus && matchesSearch;
    });
  }, [payments, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const pending = payments.filter(p => p.status === 'pending').length;
    const approved = payments.filter(p => p.status === 'approved').length;
    const revenue = payments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    return { pending, approved, revenue };
  }, [payments]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground hover:bg-success/90">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Rejected</Badge>;
      default:
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">Pending</Badge>;
    }
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <Helmet>
          <title>Santha Management | Admin Dashboard</title>
        </Helmet>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Santha Management</h1>
            <p className="text-muted-foreground mt-1">Review and manage premium subscription payments.</p>
          </div>
          <Button onClick={refreshPayments} variant="outline" disabled={isLoading || isDownloading}>
            Refresh Data
          </Button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <Clock className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-16" /> : stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Requires your attention</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Payments</CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-16" /> : stats.approved}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? <Skeleton className="h-9 w-24" /> : formatEuro(stats.revenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">From approved payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table Section */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-xl">Payment Records</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or email..."
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-background">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Search className="w-8 h-8 mb-2 opacity-20" />
                          <p>No payments found matching your criteria.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const userName = payment.expand?.user?.name || payment.expand?.user?.fullName || 'Unknown User';
                      const userEmail = payment.expand?.user?.email || payment.email || 'No email';
                      
                      return (
                        <TableRow 
                          key={payment.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => openPaymentDetails(payment)}
                        >
                          <TableCell>
                            <div className="font-medium">{userName}</div>
                            <div className="text-xs text-muted-foreground">{userEmail}</div>
                          </TableCell>
                          <TableCell className="capitalize">{payment.plan_type || 'Premium'}</TableCell>
                          <TableCell className="font-medium">{formatEuro(payment.total_amount)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(payment.created), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2">
                              {payment.receipt_pdf && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadReceipt(payment);
                                  }}
                                  disabled={isDownloading}
                                  title="Download Receipt"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openPaymentDetails(payment)}>
                                    View Details
                                  </DropdownMenuItem>
                                  {payment.receipt_pdf && (
                                    <DropdownMenuItem onClick={() => handleDownloadReceipt(payment)}>
                                      <Download className="w-4 h-4 mr-2" /> Download Receipt
                                    </DropdownMenuItem>
                                  )}
                                  {payment.status === 'pending' && (
                                    <>
                                      <DropdownMenuItem 
                                        className="text-success focus:text-success focus:bg-success/10"
                                        onClick={() => handleStatusChange(payment, 'approved')}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        onClick={() => handleStatusChange(payment, 'rejected')}
                                      >
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <PaymentDetailsModal 
          payment={selectedPayment}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStatusChange={handleStatusChange}
          onRefresh={refreshPayments}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentsPage;