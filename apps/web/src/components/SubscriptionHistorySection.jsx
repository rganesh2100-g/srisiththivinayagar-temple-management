import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { History, AlertCircle, RefreshCw } from 'lucide-react';
import { verifyQueryExpand } from '@/lib/relationshipVerification.js';

const SubscriptionHistorySection = () => {
  const { currentUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const queryOptions = {
        filter: `(user = "${currentUser.id}")`,
        sort: '-created',
        expand: 'user',
        $autoCancel: false
      };
      verifyQueryExpand('subscriptions', queryOptions);

      const records = await pb.collection('subscriptions').getList(1, 50, queryOptions);
      setSubscriptions(records.items);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load subscription history.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const getStatusBadge = (approvalStatus) => {
    switch (approvalStatus?.toLowerCase()) {
      case 'approved':
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Active</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Rejected</Badge>;
      case 'pending_approval':
      case 'pending':
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Pending</Badge>;
    }
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-[#FFD700] to-[#FDB931]"></div>
      <CardHeader className="pb-4 border-b border-gray-100 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
              <History className="w-5 h-5 text-[#8B0000]" /> Subscription History
            </CardTitle>
            <CardDescription>A record of your premium membership plans and renewals.</CardDescription>
          </div>
          <Button onClick={fetchSubscriptions} variant="outline" size="sm" className="gap-2 bg-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 bg-white">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button onClick={fetchSubscriptions} variant="outline">Try Again</Button>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Subscriptions</h3>
            <p className="text-gray-500 max-w-sm">
              You don't have any subscription history yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Plan</TableHead>
                  <TableHead className="font-semibold text-gray-900">Type</TableHead>
                  <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="font-semibold text-gray-900">Next Billing</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => {
                  const isDueSoon = sub.end_date && new Date(sub.end_date) <= new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <TableRow key={sub.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">
                        {sub.plan_type || 'Premium Membership'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {sub.billing_cycle}
                      </TableCell>
                      <TableCell className="font-semibold text-[#8B0000]">
                        €{sub.total_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {sub.created ? format(new Date(sub.created), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {sub.end_date ? (
                          <span className={isDueSoon ? 'text-orange-600 font-medium' : ''}>
                            {format(new Date(sub.end_date), 'MMM d, yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(sub.status)}
                          {isDueSoon && sub.status === 'active' && (
                            <span className="text-[10px] font-medium text-orange-600 uppercase tracking-wider">
                              Due Soon
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionHistorySection;