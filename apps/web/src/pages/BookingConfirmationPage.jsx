import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Calendar, Clock, User, CreditCard, Download, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const BookingConfirmationPage = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const record = await pb.collection('pooja_bookings').getOne(bookingId, {
          expand: 'pooja,user',
          $autoCancel: false
        });
        setBooking(record);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Booking not found or you do not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 w-full space-y-8">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{error || 'Booking not found'}</h2>
          <Button asChild>
            <Link to="/poojas">Browse Poojas</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const pooja = booking.expand?.pooja;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Booking Confirmation | Sri Siththi Vinayagar Temple</title>
      </Helmet>
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Booking Confirmed!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your booking. Your request has been received successfully.
          </p>
          <p className="text-sm font-medium text-primary mt-2">
            Booking Reference: #{booking.id.toUpperCase()}
          </p>
        </div>

        <Card className="border-border shadow-md overflow-hidden mb-8">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle className="text-xl">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="p-6 flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pooja Details</p>
                  <p className="font-semibold text-lg">{pooja?.name || booking.pooja_name || 'Pooja'}</p>
                  <p className="text-foreground mt-1">
                    {format(new Date(booking.pooja_date), 'EEEE, MMMM do, yyyy')}
                  </p>
                </div>
              </div>

              <div className="p-6 flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time Slot</p>
                  <p className="font-medium text-foreground">{booking.time_slot}</p>
                </div>
              </div>

              <div className="p-6 flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Participant Details</p>
                  <p className="font-medium text-foreground">{booking.name}</p>
                  <p className="text-sm text-muted-foreground">{booking.email}</p>
                  <p className="text-sm text-muted-foreground">{booking.user_contact}</p>
                </div>
              </div>

              <div className="p-6 flex items-start gap-4 bg-muted/10">
                <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div className="w-full flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Donation Amount</p>
                    <p className="font-bold text-xl text-foreground">€{booking.donation_amount}</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full uppercase tracking-wider">
                    {booking.payment_status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="h-12 px-8">
            <Link to="/my-bookings">View My Bookings</Link>
          </Button>
          <Button asChild className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/poojas">Continue Browsing <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default BookingConfirmationPage;