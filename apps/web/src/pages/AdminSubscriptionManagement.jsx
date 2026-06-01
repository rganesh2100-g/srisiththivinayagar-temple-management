import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { apiServerClient } from '@/utils/apiServerClient.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw, Inbox, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const AdminSubscriptionManagement = () => {
  const { token, currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  
  // Pending Tab State
  const [pendingPayments, setPendingPayments] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [pendingError, setPendingError] = useState(null);
  
  // Modal States
  const [selectedPaymentForApproval, setSelectedPaymentForApproval] = useState(null);
  const [selectedPaymentForRejection, setSelectedPaymentForRejection] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    if (isAdmin && token) {
      fetchPendingPayments();
    } else if (!isAdmin && !isLoadingPending) {
      setPendingError("You must be logged in as an admin to access this page.");
      setIsLoadingPending(false);
    }
  }, [isAdmin, token]);

  const fetchPendingPayments = async (showLoading = true) => {
    if (showLoading) {
      setIsLoadingPending(true);
    }
    setPendingError(null);
    try {
      // Pass token both as query param (per instructions) and Authorization header (standard practice)
      // Note: The backend should handle expand='user,subscription' if it queries PocketBase directly.
      const url = `/admin/pending-payments?token=${encodeURIComponent(token)}&expand=user,subscription`;
      const response = await apiServerClient.fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired or unauthorized. Please log in again.');
        }
        throw new Error('Failed to fetch pending payments from server.');
      }
      
      const data = await response.json();
      setPendingPayments(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      setPendingError(err.message || 'Failed to load pending payments');
      toast.error('Failed to load pending payments');
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!selectedPaymentForApproval) return;
    
    setIsApproving(true);
    try {
      const url = `/admin/approve-payment?token=${encodeURIComponent(token)}`;
      const response = await apiServerClient.fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_id: selectedPaymentForApproval.id,
          admin_notes: approvalNotes
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired or unauthorized. Please log in again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to approve payment');
      }

      toast.success('Payment approved successfully');
      setSelectedPaymentForApproval(null);
      setApprovalNotes('');
      fetchPendingPayments(false);
    } catch (err) {
      console.error('Error approving payment:', err);
      toast.error(`Failed to approve payment: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedPaymentForRejection) return;
    
    setIsRejecting(true);
    try {
      const url = `/admin/reject-payment?token=${encodeURIComponent(token)}`;
      const response = await apiServerClient.fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_id: selectedPaymentForRejection.id,
          rejection_reason: rejectionReason
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired or unauthorized. Please log in again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to reject payment');
      }

      toast.success('Payment rejected successfully');
      setSelectedPaymentForRejection(null);
      setRejectionReason('');
      fetchPendingPayments(false);
    } catch (err) {
      console.error('Error rejecting payment:', err);
      toast.error(`Failed to reject payment: ${err.message}`);
    } finally {
      setIsRejecting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '€0.00';
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const renderPendingTable = () => {
    if (isLoadingPending) {
      return (
        <div className="space-y-4 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-8 w-24 ml-auto" />
            </div>
          ))}
        </div>
      );
    }

    if (pendingError) {
      return (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground text-sm mb-6">{pendingError}</p>
          <Button onClick={() => fetchPendingPayments(true)} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        </div>
      );
    }

    if (pendingPayments.length === 0) {
      return (
        <div className="text-center py-16 px-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Records Found</h3>
          <p className="text-muted-foreground text-sm">
            There are currently no pending payments awaiting your approval.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Plan Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Submitted Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingPayments.map((payment) => {
              const userEmail = payment.expand?.user?.email || payment.user_email || payment.email;
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium text-foreground">
                    {userEmail}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {payment.plan_type || payment.subscription_type || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{payment.transaction_id || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDisplayDate(payment.created || payment.submitted_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        onClick={() => setSelectedPaymentForApproval(payment)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setSelectedPaymentForRejection(payment)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Subscription Management & Approvals | Admin</title>
      </Helmet>

      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Subscription Management & Approvals
          </h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Review and manage premium subscription payments.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="pending" className="gap-2">
              Pending Approvals
              {!isLoadingPending && pendingPayments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 border-none">
                  {pendingPayments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved Payments</TabsTrigger>
            <TabsTrigger value="rejected">Rejected Payments</TabsTrigger>
            <TabsTrigger value="all">All Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-0">
            <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>
                  Review submitted subscription payments waiting for admin verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {renderPendingTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="border-border/50 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Approved Payments</CardTitle>
                <CardDescription>History of approved subscriptions will appear here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  Approved payments implementation pending.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card className="border-border/50 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Rejected Payments</CardTitle>
                <CardDescription>History of rejected subscriptions will appear here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  Rejected payments implementation pending.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card className="border-border/50 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">All Subscriptions</CardTitle>
                <CardDescription>Complete view of all subscription records.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  All subscriptions implementation pending.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Modal */}
      <Dialog open={!!selectedPaymentForApproval} onOpenChange={(open) => !open && setSelectedPaymentForApproval(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Review the payment details before confirming approval.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">User Email</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedPaymentForApproval?.expand?.user?.email || selectedPaymentForApproval?.user_email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(selectedPaymentForApproval?.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <span className="text-sm font-mono text-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                  {selectedPaymentForApproval?.transaction_id || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                placeholder="Add optional notes..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPaymentForApproval(null)} disabled={isApproving}>
              Cancel
            </Button>
            <Button onClick={handleApproveConfirm} disabled={isApproving}>
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Confirm Approval'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!selectedPaymentForRejection} onOpenChange={(open) => !open && setSelectedPaymentForRejection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">User Email</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedPaymentForRejection?.expand?.user?.email || selectedPaymentForRejection?.user_email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(selectedPaymentForRejection?.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <span className="text-sm font-mono text-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                  {selectedPaymentForRejection?.transaction_id || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="flex items-center gap-1">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Provide rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="resize-none"
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPaymentForRejection(null)} disabled={isRejecting}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectConfirm} 
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSubscriptionManagement;