import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient';
import { getFullList } from '@/lib/pbHelper.js';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { Calendar, Clock, CreditCard, CheckCircle2, Clock3, XCircle, Ticket, Download, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MyBookingsPage = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchBookings = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const queryOptions = {
        filter: `email="${currentUser.email}"`,
        sort: '-created',
        expand: 'user,pooja'
      };

      const bookingsData = await getFullList('pooja_bookings', queryOptions);
      setBookings(bookingsData);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    if (currentUser) {
      pb.collection('pooja_bookings').subscribe('*', function (e) {
        if (e.record.email === currentUser.email) {
          if (e.action === 'update') {
            setBookings(prev => prev.map(b => b.id === e.record.id ? e.record : b));
          } else if (e.action === 'create') {
            setBookings(prev => [e.record, ...prev]);
          } else if (e.action === 'delete') {
            setBookings(prev => prev.filter(b => b.id !== e.record.id));
          }
        }
      });
    }

    return () => {
      if (currentUser) {
        pb.collection('pooja_bookings').unsubscribe('*');
      }
    };
  }, [currentUser]);

  const handleDownloadReceipt = async (bookingId, receiptNumber) => {
    try {
      setDownloadingId(bookingId);
      const response = await apiServerClient.fetch(`/receipts/poojas/${bookingId}/generate-receipt`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate receipt PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-Pooja-${receiptNumber || bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(t('common.success'));
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err.message || t('common.error'));
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Confirmed
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
            <XCircle className="w-3.5 h-3.5 shrink-0" /> Rejected/Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
            <Clock3 className="w-3.5 h-3.5 shrink-0" /> Pending Approval
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('userBookings.title')} | {t('nav.templeName')}</title>
      </Helmet>

      <div className="max-w-5xl mx-auto pb-12 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 min-w-0">
          <div className="min-w-0">
            <h1 className="text-fluid-h2 font-bold text-primary mb-2 truncate">{t('userBookings.title')}</h1>
            <p className="text-muted-foreground text-sm sm:text-base text-pretty">{t('userBookings.subtitle')}</p>
          </div>
          <Link 
            to="/poojas" 
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm shrink-0 w-full sm:w-auto"
          >
            {t('userBookings.bookNew')}
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border/50 flex flex-col sm:flex-row gap-4 sm:gap-6 min-w-0">
                <div className="flex-1 space-y-3 min-w-0">
                  <Skeleton className="h-6 w-3/4 max-w-[200px]" />
                  <Skeleton className="h-4 w-1/2 max-w-[150px]" />
                  <div className="flex flex-wrap gap-4 pt-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="sm:w-48 flex flex-col items-start sm:items-end justify-between gap-4 shrink-0">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-8 w-full sm:w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-card rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-destructive/20 max-w-2xl mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-destructive" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Failed to load</h3>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-8 text-pretty">
              {error}
            </p>
            <Button onClick={fetchBookings} variant="outline" className="w-full sm:w-auto gap-2">
              <Loader2 className="w-4 h-4" /> Retry
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-border/50 max-w-2xl mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
              <Ticket className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">{t('userBookings.noBookings')}</h3>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-8 text-pretty">
              {t('userBookings.noBookingsDesc')}
            </p>
            <Link 
              to="/poojas" 
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-background border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-colors w-full sm:w-auto"
            >
              {t('userBookings.viewSchedule')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const poojaName = booking.expand?.pooja?.name || 'Unknown Pooja';
              
              return (
                <div key={booking.id} className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow border border-border/50 flex flex-col sm:flex-row gap-4 sm:gap-6 relative overflow-hidden min-w-0">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 shrink-0 ${
                    (booking.status === 'approved' || booking.status === 'completed') ? 'bg-green-500' : 
                    (booking.status === 'cancelled' || booking.status === 'rejected') ? 'bg-destructive' : 'bg-amber-500'
                  }`}></div>
                  
                  <div className="flex-1 pl-3 sm:pl-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground truncate" title={poojaName}>{poojaName}</h3>
                      <div className="sm:hidden">{getStatusBadge(booking.status)}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 opacity-70 shrink-0" />
                        <span className="font-medium text-foreground truncate">{formatDate(booking.pooja_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 opacity-70 shrink-0" />
                        <span className="font-medium text-foreground truncate" title={booking.time_slot}>{booking.time_slot}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className="w-4 h-4 opacity-70 shrink-0" />
                        <span className="truncate">{t('userBookings.donation')}: <strong className="text-foreground">€{booking.donation_amount}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="opacity-70 font-mono text-[10px] sm:text-xs shrink-0">TXN:</span>
                        <span className="font-mono text-[10px] sm:text-xs bg-muted px-1.5 py-0.5 rounded text-foreground truncate max-w-full" title={booking.transaction_id}>
                          {booking.transaction_id}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 text-[10px] sm:text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 min-w-0">
                      <span className="truncate">{t('userBookings.bookedOn')}: {new Date(booking.created).toLocaleDateString()}</span>
                      {(booking.status === 'approved' || booking.status === 'completed') && (
                        <span className="text-green-600 font-medium truncate">
                          {t('userBookings.confirmedOn')}: {new Date(booking.updated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start sm:items-end justify-between sm:border-l border-border/50 sm:pl-6 sm:min-w-[160px] mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 shrink-0">
                    <div className="hidden sm:block">{getStatusBadge(booking.status)}</div>
                    
                    {booking.status === 'pending' && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground text-left sm:text-right mt-2 sm:mt-4 text-pretty">
                        {t('userBookings.awaitingVerification')}
                      </p>
                    )}

                    {(booking.status === 'approved' || booking.status === 'completed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 sm:mt-4 w-full sm:w-auto"
                        onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(booking.id, booking.receipt_id); }}
                        disabled={downloadingId === booking.id}
                      >
                        {downloadingId === booking.id ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" /> : <Download className="w-3.5 h-3.5 mr-2 shrink-0" />}
                        {t('userBookings.downloadReceipt')}
                      </Button>
                    )}
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

export default MyBookingsPage;