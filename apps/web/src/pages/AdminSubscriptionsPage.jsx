import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Check, X, ShieldCheck, Inbox, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminSubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await pb.collection('subscriptions').getList(1, 50, {
        filter: 'status="pending"',
        expand: 'user',
        sort: '-created',
        $autoCancel: false
      });
      setSubscriptions(result.items);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      toast.error('Failed to load pending subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleAction = async (id, actionStatus) => {
    setIsSubmitting(id);
    try {
      // The migration configured the field to accept 'active' instead of 'approved'
      const statusToSave = actionStatus === 'approved' ? 'active' : actionStatus;
      
      await pb.collection('subscriptions').update(id, { 
        status: statusToSave 
      }, { $autoCancel: false });
      
      toast.success(`Subscription successfully ${actionStatus}`);
      await fetchSubscriptions();
    } catch (err) {
      console.error(`Error updating subscription to ${actionStatus}:`, err);
      toast.error(`Failed to update subscription: ${err.message}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Manage Subscriptions | Admin Dashboard</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>
                Pending Subscriptions
              </h1>
              <p className="text-muted-foreground mt-1">
                Review and manage user subscription requests.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={fetchSubscriptions} 
            variant="outline" 
            disabled={isLoading}
            className="gap-2 bg-background shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>

        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-5">
            <CardTitle className="text-xl">Action Required</CardTitle>
            <CardDescription>Subscriptions waiting for administrative approval.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10">
                    <TableHead className="font-semibold">User Email</TableHead>
                    <TableHead className="font-semibold">Plan Type</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-44 ml-auto rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Inbox className="w-8 h-8 text-muted-foreground/60" />
                          </div>
                          <h3 className="text-lg font-medium text-foreground mb-1">No Pending Subscriptions</h3>
                          <p className="text-sm text-muted-foreground">All subscription requests have been processed.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {sub.expand?.user?.email || 'Unknown User'}
                          </div>
                          {sub.expand?.user?.name && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {sub.expand.user.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="capitalize font-medium text-foreground">
                            {sub.plan_type || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {formatCurrency(sub.amount || sub.total_amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-none shadow-none dark:text-amber-400 capitalize">
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAction(sub.id, 'approved')}
                              disabled={isSubmitting === sub.id}
                              className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition-all active:scale-[0.98]"
                            >
                              {isSubmitting === sub.id ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-1.5" />
                              )}
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAction(sub.id, 'rejected')}
                              disabled={isSubmitting === sub.id}
                              className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-all active:scale-[0.98]"
                            >
                              <X className="w-4 h-4 mr-1.5" /> 
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSubscriptionsPage;