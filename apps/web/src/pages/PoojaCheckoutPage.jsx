import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Clock, User, Mail, Phone, Users, CreditCard, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import PoojaSlotSelector from '@/components/PoojaSlotSelector.jsx';

const DEFAULT_TIME_SLOTS = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', 
  '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', 
  '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
];

const PoojaCheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [pooja, setPooja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Form state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [formData, setFormData] = useState({
    name: currentUser?.name || currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    participants: 1,
    transactionId: '',
    termsAccepted: false
  });
  
  // Validation state
  const [transactionIdError, setTransactionIdError] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [allSlotsBooked, setAllSlotsBooked] = useState(false);

  useEffect(() => {
    const fetchPooja = async () => {
      try {
        const poojaRecord = await pb.collection('poojas').getOne(id, { $autoCancel: false });
        setPooja(poojaRecord);
      } catch (err) {
        console.error('Error fetching pooja:', err);
        setError('Failed to load pooja details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPooja();
  }, [id]);

  const availabilityType = pooja?.availabilityType || 'allDays';
  
  const parsedSpecificDates = useMemo(() => {
    if (!pooja?.specificDates) return [];
    try { return JSON.parse(pooja.specificDates); } catch { return []; }
  }, [pooja?.specificDates]);

  const parsedSpecificDays = useMemo(() => {
    if (!pooja?.specificDays) return [];
    try { return JSON.parse(pooja.specificDays); } catch { return []; }
  }, [pooja?.specificDays]);

  const availableTimeSlots = useMemo(() => {
    if (pooja?.timeSlots) {
      try { 
        const parsed = JSON.parse(pooja.timeSlots);
        return parsed.length > 0 ? parsed : DEFAULT_TIME_SLOTS;
      } catch { return DEFAULT_TIME_SLOTS; }
    }
    if (pooja?.time_slots) {
      const parsed = pooja.time_slots.split(',').map(s => s.trim()).filter(Boolean);
      return parsed.length > 0 ? parsed : DEFAULT_TIME_SLOTS;
    }
    return DEFAULT_TIME_SLOTS;
  }, [pooja?.timeSlots, pooja?.time_slots]);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate || !pooja) {
        setBookedSlots([]);
        setAllSlotsBooked(false);
        return;
      }

      setCheckingSlots(true);
      setAllSlotsBooked(false);
      setSelectedTimeSlot('');

      try {
        const dateObj = new Date(selectedDate);
        const offset = dateObj.getTimezoneOffset() * 60000;
        const localISODate = (new Date(dateObj - offset)).toISOString().split('T')[0];

        const records = await pb.collection('pooja_bookings').getList(1, 500, {
          filter: `pooja="${pooja.id}" && pooja_date >= "${localISODate} 00:00:00" && pooja_date <= "${localISODate} 23:59:59" && status!="cancelled" && status!="rejected"`,
          $autoCancel: false
        });

        const booked = [...new Set(records.items.map(r => r.time_slot))];
        setBookedSlots(booked);

        if (availableTimeSlots.length > 0 && booked.length >= availableTimeSlots.length) {
          setAllSlotsBooked(true);
        }
      } catch (error) {
        console.error('Error fetching booked slots:', error);
      } finally {
        setCheckingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [selectedDate, pooja, availableTimeSlots.length]);

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;

    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    if (date > threeMonthsFromNow) return true;

    if (availabilityType === 'specificDate') {
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date - offset)).toISOString().split('T')[0];
      return !parsedSpecificDates.includes(localISOTime);
    }

    if (availabilityType === 'specificDaysRegularly') {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return !parsedSpecificDays.includes(dayName);
    }

    return false;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'transactionId') {
      validateTransactionId(value);
    }
  };

  const validateTransactionId = (value) => {
    if (!value.trim()) {
      setTransactionIdError('Transaction ID is required');
      return false;
    }
    if (value.length < 5) {
      setTransactionIdError('Transaction ID must be at least 5 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      setTransactionIdError('Transaction ID must be alphanumeric');
      return false;
    }
    setTransactionIdError('');
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedDate) {
        toast.error('Please select a date.');
        return;
      }
      if (availableTimeSlots.length > 0 && !selectedTimeSlot) {
        toast.error('Please select a time slot.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.name || !formData.email || !formData.phone || !formData.participants) {
        toast.error('Please fill in all participant details.');
        return;
      }
    }
    if (currentStep === 3) {
      if (!validateTransactionId(formData.transactionId)) {
        toast.error('Please provide a valid transaction ID.');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!formData.termsAccepted) {
      toast.error('Please accept the terms and conditions.');
      return;
    }

    setSubmitting(true);
    try {
      const dateObj = new Date(selectedDate);
      dateObj.setHours(12, 0, 0, 0);

      const bookingData = {
        user: currentUser?.id || null,
        pooja: pooja.id,
        pooja_date: dateObj.toISOString(),
        booking_date: new Date().toISOString(),
        time_slot: selectedTimeSlot || 'N/A',
        donation_amount: pooja.donation_amount,
        name: formData.name,
        email: formData.email,
        user_contact: formData.phone,
        status: 'pending',
        payment_status: 'pending',
        booking_time: new Date().toISOString(),
        transaction_id: formData.transactionId
      };

      const record = await pb.collection('pooja_bookings').create(bookingData, { $autoCancel: false });
      
      toast.success('Booking submitted successfully!');
      navigate(`/booking-confirmation/${record.id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !pooja) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{error || 'Pooja not found'}</h2>
          <Button onClick={() => navigate('/poojas')}>Back to Poojas</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Checkout - {pooja.name} | Temple</title></Helmet>
      <Header />
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-primary">
              {currentStep === 1 && 'Date & Time'}
              {currentStep === 2 && 'Participant Info'}
              {currentStep === 3 && 'Payment'}
              {currentStep === 4 && 'Review'}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="border-border shadow-lg overflow-hidden">
          
          {/* Step 1: Date & Time Selection */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-2xl font-serif text-primary">Select Date & Time</CardTitle>
                <CardDescription>Choose when you would like to perform {pooja.name}.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-3">
                  <Label className="text-foreground font-semibold flex items-center gap-2 text-base">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Select Date
                  </Label>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={isDateDisabled}
                      className="bg-card rounded-lg border border-border shadow-sm p-3"
                    />
                  </div>
                </div>

                {availableTimeSlots.length > 0 && (
                  <div className={`space-y-3 transition-opacity duration-300 ${!selectedDate ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <Label className="text-foreground font-semibold flex items-center gap-2 text-base">
                      <Clock className="w-5 h-5 text-primary" />
                      Select Time Slot
                    </Label>
                    
                    {!selectedDate ? (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border border-border">
                        Please select a date first to view time slots.
                      </p>
                    ) : checkingSlots ? (
                      <div className="flex items-center justify-center p-8 bg-muted/30 rounded-xl border border-border">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : allSlotsBooked ? (
                      <div className="bg-destructive/10 border border-destructive/20 p-5 rounded-xl flex flex-col items-center text-center space-y-3">
                        <AlertCircle className="w-10 h-10 text-destructive" />
                        <p className="font-medium text-destructive">
                          All time slots are booked for this date. Please select another date.
                        </p>
                      </div>
                    ) : (
                      <PoojaSlotSelector 
                        availableSlots={availableTimeSlots}
                        bookedSlots={bookedSlots}
                        selectedSlotId={selectedTimeSlot}
                        onSelectSlot={setSelectedTimeSlot}
                        selectedDate={selectedDate}
                      />
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-6 border-t border-border bg-muted/10 flex justify-between">
                <Button variant="outline" onClick={() => navigate('/poojas')}><ArrowLeft className="w-4 h-4 mr-2" /> Cancel</Button>
                <Button onClick={handleNextStep} className="bg-primary text-primary-foreground">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </div>
          )}

          {/* Step 2: Participant Details */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-2xl font-serif text-primary">Participant Details</CardTitle>
                <CardDescription>Enter the details of the person performing the pooja.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="pl-9" placeholder="John Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="pl-9" placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required className="pl-9" placeholder="+1 234 567 8900" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="participants">Number of Participants <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="participants" name="participants" type="number" min="1" value={formData.participants} onChange={handleInputChange} required className="pl-9" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 border-t border-border bg-muted/10 flex justify-between">
                <Button variant="outline" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleNextStep} className="bg-primary text-primary-foreground">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </div>
          )}

          {/* Step 3: Payment Account Details */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-2xl font-serif text-primary">Payment Details</CardTitle>
                <CardDescription>Please transfer the donation amount to the temple account and provide the transaction ID.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                
                <div className="space-y-2 max-w-md mx-auto">
                  <Label htmlFor="donationAmount" className="text-base font-semibold">Donation Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                    <Input 
                      id="donationAmount" 
                      value={pooja.donation_amount} 
                      disabled
                      className="pl-8 bg-muted text-foreground font-bold text-lg cursor-not-allowed opacity-100"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">This amount is fixed for {pooja.name}.</p>
                </div>

                <PaymentAccountDetails />

                <div className="border-t border-border pt-6">
                  <div className="space-y-2 max-w-md mx-auto">
                    <Label htmlFor="transactionId" className="text-base font-semibold">Transaction ID (Required) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="transactionId" 
                      name="transactionId" 
                      value={formData.transactionId} 
                      onChange={handleInputChange} 
                      placeholder="Enter transaction ID after payment" 
                      className={`h-12 text-lg ${transactionIdError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {transactionIdError && <p className="text-sm text-destructive mt-1">{transactionIdError}</p>}
                    <p className="text-xs text-muted-foreground">Please complete the payment first, then enter the transaction reference number here.</p>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="p-6 border-t border-border bg-muted/10 flex justify-between">
                <Button variant="outline" onClick={handlePrevStep}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleNextStep} className="bg-primary text-primary-foreground">Review Booking <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-2xl font-serif text-primary">Review & Confirm</CardTitle>
                <CardDescription>Please review all details before submitting your booking request.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pooja Summary */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <h3 className="font-semibold text-lg">Pooja Details</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-primary h-8 px-2">Edit</Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Pooja Name:</span> <span className="font-medium">{pooja.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Date:</span> <span className="font-medium">{selectedDate?.toLocaleDateString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Time:</span> <span className="font-medium">{selectedTimeSlot}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Category:</span> <span className="font-medium">{pooja.category}</span></div>
                    </div>
                  </div>

                  {/* Participant Summary */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <h3 className="font-semibold text-lg">Participant Details</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-primary h-8 px-2">Edit</Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span className="font-medium">{formData.email}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{formData.phone}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Participants:</span> <span className="font-medium">{formData.participants}</span></div>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-muted/30 p-6 rounded-xl border border-border space-y-4">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <h3 className="font-semibold text-lg">Payment Summary</h3>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="text-primary h-8 px-2">Edit</Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Donation Amount:</span> <span className="font-bold text-lg">€{pooja.donation_amount}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID:</span> <span className="font-mono font-medium">{formData.transactionId}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Status:</span> <span className="text-amber-600 font-medium">Pending Verification</span></div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-4 border-t border-border">
                  <Checkbox 
                    id="terms" 
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: checked }))}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
                    I confirm that the information provided is accurate and I have completed the payment of €{pooja.donation_amount} using the transaction ID provided. I agree to the temple's terms and conditions.
                  </label>
                </div>

              </CardContent>
              <CardFooter className="p-6 border-t border-border bg-muted/10 flex justify-between">
                <Button variant="outline" onClick={handlePrevStep} disabled={submitting}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || !formData.termsAccepted} 
                  className="bg-primary text-primary-foreground px-8"
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirm Booking
                </Button>
              </CardFooter>
            </div>
          )}

        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PoojaCheckoutPage;