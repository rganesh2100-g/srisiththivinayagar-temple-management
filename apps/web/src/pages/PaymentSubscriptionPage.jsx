import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Hash, Loader2, User, CheckCircle2, Info, AlertTriangle, CreditCard, Building2, Mail, QrCode, Phone } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/lib/logger.js';

const PaymentSubscriptionPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const signupData = location.state || {};
  
  const email = signupData.email || '';
  const password = signupData.password || '';
  const full_name = signupData.full_name || '';
  const contact_number = signupData.contact_number || '';
  const subscriptionAmount = signupData.subscriptionAmount || (signupData.premiumPlan === 'Yearly' ? 120.00 : 10.00);
  const billingCycle = signupData.premiumPlan || 'Monthly'; // Usually 'Monthly' or 'Yearly' from signup

  const [transactionReference, setTransactionReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [missingData, setMissingData] = useState(false);

  useEffect(() => {
    if (!email || !password || !full_name) {
      setMissingData(true);
      setError('Missing signup information. Please complete the signup process first.');
      logger.error('Missing signup data', { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasFullName: !!full_name 
      });
    }
  }, [email, password, full_name]);

  useEffect(() => {
    const fetchPaymentAccountData = async () => {
      try {
        const data = await pb.collection('payment_accounts').getFirstListItem('', { 
          requestKey: null,
          $autoCancel: false 
        });

        if (data) {
          if (data.qr_code) {
            const qrUrl = pb.files.getURL(data, data.qr_code);
            setQrCodeUrl(qrUrl);
          }
          if (data.payment_link) {
            setPaymentLink(data.payment_link);
          }
        }
      } catch (err) {
        logger.error('Error fetching payment account data', { error: err.message });
      }
    };

    fetchPaymentAccountData();
  }, []);

  const handlePayOnlineClick = () => {
    if (!paymentLink || paymentLink.trim() === '') {
      toast.error('Payment link is not available. Please contact support.');
      return;
    }

    try {
      window.open(paymentLink, '_blank');
    } catch (err) {
      logger.error('Error opening payment link', { error: err.message });
      toast.error('Failed to open payment link. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSubmit(transactionReference);
  };

  const executeSubmit = async (txRef) => {
    if (missingData) {
      toast.error('Cannot proceed without signup information. Please start from the signup page.');
      return;
    }
    
    if (!txRef?.trim()) {
      const errorMsg = 'Please enter the transaction reference from your bank transfer.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // STEP 1 - Check/Create User
      try {
        await pb.collection('users').getFirstListItem(
          `email = "${email.trim()}"`,
          { $autoCancel: false }
        );
      } catch (err) {
        try {
          await pb.collection('users').create({
            email: email.trim(),
            password: password,
            passwordConfirm: password,
            full_name: full_name.trim(),
            phone: contact_number ? contact_number.trim() : '',
            membership_type: 'free',
            approval_status: 'pending_approval',
            emailVisibility: true,
            role: 'user'
          }, { $autoCancel: false });
        } catch (createErr) {
          setError('Failed to create account. Please try again.');
          toast.error('Failed to create account.');
          setLoading(false);
          return;
        }
      }

      // STEP 1 (Cont) - FORCE AUTH FIRST
      try {
        await pb.collection('users').authWithPassword(email.trim(), password, { $autoCancel: false });
        // RE-VERIFY AUTH: Refresh token to ensure it's valid before creating subscription
        await pb.collection('users').authRefresh({ $autoCancel: false });
      } catch (authErr) {
        toast.error('Authentication failed. Cannot proceed with subscription creation.');
        setError('Authentication failed. Cannot proceed with subscription creation.');
        setLoading(false);
        return;
      }

      // STEP 2 & 3 - EXPLICIT PAYLOAD CONSTRUCTION for pending_subscriptions
      const subscriptionPayload = {
        user_id: pb.authStore.model.id,
        email: email.trim(),
        full_name: full_name.trim(),
        contact_number: contact_number ? contact_number.trim() : '',
        subscription_type: billingCycle,
        transaction_id: txRef.trim(),
        status: 'pending'
      };
      
      const endpointUrl = '/pending-subscriptions/create';
      
      logger.info('Sending pending subscription payload to API:', subscriptionPayload);
      
      try {
        if (!subscriptionPayload.user_id || !subscriptionPayload.email) {
          throw new Error('Missing required subscription data');
        }

        // Call the new backend endpoint
        const response = await apiServerClient.fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subscriptionPayload)
        });

        logger.info('API response status:', response.status);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || data.error || 'Failed to create pending subscription');
        }
        
        // STEP 5 - SUCCESS HANDLING
        setSuccess(true);
        setTransactionReference(''); // Clear the form
        
        toast.success('Thank you! Your payment is under review. Our admin team will verify your payment and activate your account within 24 hours.', {
          duration: 6000
        });
        
        setTimeout(() => {
          navigate('/');
        }, 8000);
        
      } catch (err) {
        logger.error('Submission failed:', err);
        
        const errorMessage = err.message || 'Failed to process payment';
        setError(errorMessage);
        toast.error(errorMessage);
        // Deliberately NOT clearing the form so the user can retry
      }

    } catch (outerErr) {
      logger.error('Account creation failed:', outerErr);
      setError(outerErr.message || 'Failed to complete account creation. Please try again.');
      toast.error('Account creation failed', { description: outerErr.message });
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Premium Subscription Payment | Temple Portal</title>
        </Helmet>
        <Header />
        
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <Card className="max-w-md w-full border-primary/20 shadow-xl rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-blue-500" />
              </div>
              <CardTitle className="text-2xl font-bold">Already Logged In</CardTitle>
              <CardDescription className="text-base pb-4">
                You are already logged in. Visit your dashboard to manage your subscription.
              </CardDescription>
              <Button onClick={() => navigate('/dashboard')} className="w-full h-12 text-base">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (missingData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Payment Verification | Temple Portal</title>
        </Helmet>
        <Header />
        
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <Card className="max-w-md w-full border-destructive/20 shadow-xl rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">Missing Signup Information</CardTitle>
              <CardDescription className="text-base pb-4">
                Please complete the signup process first before proceeding to payment verification.
              </CardDescription>
              <Button onClick={() => navigate('/signup')} className="w-full h-12 text-base">
                Go to Signup
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Payment Verification | Temple Portal</title>
      </Helmet>
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-5xl space-y-8">
          {success ? (
            <Card className="border-primary/20 shadow-xl overflow-hidden rounded-2xl bg-card">
              <div className="h-2 bg-emerald-500 w-full" />
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl font-bold">Payment Under Review!</CardTitle>
                <CardDescription className="text-base pb-4">
                  Thank you! Your payment is under review. Our admin team will verify your payment and activate your account within 24 hours. Redirecting to home...
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-xl overflow-hidden rounded-2xl bg-card">
              <div className="h-1.5 bg-primary w-full" />
              <CardHeader className="text-center space-y-2 pb-6 bg-muted/10">
                <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Payment Verification
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Complete payment and verify your transaction
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-bold text-blue-900">Creating Account For</p>
                  </div>
                  <div className="space-y-2 pl-7">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Full Name</p>
                        <p className="text-sm text-blue-900 font-semibold">{full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Email</p>
                        <p className="text-sm text-blue-900 font-semibold">{email}</p>
                      </div>
                    </div>
                    {contact_number && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-blue-700 font-medium">Contact Number</p>
                          <p className="text-sm text-blue-900 font-semibold">{contact_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Premium {billingCycle} Membership</p>
                      <p className="text-sm text-blue-700">
                        Subscription Fee: <span className="font-semibold">€{subscriptionAmount.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-1">Payment Instructions</p>
                      <p className="text-sm text-amber-700">
                        Transfer the membership fee to the bank account below. After completing the transfer, enter your transaction reference ID in the form to verify your payment.
                      </p>
                    </div>
                  </div>
                </div>

                <Card className="border-primary/20 shadow-md rounded-2xl bg-gradient-to-br from-white to-primary/5">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Bank Account Details
                    </CardTitle>
                    <CardDescription>Transfer payment to this account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bank Name</p>
                          <p className="text-base font-semibold text-gray-900">Stadt Sparkasse Nuernberg</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Name</p>
                          <p className="text-base font-semibold text-gray-900">Sri siththivinayagar temple Kultur Verein e.v</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Hash className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Number (IBAN)</p>
                          <p className="text-base font-mono font-semibold text-gray-900 break-all">
                            DE37 7605 0101 0011 512977
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Email</p>
                          <p className="text-base font-semibold text-primary break-all">srisithivinayagar.temple.ev@gmail.com</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-4">
                        <QrCode className="w-5 h-5 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">Scan to Pay</p>
                      </div>
                      <div className="flex justify-center mb-4">
                        {qrCodeUrl ? (
                          <img 
                            src={qrCodeUrl} 
                            alt="Payment QR Code" 
                            className="w-48 h-48 object-contain border-2 border-gray-300 rounded-xl"
                          />
                        ) : (
                          <div className="w-48 h-48 bg-gray-200 border-2 border-gray-300 rounded-xl flex items-center justify-center">
                            <div className="text-center">
                              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">QR Code Placeholder</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          onClick={handlePayOnlineClick}
                          disabled={!paymentLink || paymentLink.trim() === ''}
                          className="flex-1 h-11 text-base font-semibold bg-[#FF69B4] hover:bg-[#FF1493] text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay Online
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-11 text-base font-semibold border-2 border-red-500 text-red-500 hover:bg-red-50 shadow-sm transition-all"
                        >
                          <QrCode className="w-5 h-5 mr-2" />
                          SCAN TO PAY
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="bg-amber-50 border-amber-200 border-2 rounded-xl shadow-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  <div className="ml-2">
                    <h4 className="text-base font-bold text-amber-900 mb-2">Important Note</h4>
                    <AlertDescription className="text-sm text-amber-800 leading-relaxed">
                      Please ensure you have completed the bank transfer or scanned the QR code to pay before submitting this form. Your subscription receipt will be generated once the payment is verified by our administration team.
                    </AlertDescription>
                  </div>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="transactionReference" className="text-sm font-semibold flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Transaction Reference *
                    </Label>
                    <Input
                      id="transactionReference"
                      type="text"
                      placeholder="e.g. TXN987654321"
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 font-mono text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the transaction ID from your bank transfer
                    </p>
                  </div>

                  {error && (
                    <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      disabled={loading || !transactionReference?.trim()} 
                      className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Verifying & Creating Account...
                        </>
                      ) : (
                        'Verify & Create Account'
                      )}
                    </Button>
                  </div>
                </form>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                    onClick={() => navigate('/login')}
                  >
                    Login here
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSubscriptionPage;