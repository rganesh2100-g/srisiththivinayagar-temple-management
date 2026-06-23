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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Hash, Loader2, User, Info, AlertTriangle, CreditCard, Building2, Mail, QrCode, Phone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/lib/logger.js';

const PaymentSubscriptionPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const signupData = location.state || {};
  
  const isLoggedIn = !!currentUser;
  const email = isLoggedIn ? (currentUser.email || '') : (signupData.email || '');
  const password = signupData.password || '';
  const full_name = isLoggedIn ? (currentUser.full_name || currentUser.name || '') : (signupData.full_name || '');
  const contact_number = isLoggedIn ? (currentUser.phone || '') : (signupData.contact_number || '');
  const subscriptionAmount = signupData.amount || signupData.subscriptionAmount || (signupData.premiumPlan === 'Yearly' ? 120.00 : 10.00);
  const billingCycle = signupData.billingCycle || signupData.premiumPlan || 'Monthly';

  const [transactionReference, setTransactionReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [missingData, setMissingData] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    if (!isLoggedIn && (!email || !password || !full_name)) {
      setMissingData(true);
      setError('Missing signup information. Please complete the signup process first.');
      logger.error('Missing signup data', { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasFullName: !!full_name 
      });
    }
  }, [isLoggedIn, email, password, full_name]);

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
      let userId = isLoggedIn ? currentUser.id : null;

      if (!isLoggedIn) {
        // STEP 1 - Check/Create User (only for new signups)
        try {
          await pb.collection('users').getFirstListItem(
            `email = "${email.trim()}"`,
            { $autoCancel: false }
          );
        } catch (err) {
          try {
            const newUser = await pb.collection('users').create({
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
            userId = newUser.id;
          } catch (createErr) {
            setError('Failed to create account. Please try again.');
            toast.error('Failed to create account.');
            setLoading(false);
            return;
          }
        }

        // Auth the newly created/existing user
        try {
          await pb.collection('users').authWithPassword(email.trim(), password, { $autoCancel: false });
          await pb.collection('users').authRefresh({ $autoCancel: false });
          userId = pb.authStore.model.id;
        } catch (authErr) {
          toast.error('Authentication failed. Cannot proceed with subscription creation.');
          setError('Authentication failed. Cannot proceed with subscription creation.');
          setLoading(false);
          return;
        }
      }

      // STEP 2 - Create pending subscription
      const subscriptionPayload = {
        user_id: userId,
        email: email.trim(),
        full_name: full_name.trim(),
        contact_number: contact_number ? contact_number.trim() : '',
        subscription_type: billingCycle,
        amount: subscriptionAmount,
        transaction_id: txRef.trim(),
        status: 'pending'
      };
      
      const endpointUrl = '/pending-subscriptions/create';
      
      logger.info('Sending pending subscription payload to API:', subscriptionPayload);
      
      try {
        if (!subscriptionPayload.user_id || !subscriptionPayload.email) {
          throw new Error('Missing required subscription data');
        }

        const response = await apiServerClient.fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subscriptionPayload)
        });

        logger.info('API response status:', response.status);

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error(`Server returned ${response.status}. Please try again or contact support.`);
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || data.error || 'Failed to create pending subscription');
        }
        
        setTransactionReference('');
        setSubmitted(true);
        setSubmittedData({
          full_name: full_name.trim(),
          email: email.trim(),
          contact_number: contact_number ? contact_number.trim() : '',
          subscription_type: billingCycle,
          amount: subscriptionAmount,
          transaction_id: txRef.trim(),
          status: 'Pending',
          date: data.created || new Date().toISOString(),
        });
        toast.success('Your upgrade request has been submitted for review.');
        
      } catch (err) {
        logger.error('Submission failed:', err);
        
        const errorMessage = err.message || 'Failed to process payment';
        setError(errorMessage);
        toast.error(errorMessage);
      }

    } catch (outerErr) {
      logger.error('Account creation failed:', outerErr);
      setError(outerErr.message || 'Failed to complete account creation. Please try again.');
      toast.error('Account creation failed', { description: outerErr.message });
    } finally {
      setLoading(false);
    }
  };

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

  if (submitted && submittedData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Submission Successful | Temple Portal</title>
        </Helmet>
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-2xl space-y-8">
            <Card className="border-green-200/50 shadow-xl overflow-hidden rounded-2xl bg-card">
              <div className="h-1.5 bg-green-500 w-full" />
              <CardHeader className="text-center space-y-2 pb-6 bg-green-50/50">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-green-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Submission Successful!
                </CardTitle>
                <CardDescription className="text-base text-green-700 font-medium">
                  Your premium membership request has been received
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl space-y-4">
                  <h3 className="text-lg font-bold text-green-900 text-center">Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-green-100">
                      <span className="text-sm text-green-700 font-medium">Full Name</span>
                      <span className="text-sm font-semibold text-green-900">{submittedData.full_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-green-100">
                      <span className="text-sm text-green-700 font-medium">Email</span>
                      <span className="text-sm font-semibold text-green-900">{submittedData.email}</span>
                    </div>
                    {submittedData.contact_number && (
                      <div className="flex justify-between items-center py-2 border-b border-green-100">
                        <span className="text-sm text-green-700 font-medium">Contact Number</span>
                        <span className="text-sm font-semibold text-green-900">{submittedData.contact_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-green-100">
                      <span className="text-sm text-green-700 font-medium">Plan</span>
                      <span className="text-sm font-semibold text-green-900">Premium {submittedData.subscription_type}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-green-100">
                      <span className="text-sm text-green-700 font-medium">Amount</span>
                      <span className="text-sm font-semibold text-green-900">€{submittedData.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-green-100">
                      <span className="text-sm text-green-700 font-medium">Transaction ID</span>
                      <span className="text-sm font-mono font-semibold text-green-900">{submittedData.transaction_id}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-green-700 font-medium">Status</span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold">
                        {submittedData.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-lg font-bold text-green-900">
                    Your Submission Successful
                  </p>
                  <p className="text-base text-green-700">
                    Admin will approve. Thanks for contributing for Temple development.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={() => navigate('/')}
                    className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                  >
                    Go to Home
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    View Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <p className="text-sm font-bold text-blue-900">{isLoggedIn ? 'Upgrading Account' : 'Creating Account For'}</p>
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
                          className="flex-1 h-11 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay Via Direct Link
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
                        'Submit for Upgrade'
                      )}
                    </Button>
                  </div>
                </form>

                {!isLoggedIn && (
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
                )}
              </CardContent>
            </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSubscriptionPage;
