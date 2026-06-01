import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { CheckCircle, Calendar, Clock, CreditCard, ArrowRight, Home, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const BookingSuccessPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const record = await pb.collection('pooja_bookings').getOne(bookingId, { 
          expand: 'pooja',
          $autoCancel: false 
        });
        setBooking(record);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Could not find booking details.');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handleDownloadReceipt = async () => {
    try {
      setDownloading(true);
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
      a.download = `Receipt-Pooja-${booking.receipt_id || bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err.message || 'Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 space-y-6">
            <div className="flex justify-center"><Skeleton className="w-20 h-20 rounded-full" /></div>
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mx-auto" />
            <div className="space-y-3 mt-8">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8">
            <h2 className="text-2xl font-bold text-destructive mb-4">Oops!</h2>
            <p className="text-muted-foreground mb-6">{error || 'Booking not found.'}</p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const poojaName = booking.expand?.pooja?.name || booking.pooja_name || 'Pooja';
  const displayDate = new Date(booking.pooja_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Booking Received | Temple</title>
      </Helmet>

      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Card className="border-primary/20 shadow-xl overflow-hidden rounded-2xl bg-card">
            {/* Celebratory Header */}
            <div className="bg-primary/5 border-b border-primary/10 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 shadow-sm border border-primary/20">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-serif tracking-tight">
                Your Booking Has Been Received! ✓
              </h1>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                Thank you for your booking. Your pooja reservation has been successfully submitted and is now pending admin approval.
              </p>
            </div>

            <CardContent className="p-8">
              <div className="bg-muted/50 rounded-xl p-5 border border-border mb-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Our team will review your booking details and confirm your reservation shortly. You'll receive a confirmation email once approved.
                </p>
              </div>

              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2 mb-6">
                Booking Summary
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Pooja & Date</p>
                    <p className="font-semibold text-foreground">{poojaName}</p>
                    <p className="text-sm text-muted-foreground">{displayDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Time Slot</p>
                    <p className="font-semibold text-foreground">{booking.time_slot}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Donation Amount</p>
                    <p className="font-bold text-xl text-foreground">€{booking.donation_amount?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ref: {booking.transaction_id}</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 bg-muted/20 border-t border-border/50 flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Button asChild variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-xl">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" /> Return to Home
                </Link>
              </Button>
              
              {booking.status === 'approved' && (
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto h-12 px-6 rounded-xl"
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download Receipt
                </Button>
              )}

              <Button asChild className="w-full sm:w-auto h-12 px-6 rounded-xl shadow-md">
                <Link to="/poojas">
                  Browse More Poojas <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingSuccessPage;