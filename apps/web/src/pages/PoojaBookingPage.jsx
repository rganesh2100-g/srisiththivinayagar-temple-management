import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Clock, Info, AlertCircle } from 'lucide-react';
import { verifyQueryExpand } from '@/lib/relationshipVerification.js';
import { filterExpiredPoojas } from '@/utils/poojaUtils.js';

const PoojaBookingPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [selectedPooja, setSelectedPooja] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [fullyBookedDates, setFullyBookedDates] = useState([]);

  const fetchPoojas = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await pb.collection('poojas').getList(1, 50, {
        filter: 'published = true && is_deleted = false',
        sort: '-created',
        $autoCancel: false
      });
      setPoojas(filterExpiredPoojas(records.items));
    } catch (err) {
      console.error('Error fetching poojas:', err);
      setError(t('pooja.failedToLoad') || 'Failed to load poojas.');
      toast.error(t('common.error') || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoojas();

    const subscribe = async () => {
      try {
        await pb.collection('poojas').subscribe('*', function (e) {
          fetchPoojas();
        });
      } catch (err) {
        console.error('Realtime subscription error:', err);
      }
    };
    
    subscribe();

    return () => {
      pb.collection('poojas').unsubscribe('*').catch(() => {});
    };
  }, []);

  const handleBookClick = async (pooja) => {
    if (!currentUser) {
      toast.info(t('pooja.pleaseLogin') || 'Please log in to book a pooja.');
      navigate('/login');
      return;
    }
    
    setSelectedPooja(pooja);
    setSelectedDate(null);
    setSelectedTime(null);
    setIsModalOpen(true);
    
    try {
      const queryOptions = {
        filter: `pooja="${pooja.id}" && status!="rejected" && status!="cancelled"`,
        expand: 'user,pooja',
        $autoCancel: false
      };
      verifyQueryExpand('pooja_bookings', queryOptions);

      const bookings = await pb.collection('pooja_bookings').getFullList(queryOptions);
      
      const timeSlots = pooja.time_slots ? JSON.parse(pooja.time_slots) : [];
      const totalSlotsPerDay = timeSlots.length;
      
      if (totalSlotsPerDay > 0) {
        const bookingsByDate = {};
        bookings.forEach(b => {
          const dateStr = b.pooja_date.split(' ')[0];
          if (!bookingsByDate[dateStr]) bookingsByDate[dateStr] = 0;
          bookingsByDate[dateStr]++;
        });
        
        const fullyBooked = Object.keys(bookingsByDate).filter(date => bookingsByDate[date] >= totalSlotsPerDay);
        setFullyBookedDates(fullyBooked);
      }
    } catch (err) {
      console.error('Error pre-fetching bookings:', err);
    }
  };

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedPooja || !selectedDate) return;
      setCheckingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const queryOptions = {
          filter: `pooja="${selectedPooja.id}" && pooja_date>="${dateStr} 00:00:00" && pooja_date<="${dateStr} 23:59:59" && status!="rejected" && status!="cancelled"`,
          expand: 'user,pooja',
          $autoCancel: false
        };
        verifyQueryExpand('pooja_bookings', queryOptions);

        const bookings = await pb.collection('pooja_bookings').getFullList(queryOptions);
        
        setBookedSlots(bookings.map(b => b.time_slot));
      } catch (error) {
        console.error('Error fetching slots:', error);
        toast.error(t('common.error') || 'Error fetching time slots.');
      } finally {
        setCheckingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [selectedDate, selectedPooja]);

  const handleProceedToCheckout = () => {
    if (!selectedDate || !selectedTime) {
      toast.error(t('pooja.selectDateTime') || 'Please select both date and time.');
      return;
    }
    
    // Navigate to the unified booking flow
    navigate(`/book-pooja/${selectedPooja.id}`, {
      state: {
        date: selectedDate.toISOString(),
        time: selectedTime
      }
    });
  };

  const isDateDisabled = (date) => {
    if (!selectedPooja) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toISOString().split('T')[0];
    
    if (fullyBookedDates.includes(dateStr)) return true;
    
    let allowedDays = [];
    try { allowedDays = selectedPooja.days ? JSON.parse(selectedPooja.days) : []; } catch(e) {}
    
    let specificDates = [];
    try { specificDates = selectedPooja.dates ? JSON.parse(selectedPooja.dates) : []; } catch(e) {}

    if (specificDates.length > 0) {
      return !specificDates.includes(dateStr);
    }
    
    if (allowedDays.length > 0) {
      return !allowedDays.includes(dayName);
    }

    return false;
  };

  let timeSlots = [];
  try {
    timeSlots = selectedPooja?.time_slots ? JSON.parse(selectedPooja.time_slots) : [];
  } catch(e) {
    console.error('Error parsing time slots:', e);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>{t('pooja.bookPooja') || 'Book Pooja'} | {t('nav.templeName') || 'Temple'}</title></Helmet>
      <Header />
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            {t('pooja.divineOfferings') || 'Divine Offerings'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pooja.divineOfferingsDesc') || 'Explore our sacred poojas and schedule your spiritual ceremonies.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="text-center py-20 bg-destructive/5 rounded-2xl border border-destructive/20 max-w-2xl mx-auto">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-80" />
            <h3 className="text-xl font-semibold text-destructive">{error}</h3>
            <Button onClick={fetchPoojas} variant="outline" className="mt-4">{t('common.tryAgain') || 'Try Again'}</Button>
          </div>
        ) : poojas.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm max-w-2xl mx-auto">
            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-2xl font-semibold text-foreground">{t('pooja.noPoojas') || 'No Poojas Available'}</h3>
            <p className="text-muted-foreground mt-2">{t('pooja.noPoojasDesc') || 'There are no active poojas scheduled at the moment. Please check back later.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {poojas.map(pooja => {
              let parsedDays = [];
              try { parsedDays = pooja.days ? JSON.parse(pooja.days) : []; } catch(e) {}
              
              return (
                <Card key={pooja.id} className="flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 border-none bg-card hover:-translate-y-1">
                  <div className="h-2 bg-primary w-full"></div>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{pooja.category}</Badge>
                      <span className="font-bold text-xl text-foreground">€{pooja.donation_amount}</span>
                    </div>
                    <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{pooja.name}</CardTitle>
                    <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{pooja.god}</p>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 leading-relaxed">{pooja.description}</p>
                    <div className="space-y-3 text-sm bg-muted/40 p-4 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3 text-foreground/80">
                        <CalendarIcon className="w-4 h-4 text-primary/80" />
                        <span className="font-medium">{parsedDays.length > 0 ? parsedDays.join(', ') : (t('pooja.specificDates') || 'Specific Dates')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-foreground/80">
                        <Clock className="w-4 h-4 text-primary/80" />
                        <span className="font-medium">{t('pooja.multipleSlots') || 'Multiple Slots Available'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors" onClick={() => handleBookClick(pooja)}>
                      {t('pooja.bookPooja') || 'Book Pooja'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-2xl">
          <DialogHeader className="bg-muted/30 -mx-6 -mt-6 p-6 border-b border-border/50 mb-4 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>{selectedPooja?.name}</DialogTitle>
            <DialogDescription className="text-base">{t('pooja.selectDateTime') || 'Select Date and Time'}</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-foreground"><CalendarIcon className="w-4 h-4 text-primary" /> {t('pooja.selectDate') || 'Select Date'}</h4>
              <div className="border border-border/50 rounded-xl p-3 bg-card inline-block shadow-sm w-full flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  className="rounded-md"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-foreground"><Clock className="w-4 h-4 text-primary" /> {t('pooja.selectTime') || 'Select Time'}</h4>
              {!selectedDate ? (
                <div className="bg-muted/50 p-6 rounded-xl text-center border border-border/50 h-full flex flex-col justify-center items-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('pooja.selectDate') || 'Please select a date first'}</p>
                </div>
              ) : checkingSlots ? (
                <div className="flex justify-center items-center h-40 bg-muted/20 rounded-xl border border-border/50"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : timeSlots.length === 0 ? (
                <div className="bg-muted/50 p-6 rounded-xl text-center border border-border/50">
                  <p className="text-sm text-muted-foreground">No time slots configured.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {timeSlots.map(time => {
                    const isBooked = bookedSlots.includes(time);
                    return (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        className={`w-full py-6 text-sm font-medium transition-all ${isBooked ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-border/50' : selectedTime === time ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md' : 'hover:border-primary/50 hover:bg-primary/5'}`}
                        disabled={isBooked}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {selectedDate && selectedTime && (
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Selected Slot</p>
                  <p className="font-bold text-foreground text-lg">{selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" /> {selectedTime}
                  </p>
                  <div className="h-px w-full bg-primary/10 my-3"></div>
                  <div className="flex justify-between items-center font-semibold">
                    <span>{t('pooja.donation') || 'Donation Amount'}</span>
                    <span className="text-lg">€{selectedPooja?.donation_amount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-6 mt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="px-6">{t('common.cancel') || 'Cancel'}</Button>
            <Button onClick={handleProceedToCheckout} disabled={!selectedDate || !selectedTime} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-md">
              {t('pooja.proceedToCheckout') || 'Proceed to Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PoojaBookingPage;