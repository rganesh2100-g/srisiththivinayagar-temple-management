import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { History, Calendar, CreditCard, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import pb from '@/lib/pocketbaseClient.js';

const SubscriptionHistorySidebar = ({ currentUser, onSubscriptionsLoaded }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchSubscriptions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const records = await pb.collection('subscriptions').getFullList({
          filter: `user = "${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        
        setSubscriptions(records);
        if (onSubscriptionsLoaded) {
          onSubscriptionsLoaded(records);
        }
      } catch (err) {
        console.error('[SubscriptionHistory] PocketBase query error:', err);
        console.error('[SubscriptionHistory] Error status:', err.status);
        console.error('[SubscriptionHistory] Error message:', err.message);
        
        setError({
          message: err.message || 'Failed to load subscription history',
          status: err.status || 'Unknown'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();

    // Set up real-time subscription listener
    pb.collection('subscriptions').subscribe('*', (e) => {
      if (e.record.user_id === currentUser.id || e.record.user === currentUser.id) {
        setSubscriptions((prev) => {
          let newSubs = [...prev];
          if (e.action === 'create') {
            newSubs = [e.record, ...prev];
          } else if (e.action === 'update') {
            newSubs = prev.map((s) => (s.id === e.record.id ? e.record : s));
          } else if (e.action === 'delete') {
            newSubs = prev.filter((s) => s.id !== e.record.id);
          }
          
          if (onSubscriptionsLoaded) {
            onSubscriptionsLoaded(newSubs);
          }
          return newSubs;
        });
      }
    });

    return () => {
      pb.collection('subscriptions').unsubscribe('*');
    };
  }, [currentUser?.id, onSubscriptionsLoaded]);

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active' || s === 'approved') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-none shadow-none dark:text-emerald-400 capitalize">
          {s}
        </Badge>
      );
    }
    if (s === 'pending') {
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-none shadow-none dark:text-amber-400 capitalize">
          {s}
        </Badge>
      );
    }
    if (s === 'rejected' || s === 'cancelled') {
      return (
        <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border-none shadow-none dark:text-rose-400 capitalize">
          {s}
        </Badge>
      );
    }
    return <Badge variant="outline" className="capitalize">{status}</Badge>;
  };

  return (
    <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-card flex flex-col h-full min-w-0">
      <CardHeader className="bg-muted/40 pb-4 border-b border-border/50 shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <History className="w-5 h-5 text-primary shrink-0" />
          Subscription History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                {idx < 2 && <div className="h-px bg-border/50 mt-4" />}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">Failed to load history</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px] break-words">
                {error.message} (Status: {error.status})
              </p>
            </div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">No subscription history yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Your subscription and upgrade requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-5 hover:bg-muted/20 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm flex items-center gap-1.5 capitalize">
                      {sub.plan_type || 'Subscription'}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      {formatCurrency(sub.total_amount || sub.amount)}
                    </p>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>
                
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Submitted: <span className="font-medium text-foreground">{formatDate(sub.created)}</span></span>
                  </div>
                  
                  {sub.status === 'active' && (
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <span>
                        Approved: <span className="font-medium text-foreground">{formatDate(sub.end_date || sub.updated)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionHistorySidebar;
