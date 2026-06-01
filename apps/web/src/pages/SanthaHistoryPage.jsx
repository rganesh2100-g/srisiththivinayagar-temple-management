import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { format, isValid, parseISO } from 'date-fns';
import { Search, Filter, History, Calendar, CreditCard, AlertCircle, Clock, CheckCircle, RotateCcw, WrapText as ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

import DashboardLayout from '@/components/DashboardLayout.jsx';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';

const formatEuro = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
};

const formatDateSafe = (dateString) => {
  if (!dateString) return 'N/A';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A';
};

const SanthaHistoryPage = () => {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const isUserAdmin = currentUser?.role === 'admin' || currentUser?.account_type === 'Admin';
  const Layout = isUserAdmin ? AdminLayout : DashboardLayout;

  const fetchHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // If admin, fetch all records. If user, fetch only their records.
      const filterString = isUserAdmin ? '' : `user = "${currentUser.id}"`;

      const payments = await pb.collection('payments').getFullList({
        filter: filterString,
        sort: '-created',
        $autoCancel: false,
        expand: 'user'
      });

      setRecords(payments);
    } catch (err) {
      console.error('[SanthaHistory] Error fetching payment records:', err);
      
      if (err.status === 403) {
        setError('Access Denied: The server security rules currently prevent you from viewing this collection.');
      } else {
        setError(err.message || 'We encountered an error while retrieving the payment history.');
      }
      toast.error('Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isUserAdmin]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const query = searchQuery.toLowerCase();
      
      const amountStr = record.total_amount?.toString() || record.amount?.toString() || '';
      const planTypeStr = record.plan_type?.toLowerCase() || '';
      const transactionIdStr = record.transaction_id?.toLowerCase() || '';
      const userEmailStr = record.expand?.user?.email?.toLowerCase() || '';
      const dateStr = record.created ? format(new Date(record.created), 'MMM d, yyyy').toLowerCase() : '';
      
      const matchesSearch = 
        amountStr.includes(query) ||
        planTypeStr.includes(query) ||
        transactionIdStr.includes(query) ||
        userEmailStr.includes(query) ||
        dateStr.includes(query);
      
      return matchesStatus && matchesSearch;
    });
  }, [records, searchQuery, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'active':
        return <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20">Approved</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">Rejected</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning-foreground hover:bg-warning/20 border-warning/20">Pending</Badge>;
    }
  };

  const isPremiumActive = currentUser?.subscription_status === 'premium' || currentUser?.premium_status === 'Active';
  const expiryDate = currentUser?.subscription_expiry_date;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
        <Helmet>
          <title>Santha History & Management | Dashboard</title>
        </Helmet>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isUserAdmin ? 'Santha Management' : 'Santha History'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isUserAdmin ? 'Review and manage all membership payments and subscriptions.' : 'Review your membership payments and subscriptions.'}
            </p>
          </div>
        </div>

        {!isUserAdmin && (
          <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${isPremiumActive ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {isPremiumActive ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Current Membership</h3>
                    <p className="text-sm text-muted-foreground">
                      {isPremiumActive ? 'Premium Member' : 'Free Member'}
                    </p>
                  </div>
                </div>
                
                {isPremiumActive && expiryDate && (
                  <div className="flex items-center gap-3 bg-background/80 px-4 py-3 rounded-lg border border-border/50 shadow-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Valid Until</p>
                      <p className="font-medium">{formatDateSafe(expiryDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {error && !isLoading && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center shadow-sm">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-destructive mb-1">Unable to load records</h3>
            <p className="text-destructive/80 mb-4 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchHistory} variant="outline" className="border-destructive/30 hover:bg-destructive/10 text-destructive">
              <RotateCcw className="w-4 h-4 mr-2" /> Retry Connection
            </Button>
          </div>
        )}

        {!error && (
          <Card className="shadow-sm border-border/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Transaction Records
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search records..."
                      className="pl-9 bg-background"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] bg-background">
                      <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Records</SelectItem>
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
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[150px]">Date</TableHead>
                      {isUserAdmin && <TableHead>User</TableHead>}
                      <TableHead>Amount</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          {isUserAdmin && <TableCell><Skeleton className="h-5 w-32" /></TableCell>}
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto rounded-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isUserAdmin ? 6 : 5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                              <ReceiptText className="w-8 h-8 opacity-40" />
                            </div>
                            <p className="text-lg font-medium text-foreground mb-1">No payment records found</p>
                            <p className="text-sm max-w-sm mx-auto">
                              {searchQuery || statusFilter !== 'all' 
                                ? "We couldn't find any transactions matching your current filters."
                                : "No subscription payments have been recorded yet."}
                            </p>
                            {(searchQuery || statusFilter !== 'all') && (
                              <Button 
                                variant="link" 
                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                className="mt-2 text-primary"
                              >
                                Clear filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            {formatDateSafe(record.created)}
                          </TableCell>
                          {isUserAdmin && (
                            <TableCell className="text-sm text-muted-foreground">
                              {record.expand?.user?.email || record.user || 'Unknown'}
                            </TableCell>
                          )}
                          <TableCell className="font-semibold text-foreground">
                            {formatEuro(record.total_amount || record.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 capitalize">
                              <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                              {record.plan_type || record.billing_cycle || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {record.transaction_id || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {getStatusBadge(record.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SanthaHistoryPage;