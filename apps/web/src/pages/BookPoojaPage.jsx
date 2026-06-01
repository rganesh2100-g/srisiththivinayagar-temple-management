import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { readRecord, createRecord, getFullList } from '@/lib/pbHelper.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Calendar, Clock, User, CreditCard, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { validateEmail, validatePhone, validateStringLength, validateFutureDate } from '@/lib/validationUtils.js';

const BookPoojaPage = () => {
  const { poojaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState(1);
  const [pooja, setPooja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);
  const [errors, setErrors] = useState({});
  const [networkError, setNetworkError] = useState(false);
  
  // Form State
  const [selectedDate, setSelectedDate] = useState(location.state?.date ? location.state.date.split('T')[0] : '');
  const [selectedSlot, setSelectedSlot] = useState(location.state?.time || '');
  const [useProfileDetails, setUseProfileDetails] = useState(true);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    transactionId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      const record = await readRecord('poojas', poojaId);
      setPooja(record);
      
      const queryOptions = {
        filter: `pooja="${poojaId}" && status != "cancelled" && status != "rejected"`,
        expand: 'user,pooja'
      };

      const bookings = await getFullList('pooja_bookings', queryOptions);
      setExistingBookings(bookings);
      
    } catch (err) {
      console.error('Error fetching pooja details:', err);
      setNetworkError(true);
      toast.error(err.message || 'Failed to load pooja details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      toast.warning('Please log in to book a pooja.');
      navigate('/login', { state: { from: `/book-pooja/${poojaId}` } });
      return;
    }
    fetchData();
  }, [poojaId, navigate, isAuthenticated]);

  useEffect(() => {
    if (useProfileDetails && currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      }));
    } else if (!useProfileDetails) {
      setFormData(prev => ({
        ...prev,
        name: '',
        email: '',
        phone: ''
      }));
    }
  }, [useProfileDetails, currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const parseArrayString = (str) => {
    if (!str) return [];
    try { return JSON.parse(str); } 
    catch (e) { return str.split(',').map(s => s.trim()).filter(Boolean); }
  };

  const getSlotAvailability = (date, slot) => {
    const count = existingBookings.filter(b => 
      b.pooja_date.startsWith(date) && b.time_slot === slot
    ).length;
    
    const maxPerSlot = pooja?.maxParticipants || 5;
    return {
      booked: count,
      total: maxPerSlot,
      isFull: count >= maxPerSlot
    };
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!selectedDate) newErrors.date = 'Please select a date';
    else if (!validateFutureDate(selectedDate)) newErrors.date = 'Date must be today or in the future';
    
    if (!selectedSlot) newErrors.slot = 'Please select a time slot';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!validateStringLength(formData.name, 2, 100)) newErrors.name = 'Name must be between 2 and 100 characters';
    if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!validatePhone(formData.phone)) newErrors.phone = 'Please enter a valid 10-15 digit phone number';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      toast.error('Please resolve the errors before proceeding');
      return;
    }
    if (step === 2 && !validateStep2()) {
      toast.error('Please resolve the errors before proceeding');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!validateStringLength(formData.transactionId, 5, 100)) {
      newErrors.transactionId = 'Please enter a valid transaction ID';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please enter a valid transaction ID');
      return;
    }

    setSubmitting(true);
    try {
      let formattedDate = selectedDate;
      if (selectedDate && !selectedDate.includes(' ')) {
        formattedDate = `${selectedDate} 12:00:00.000Z`;
      }

      const now = new Date();
      
      const bookingData = {
        user: currentUser.id,
        pooja: poojaId,
        booking_date: now.toISOString(),
        pooja_date: formattedDate,
        time_slot: selectedSlot,
        name: formData.name,
        email: formData.email,
        user_contact: formData.phone,
        transaction_id: formData.transactionId,
        status: 'pending',
        payment_status: 'pending',
        donation_amount: pooja.donation_amount || 0,
        booking_time: now.toLocaleTimeString()
      };

      const record = await createRecord('pooja_bookings', bookingData);
      
      toast.success('Pooja booked successfully! Awaiting admin approval.');
      navigate(`/booking-success/${record.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading pooja details...</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-foreground">Connection Error</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">Failed to load booking details. Please check your internet connection.</p>
        <Button onClick={fetchData} className="gap-2"><Loader2 className="w-4 h-4" /> Retry</Button>
      </div>
    );
  }

  if (!pooja) return null;

  const availableDates = parseArrayString(pooja.available_dates);
  const timeSlots = parseArrayString(pooja.time_slots);

  return (
    <div className="min-h-[100dvh] bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-8">
          <button onClick={() => navigate('/poojas')} className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm font-medium mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Schedule
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Book {pooja.name}</h1>
          <p className="text-muted-foreground">Complete the steps below to secure your booking.</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full z-0"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
            
            {[
              { num: 1, label: 'Date & Time', icon: Calendar },
              { num: 2, label: 'Details', icon: User },
              { num: 3, label: 'Payment', icon: CreditCard }
            ].map((s) => (
              <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors duration-300 ${
                  step >= s.num ? 'bg-primary text-primary-foreground shadow-md' : 'bg-background text-muted-foreground border-2 border-border'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="p-6 md:p-8">
            
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" /> Select Date
                  </h3>
                  {availableDates.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {availableDates.map((date) => (
                        <button
                          key={date}
                          onClick={() => { 
                            setSelectedDate(date); 
                            setSelectedSlot(''); 
                            setErrors(prev => ({ ...prev, date: null }));
                          }}
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                            selectedDate === date 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-border text-foreground hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl flex items-start gap-3 border border-amber-200">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>No specific dates are predefined for this pooja. Please contact the temple administration.</p>
                    </div>
                  )}
                  {errors.date && <p className="text-sm text-destructive mt-2">{errors.date}</p>}
                </div>

                {selectedDate && (
                  <div className="animate-in fade-in duration-300">
                    <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Select Time Slot
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {timeSlots.map((slot) => {
                        const availability = getSlotAvailability(selectedDate, slot);
                        const isSelected = selectedSlot === slot;
                        
                        return (
                          <button
                            key={slot}
                            disabled={availability.isFull}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setErrors(prev => ({ ...prev, slot: null }));
                            }}
                            className={`relative py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 ${
                              availability.isFull 
                                ? 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-70'
                                : isSelected
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-border text-foreground hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <span>{slot}</span>
                            <span className={`text-[10px] ${availability.isFull ? 'text-destructive' : isSelected ? 'text-primary' : 'text-green-600'}`}>
                              {availability.isFull ? 'Fully Booked' : `${availability.total - availability.booked} slots left`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.slot && <p className="text-sm text-destructive mt-2">{errors.slot}</p>}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-xl border border-border">
                  <div>
                    <h3 className="font-semibold text-foreground">Use Profile Details</h3>
                    <p className="text-sm text-muted-foreground">Auto-fill with your account information</p>
                  </div>
                  <Switch 
                    checked={useProfileDetails} 
                    onCheckedChange={setUseProfileDetails}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange}
                      disabled={useProfileDetails}
                      placeholder="Enter your full name"
                      className={`h-12 rounded-xl ${errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email"
                      value={formData.email} 
                      onChange={handleInputChange}
                      disabled={useProfileDetails}
                      placeholder="Enter your email"
                      className={`h-12 rounded-xl ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange}
                      disabled={useProfileDetails}
                      placeholder="Enter your phone number"
                      className={`h-12 rounded-xl ${errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                  <p className="text-muted-foreground mb-1">Required Donation Amount</p>
                  <h2 className="text-4xl font-bold text-primary">€{pooja.donation_amount || 0}</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                  <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex-shrink-0">
                    <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                      <div className="text-center">
                        <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground font-medium">Scan to Pay</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="transactionId" className="font-semibold">
                        Transaction ID / Reference Number <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        After completing the payment, please enter the transaction reference number below to verify your booking.
                      </p>
                      <Input 
                        id="transactionId" 
                        name="transactionId" 
                        value={formData.transactionId} 
                        onChange={handleInputChange}
                        placeholder="e.g. TXN123456789"
                        className={`h-12 rounded-xl text-lg ${errors.transactionId ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.transactionId && <p className="text-sm text-destructive">{errors.transactionId}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
          
          <div className="p-6 bg-muted/30 border-t border-border flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 1 || submitting}
              className="rounded-xl px-6 h-12"
            >
              Back
            </Button>
            
            {step < 3 ? (
              <Button 
                onClick={handleNext}
                className="rounded-xl px-8 h-12 flex items-center gap-2"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl px-8 h-12 flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Confirm Booking</>
                )}
              </Button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default BookPoojaPage;