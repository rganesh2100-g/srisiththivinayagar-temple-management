import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { 
  ArrowLeft, AlertCircle, Calendar, CreditCard, 
  User, CheckCircle2, Landmark, Hash, FileText
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const UpgradePaymentPage = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const billingCycle = location.state?.billingCycle || 'monthly';
  const amount = location.state?.amount || (billingCycle === 'monthly' ? 10 : 120);
  
  const [transactionId, setTransactionId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const isProfileComplete = currentUser && 
    currentUser.name && 
    currentUser.email && 
    currentUser.phone && 
    currentUser.address && 
    currentUser.preferred_language;

  const today = new Date();
  const endDate = new Date(today);
  if (billingCycle === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00.000Z`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Current User ID:', currentUser?.id);
    
    if (!currentUser?.id) {
      toast.error('Please log in again to upgrade to premium');
      navigate('/login');
      return;
    }
    
    if (!isProfileComplete) {
      toast.error('Please complete your profile before proceeding.');
      return;
    }
    
    if (!transactionId.trim() || !transactionRef.trim()) {
      toast.error('Please enter transaction ID and reference');
      return;
    }

    if (!currentUser.email || !currentUser.email.trim()) {
      toast.error('Email is required. Please update your profile.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        user: currentUser.id,
        user_id: currentUser.id,
        email: currentUser.email,
        amount: Number(amount),
        total_amount: Number(amount),
        plan_type: 'premium',
        billing_cycle: billingCycle,
        transaction_id: transactionId.trim(),
        transaction_ref: transactionRef.trim(),
        status: 'pending',
        start_date: formatDateForAPI(today),
        end_date: formatDateForAPI(endDate)
      };

      // 1. Create the subscription record with ALL required fields
      await pb.collection('subscriptions').create(payload, { $autoCancel: false });
      
      // 2. Create the payment record so it appears in the Admin Payments page
      await pb.collection('payments').create(payload, { $autoCancel: false });

      toast.success('Payment submitted successfully. Awaiting admin approval.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Helmet>
        <title>Payment & Verification | Temple Portal</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/membership-selection')} className="mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
            Complete Your Upgrade
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify your details and submit your payment information for admin approval.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <Card className="shadow-md border-muted">
            <CardHeader className="bg-secondary/30 pb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Profile Summary</CardTitle>
              </div>
              <CardDescription>We will use these details for your membership.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!isProfileComplete && (
                <Alert variant="destructive" className="mb-6 bg-destructive/10 text-destructive border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Profile Incomplete</AlertTitle>
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <span>Please complete your profile first to proceed with the upgrade.</span>
                    <Button variant="outline" size="sm" asChild className="bg-background text-foreground shrink-0 border-destructive/30 hover:bg-destructive/20">
                      <Link to="/my-profile">Edit Profile</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Full Name</Label>
                  <p className="font-medium text-foreground mt-1">{currentUser.name || <span className="text-destructive italic">Not provided</span>}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email Address</Label>
                  <p className="font-medium text-foreground mt-1">{currentUser.email || <span className="text-destructive italic">Not provided</span>}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Contact Number</Label>
                  <p className="font-medium text-foreground mt-1">{currentUser.phone || <span className="text-destructive italic">Not provided</span>}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Communication Preference</Label>
                  <p className="font-medium text-foreground mt-1">{currentUser.preferred_language || <span className="text-destructive italic">Not provided</span>}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Address</Label>
                  <p className="font-medium text-foreground mt-1">{currentUser.address || <span className="text-destructive italic">Not provided</span>}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-muted">
            <CardHeader className="bg-secondary/30 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Subscription Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
                <div className="w-full">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Selected Plan</span>
                    <span className="font-bold text-foreground flex items-center gap-2">
                      Premium <span className="capitalize px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{billingCycle}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium text-foreground">{formatDate(today)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="font-medium text-foreground">{formatDate(endDate)}</span>
                  </div>
                </div>
                
                <div className="shrink-0 bg-primary/5 p-6 rounded-2xl text-center min-w-[200px] border border-primary/20">
                  <div className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Total Price</div>
                  <div className="text-4xl font-extrabold text-foreground">€{amount}</div>
                  <div className="text-sm text-muted-foreground mt-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-muted">
            <CardHeader className="bg-secondary/30 pb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Payment Account Details</CardTitle>
              </div>
              <CardDescription>Please transfer the exact amount to the account below.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <PaymentAccountDetails />
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/20 overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-6 h-6" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Payment Verification</h2>
              </div>
              <p className="text-primary-foreground/80">
                After completing the transfer, please enter your transaction details below.
              </p>
            </div>
            
            <CardContent className="pt-8">
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="transactionId" className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Transaction ID <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="transactionId" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter your transaction ID" 
                    className="h-12 text-lg text-foreground focus-visible:ring-primary border-muted-foreground/30"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionRef" className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Transaction Reference <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="transactionRef" 
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Enter your payment reference" 
                    className="h-12 text-lg text-foreground focus-visible:ring-primary border-muted-foreground/30"
                    required
                  />
                </div>
              </div>
              
              <Separator className="my-8" />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full md:w-auto px-8 h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg active:scale-[0.98] transition-all"
                  disabled={!isProfileComplete || !transactionId.trim() || !transactionRef.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Admin Approval'}
                  {!isSubmitting && <CheckCircle2 className="w-5 h-5 ml-2" />}
                </Button>
              </div>
            </CardContent>
          </Card>

        </form>
      </main>
      
      <Footer />
    </div>
  );
};

export default UpgradePaymentPage;