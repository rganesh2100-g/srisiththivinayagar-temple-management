import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, Receipt, Loader2, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signupData = location.state;

  // If accessed directly without state, redirect to signup
  if (!signupData) {
    return <Navigate to="/signup" replace />;
  }

  const { email, password, preferredLanguage, premiumPlan, customAmount } = signupData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setError('Please enter your transaction reference.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create User Account
      const userData = {
        email,
        password,
        passwordConfirm: password,
        membershipTier: 'premium',
        membership_type: 'Premium',
        preferred_language: preferredLanguage || 'Tamil',
        emailVisibility: true,
        role: 'user'
      };
      
      const newUser = await pb.collection('users').create(userData, { $autoCancel: false });

      // 2. Authenticate the newly created user
      await login(email, password);

      // 3. Create Subscription Record via API
      const today = new Date();
      const payload = {
        user: newUser.id,
        plan_type: 'premium',
        billing_cycle: premiumPlan === 'monthly' ? 'monthly' : 'yearly',
        amount: parseFloat(customAmount),
        total_amount: parseFloat(customAmount),
        transaction_id: transactionRef.trim(),
        start_date: today.toISOString(),
        status: 'pending'
      };

      const response = await apiServerClient.fetch('/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to submit subscription');
      }

      toast.success('Account & subscription created!', {
        description: 'Your request is pending admin approval.',
        duration: 5000
      });
      
      // 4. Redirect to Dashboard
      navigate('/dashboard', { state: { newlyCreated: true } });

    } catch (err) {
      console.error('Account/Subscription Creation Error:', err);
      setError(err.message || 'Failed to complete registration. Please try again.');
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Helmet>
        <title>Verify Payment - Sri Siththi Vinayagar Temple</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/signup')} className="mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign Up
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
            Complete Registration
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify your bank transfer to finalize your premium membership.
          </p>
        </div>

        <div className="space-y-8">
          {/* Payment Summary Box */}
          <Card className="shadow-md border-muted">
            <CardHeader className="bg-secondary/30 pb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Subscription Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Membership Type</span>
                    <span className="font-bold text-foreground flex items-center gap-2">
                      Premium <span className="capitalize px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{premiumPlan}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Account Email</span>
                    <span className="font-medium text-foreground">{email}</span>
                  </div>
                </div>
                
                <div className="shrink-0 bg-primary/5 p-6 rounded-2xl text-center min-w-[200px] border border-primary/20">
                  <div className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Total Due</div>
                  <div className="text-4xl font-extrabold text-foreground">€{parseFloat(customAmount).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">/{premiumPlan === 'monthly' ? 'mo' : 'yr'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Details Component */}
          <PaymentAccountDetails />

          {/* Payment Verification Form */}
          <Card className="shadow-lg border-primary/20 overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="w-6 h-6" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Payment Verification</h2>
              </div>
              <p className="text-primary-foreground/80">
                After completing the transfer, please enter your transaction reference below.
              </p>
            </div>
            
            <CardContent className="pt-8">
              <div className="bg-muted/50 p-4 rounded-xl text-sm leading-relaxed text-muted-foreground border border-border/50 flex items-start gap-3 mb-8">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p>
                  Your account will be created immediately, and premium features will unlock upon admin verification of your payment.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="transactionRef" className="text-base font-semibold text-foreground">
                    Transaction Reference / Payment Proof <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="transactionRef"
                    type="text"
                    placeholder="e.g. TXN-123456789"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    required
                    className="h-12 text-lg text-foreground focus-visible:ring-primary border-muted-foreground/30"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the reference number from your bank transfer receipt.
                  </p>
                </div>

                {error && (
                  <div className="text-sm text-destructive font-medium p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={loading || !transactionRef.trim()} 
                    className="w-full md:w-auto px-8 h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit for Admin Approval
                        <CheckCircle2 className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentPage;