import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, Calendar, CreditCard, Clock } from 'lucide-react';

const AdminSubscriptionDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptionIncome, setSubscriptionIncome] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    activeCount: 0,
    pendingCount: 0
  });

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      console.log('[AdminSubscriptionDashboard] Fetching dashboard stats...');
      setLoading(true);
      
      // Fetch users and subscriptions to map emails
      const usersData = await pb.collection('users').getFullList({ $autoCancel: false });
      setUsers(usersData);
      
      const subsData = await pb.collection('subscriptions').getFullList({ $autoCancel: false });
      setSubscriptions(subsData);

      // Fetch subscription income from temple_accounts
      const accounts = await pb.collection('temple_accounts').getFullList({
        filter: `category = "Subscription"`,
        sort: '-date',
        $autoCancel: false
      });
      
      setSubscriptionIncome(accounts);
      
      // Fetch pending counts uniquely across all tables to ensure accurate stats
      const pRequests = await pb.collection('premium_upgrade_requests').getFullList({ filter: `status = 'pending'`, $autoCancel: false });
      const pSubs = await pb.collection('subscriptions').getFullList({ filter: `status = 'Pending'`, $autoCancel: false });
      const pUsers = await pb.collection('users').getFullList({ filter: `approval_status = 'pending_approval'`, $autoCancel: false });

      const uniquePending = new Set();
      pRequests.forEach(r => r.user_id && uniquePending.add(r.user_id));
      pSubs.forEach(s => s.user_id && uniquePending.add(s.user_id));
      pUsers.forEach(u => uniquePending.add(u.id));
      
      console.log(`[AdminSubscriptionDashboard] Found ${uniquePending.size} unique pending approvals for stats.`);

      // Calculate stats
      let total = 0;
      let monthly = 0;
      let yearly = 0;
      let active = 0;
      
      accounts.forEach(acc => {
        if (acc.status === 'Approved') {
          const amt = parseFloat(acc.amount) || 0;
          total += amt;
          
          if (acc.subscription_type === 'Monthly') {
            monthly += amt;
          } else if (acc.subscription_type === 'Yearly') {
            yearly += amt;
          }
          active++;
        }
      });
      
      setStats({
        totalIncome: total,
        monthlyIncome: monthly,
        yearlyIncome: yearly,
        activeCount: active,
        pendingCount: uniquePending.size
      });
      
    } catch (error) {
      console.error('[AdminSubscriptionDashboard] Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get user email from a temple_account entry
  const getUserEmail = (entry) => {
    if (!entry.subscription_id) return 'Unknown user';
    
    const sub = subscriptions.find(s => s.id === entry.subscription_id);
    if (!sub || !sub.user_id) return entry.subscription_id; // Fallback to ID if no sub found
    
    const userId = typeof sub.user_id === 'object' ? sub.user_id.id : sub.user_id;
    const user = users.find(u => u.id === userId);
    
    return user ? user.email : (userId || 'Unknown user');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Plans</CardTitle>
            <Calendar className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.monthlyIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Plans</CardTitle>
            <Calendar className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.yearlyIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Subscription Income Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Receipt ID</TableHead>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionIncome.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No subscription income records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptionIncome.map((entry) => {
                    const displayEmail = getUserEmail(entry);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateGerman(entry.date)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {entry.status === 'Pending' ? '-' : (entry.receipt_id || '-')}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {entry.member_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={displayEmail === 'Unknown user' || displayEmail === entry.subscription_id ? 'text-muted-foreground font-mono text-xs' : ''}>
                            {displayEmail}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={entry.subscription_type === 'Yearly' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                            {entry.subscription_type || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'Approved' ? 'default' : 'secondary'} className={entry.status === 'Approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
                            {entry.status || 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{parseFloat(entry.amount).toFixed(2)}
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
    </div>
  );
};

export default AdminSubscriptionDashboard;