import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createRecord, listRecords } from '@/lib/pbHelper.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import UnifiedDashboardSidebar from '@/components/UnifiedDashboardSidebar.jsx';
import DonationSuccessModal from '@/components/DonationSuccessModal.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, HeartHandshake, Info, User, Mail, Phone, Calendar, Hash, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import { validateEmail, validatePhone, validateAmount, validateStringLength } from '@/lib/validationUtils.js';

const TempleDonatePage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errors, setErrors] = useState({});
  
  const [paymentAccount, setPaymentAccount] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [paymentError, setPaymentError] = useState(null);

  const initialFormState = {
    donationCategory: '',
    donor_name: '',
    donor_email: '',
    donor_phone: '',
    amount: '',
    specialOccasion: '',
    transactionId: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        donor_name: currentUser.name || '',
        donor_email: currentUser.email || '',
        donor_phone: currentUser.phone || ''
      }));
    }
  }, [currentUser]);

  const fetchPaymentAccount = async () => {
    try {
      setLoadingPayment(true);
      setPaymentError(null);
      
      const result = await listRecords('payment_accounts', 1, 1, {
        sort: '-created'
      });

      if (result.items.length > 0) {
        setPaymentAccount(result.items[0]);
      } else {
        setPaymentAccount(null);
      }
    } catch (err) {
      setPaymentError('Failed to load payment details. Please check your connection.');
      toast.error('Unable to fetch payment account information');
    } finally {
      setLoadingPayment(false);
    }
  };

  useEffect(() => {
    fetchPaymentAccount();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, donationCategory: value }));
    if (errors.donationCategory) {
      setErrors(prev => ({ ...prev, donationCategory: null }));
    }
  };

  const setQuickAmount = (amount) => {
    setFormData(prev => ({ ...prev, amount: amount.toString() }));
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.donationCategory) newErrors.donationCategory = 'Please select a donation category';
    
    if (!validateAmount(formData.amount, 1, 1000000)) {
      newErrors.amount = 'Amount must be between €1 and €1,000,000';
    }
    
    if (!validateStringLength(formData.donor_name, 2, 100)) {
      newErrors.donor_name = 'Name must be between 2 and 100 characters';
    }
    
    if (!validateEmail(formData.donor_email)) {
      newErrors.donor_email = 'Please enter a valid email address';
    }
    
    if (formData.donor_phone && !validatePhone(formData.donor_phone)) {
      newErrors.donor_phone = 'Please enter a valid 10-15 digit phone number';
    }
    
    if (formData.specialOccasion && !validateStringLength(formData.specialOccasion, 0, 500)) {
      newErrors.specialOccasion = 'Special occasion description is too long';
    }
    
    if (!validateStringLength(formData.transactionId, 5, 100)) {
      newErrors.transactionId = 'Please enter a valid transaction ID';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form before submitting');
      return;
    }

    setLoading(true);
    try {
      const parsedAmount = parseFloat(formData.amount);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd} 12:00:00.000Z`;

      const payload = {
        amount: parsedAmount,
        category: formData.donationCategory,
        donor_name: formData.donor_name, // Even though not directly in PB schema for donations, we pass if backend webhook handles it or if added to notes
        donation_date: formattedDate,
        notes: `Donor: ${formData.donor_name} | Email: ${formData.donor_email} | Contact: ${formData.donor_phone} | TXN: ${formData.transactionId}`,
        special_occasion: formData.specialOccasion,
        status: 'pending',
        payment_status: 'pending'
      };

      if (currentUser?.id) {
        payload.user = currentUser.id;
      }

      await createRecord('donations', payload);
      
      setSuccessData({
        amount: parsedAmount,
        date: formattedDate.split(' ')[0],
        templeName: 'Sri Siththi Vinayagar Tempel Kultur Verein e.V',
        status: 'Pending Approval'
      });

      setFormData({
        ...initialFormState,
        donor_name: currentUser?.name || '',
        donor_email: currentUser?.email || '',
        donor_phone: currentUser?.phone || ''
      });
      toast.success('Donation submitted successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to submit donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{t('donation.title', 'Donate')} | {t('nav.templeName', 'Sri Siththi Vinayagar Tempel')}</title>
      </Helmet>

      <Header />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        <UnifiedDashboardSidebar />
        
        <main className="flex-1 p-fluid min-w-0">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-4 sm:mb-6 shadow-sm shrink-0">
                <HeartHandshake className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h1 className="text-fluid-h1 text-foreground mb-3 sm:mb-4">
                {t('donation.sacredContributions', 'Sacred Contributions')}
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
                {t('donation.sacredContributionsDesc', 'Support the temple activities and receive divine blessings.')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start min-w-0">
              
              <div className="lg:col-span-7 flex flex-col min-w-0">
                <Card className="border-border shadow-lg rounded-2xl overflow-hidden flex-1 bg-card min-w-0">
                  <div className="h-1 sm:h-2 bg-primary w-full shrink-0"></div>
                  <CardHeader className="pb-4 pt-5 sm:pt-6 px-4 sm:px-8 bg-card min-w-0">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-foreground truncate">{t('donation.details', 'Donation Details')}</CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-1 text-pretty">{t('donation.detailsDesc', 'Please fill in your details below')}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-8 pb-6 sm:pb-8 bg-card min-w-0">
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                      
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="donationCategory" className="text-foreground font-semibold text-sm sm:text-base">{t('donation.category', 'Category')} <span className="text-destructive">*</span></Label>
                        <Select value={formData.donationCategory} onValueChange={handleCategoryChange} required>
                          <SelectTrigger className={`bg-background border-input focus:ring-2 focus:ring-ring h-11 sm:h-12 text-sm sm:text-base text-foreground w-full ${errors.donationCategory ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder={t('donation.selectCategory', 'Select a category')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Annadhanam">Annadhanam (Food Donation)</SelectItem>
                            <SelectItem value="Temple Maintenance">Temple Maintenance</SelectItem>
                            <SelectItem value="Goshala">Goshala (Cow Shelter)</SelectItem>
                            <SelectItem value="Veda Pathshala">Veda Pathshala (Education)</SelectItem>
                            <SelectItem value="General Temple Fund">General Temple Fund</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.donationCategory && <p className="text-sm text-destructive">{errors.donationCategory}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <Label htmlFor="donor_name" className="text-foreground font-semibold text-sm sm:text-base">{t('donation.fullName', 'Full Name')} <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                            <Input 
                              id="donor_name" 
                              name="donor_name" 
                              value={formData.donor_name} 
                              onChange={handleInputChange} 
                              required 
                              className={`pl-9 sm:pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring h-11 w-full text-foreground text-sm sm:text-base ${errors.donor_name ? 'border-destructive' : ''}`}
                            />
                          </div>
                          {errors.donor_name && <p className="text-sm text-destructive">{errors.donor_name}</p>}
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <Label htmlFor="donor_email" className="text-foreground font-semibold text-sm sm:text-base">{t('donation.email', 'Email')} <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                            <Input 
                              id="donor_email" 
                              name="donor_email" 
                              type="email" 
                              value={formData.donor_email} 
                              onChange={handleInputChange} 
                              required 
                              className={`pl-9 sm:pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring h-11 w-full text-foreground text-sm sm:text-base ${errors.donor_email ? 'border-destructive' : ''}`}
                            />
                          </div>
                          {errors.donor_email && <p className="text-sm text-destructive">{errors.donor_email}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <Label htmlFor="donor_phone" className="text-foreground font-semibold text-sm sm:text-base">{t('donation.contact', 'Contact Number')}</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                            <Input 
                              id="donor_phone" 
                              name="donor_phone" 
                              type="tel"
                              value={formData.donor_phone} 
                              onChange={handleInputChange} 
                              className={`pl-9 sm:pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring h-11 w-full text-foreground text-sm sm:text-base ${errors.donor_phone ? 'border-destructive' : ''}`}
                            />
                          </div>
                          {errors.donor_phone && <p className="text-sm text-destructive">{errors.donor_phone}</p>}
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <Label htmlFor="specialOccasion" className="text-foreground font-semibold text-sm sm:text-base">{t('donation.occasion', 'Special Occasion')}</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                            <Input 
                              id="specialOccasion" 
                              name="specialOccasion" 
                              value={formData.specialOccasion} 
                              onChange={handleInputChange} 
                              placeholder="e.g. Birthday"
                              className={`pl-9 sm:pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring h-11 w-full text-foreground text-sm sm:text-base ${errors.specialOccasion ? 'border-destructive' : ''}`}
                            />
                          </div>
                          {errors.specialOccasion && <p className="text-sm text-destructive">{errors.specialOccasion}</p>}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border/50 min-w-0">
                        <Label htmlFor="amount" className="text-foreground font-semibold text-sm sm:text-base block">{t('donation.amount', 'Amount')} <span className="text-destructive">*</span></Label>
                        <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
                          {[51, 101, 501].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setQuickAmount(amt)}
                              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 flex-1 sm:flex-none whitespace-nowrap ${
                                formData.amount === amt.toString() 
                                  ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20 scale-[0.98]' 
                                  : 'bg-background text-foreground border-input hover:border-primary hover:text-primary hover:bg-muted'
                              }`}
                            >
                              €{amt}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 font-bold text-lg sm:text-xl text-muted-foreground shrink-0">€</span>
                          <Input 
                            id="amount" 
                            name="amount" 
                            type="number" 
                            min="1"
                            step="0.01"
                            value={formData.amount} 
                            onChange={handleInputChange} 
                            required 
                            placeholder={t('donation.customAmount', 'Custom Amount')}
                            className={`pl-8 sm:pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring font-bold text-lg sm:text-xl h-12 sm:h-14 w-full text-foreground shadow-sm ${errors.amount ? 'border-destructive' : ''}`}
                          />
                        </div>
                        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                      </div>

                      <div className="space-y-2 pt-4 border-t border-border/50 min-w-0">
                        <Label htmlFor="transactionId" className="text-foreground font-semibold text-sm sm:text-base block">{t('donation.transactionId', 'Transaction ID')} <span className="text-destructive">*</span></Label>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 text-pretty">Please complete the payment using the details on the right first, then enter the reference ID here.</p>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                          <Input 
                            id="transactionId" 
                            name="transactionId" 
                            value={formData.transactionId} 
                            onChange={handleInputChange} 
                            required 
                            placeholder={t('donation.transactionIdPlaceholder', 'Bank Reference / Transaction ID')}
                            className={`pl-9 sm:pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring font-mono text-sm sm:text-base h-11 sm:h-12 w-full text-foreground ${errors.transactionId ? 'border-destructive' : ''}`}
                          />
                        </div>
                        {errors.transactionId && <p className="text-sm text-destructive">{errors.transactionId}</p>}
                      </div>

                      <div className="pt-4 sm:pt-6">
                        <Button 
                          type="submit" 
                          disabled={loading} 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 sm:py-7 text-base sm:text-lg font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                        >
                          {loading ? (
                            <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin shrink-0" /> Processing...</>
                          ) : (
                            t('donation.submit', 'Submit Donation')
                          )}
                        </Button>
                      </div>

                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-5 flex flex-col space-y-6 min-w-0">
                
                {loadingPayment ? (
                  <Card className="border-border shadow-sm rounded-2xl bg-card min-w-0">
                    <CardHeader>
                      <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                      <div className="space-y-3 sm:space-y-4">
                        <Skeleton className="h-10 sm:h-12 w-full rounded-xl" />
                        <Skeleton className="h-10 sm:h-12 w-full rounded-xl" />
                        <Skeleton className="h-10 sm:h-12 w-full rounded-xl" />
                      </div>
                      <div className="flex justify-center pt-4 border-t border-border/50">
                        <Skeleton className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl" />
                      </div>
                    </CardContent>
                  </Card>
                ) : paymentError ? (
                  <Card className="border-destructive/20 shadow-md rounded-2xl bg-card min-w-0">
                    <CardContent className="p-6 sm:p-8 text-center min-h-[250px] flex flex-col items-center justify-center min-w-0">
                      <p className="text-destructive mb-4 font-medium text-sm sm:text-base">{paymentError}</p>
                      <Button variant="outline" onClick={fetchPaymentAccount}>Retry</Button>
                    </CardContent>
                  </Card>
                ) : !paymentAccount ? (
                  <Card className="border-border shadow-sm rounded-2xl bg-card min-w-0">
                    <CardContent className="p-6 sm:p-8 text-center min-h-[250px] flex flex-col items-center justify-center min-w-0">
                      <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-4 opacity-50 shrink-0" />
                      <p className="text-muted-foreground font-medium text-base sm:text-lg">No payment account configured yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="min-w-0 w-full">
                     <PaymentAccountDetails 
                      paymentAccount={paymentAccount} 
                      disableAutoFetch={true}
                      layout="vertical" 
                    />
                  </div>
                )}

                <Card className="bg-secondary/30 border-secondary shadow-sm rounded-2xl min-w-0">
                  <CardContent className="p-4 sm:p-6 min-w-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="bg-secondary p-1.5 sm:p-2 rounded-lg text-secondary-foreground shrink-0 mt-0.5">
                        <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground mb-1 text-sm sm:text-base truncate">
                          {t('donation.importantNote', 'Important Note')}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-pretty">
                          Please ensure you have completed the bank transfer or scanned the QR code to pay before submitting this form. Your donation receipt will be generated once the payment is verified by our administration team.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </main>
      </div>

      <Footer />

      <DonationSuccessModal 
        isOpen={!!successData} 
        onClose={() => setSuccessData(null)} 
        donationData={successData} 
      />
    </div>
  );
};

export default TempleDonatePage;