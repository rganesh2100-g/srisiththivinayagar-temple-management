import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CalendarClock, ShieldAlert, AlertTriangle, Hash, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import logger from '@/lib/logger.js';
import { validateUserExists } from '@/lib/userValidation.js';

const RenewalPaymentPage = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { expiryDate, isRenewalPending } = useSubscriptionStatus(currentUser);
  
  const [amount, setAmount] = useState('10.00');
  const [transactionId, setTransactionId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Current User ID:', currentUser?.id);
    
    if (!currentUser?.id) {
      toast.error('Please log in again to upgrade to premium');
      navigate('/login');
      return;
    }
    
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount < 0.01) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (!transactionId.trim() || !transactionRef.trim()) {
      toast.error('Please enter transaction ID and reference');
      return;
    }

    logger.info('Starting user validation before renewal subscription creation');
    const validation = await validateUserExists(currentUser);
    
    if (!validation.isValid) {
      logger.error('User validation failed, cannot create renewal subscription', { error: validation.error });
      toast.error(validation.error);
      return;
    }

    if (!currentUser?.email) {
      logger.error('Renewal subscription failed - missing user email', { userId: currentUser.id });
      toast.error('User email is missing. Please update your profile.');
      return;
    }

    const payload = {
      user_id: currentUser.id,
      renewal_amount: numAmount,
      status: 'pending_approval',
      transaction_id: transactionId.trim(),
      transaction_ref: transactionRef.trim()
    };

    setLoading(true);
    try {
      await pb.collection('renewals').create(payload, { $autoCancel: false });

      await pb.collection('users').update(currentUser.id, {
        approval_status: 'renewal_pending_approval'
      }, { $autoCancel: false });

      await refreshUser();
      
      toast.success('Renewal payment submitted! Pending admin approval.');
      navigate('/home');
    } catch (error) {
      logger.error('Renewal creation error', { error: error.message });
      toast.error(`Failed to submit renewal: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (isRenewalPending) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Renew Subscription | Temple Portal</title>
        </Helmet>
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="mx-auto bg-amber-100 text-amber-700 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <CalendarClock className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl text-foreground">Renewal Pending</CardTitle>
              <CardDescription>
                Your renewal request is currently awaiting administrator approval. You will regain full access once approved.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate('/home')} className="w-full">
                Return to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Renew Subscription | Temple Portal</title>
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-4xl shadow-xl border-border/50 rounded-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60 w-full" />
            <CardHeader className="text-center space-y-3 pb-6 bg-muted/20">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
                Renew Premium Subscription
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Continue your premium benefits by renewing your membership.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 space-y-6">
              {expiryDate && (
                <div className="bg-muted p-4 rounded-xl border border-border flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Current Expiry Date</p>
                    <p className="text-sm text-muted-foreground">{formatDateGerman(expiryDate)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-foreground">Payment Details</h3>
                <PaymentAccountDetails 
                  layout="vertical"
                  className="w-full"
                />
              </div>

              <Alert className="bg-amber-50 border-amber-200 border-2 rounded-xl shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <div className="ml-2">
                  <h4 className="text-base font-bold text-amber-900 mb-2">Important Note</h4>
                  <AlertDescription className="text-sm text-amber-800 leading-relaxed">
                    Please ensure you have completed the bank transfer or scanned the QR code to pay before submitting this form. Your renewal will be processed once the payment is verified by our administration team.
                  </AlertDescription>
                </div>
              </Alert>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="amount" className="text-foreground font-semibold">
                    Renewal Amount (€) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="h-12 text-lg text-foreground bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="transactionId" className="text-foreground font-semibold flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Transaction ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="transactionId"
                      type="text"
                      placeholder="e.g. TXN987654321"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      required
                      className="h-12 font-mono text-base text-foreground bg-background"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="transactionRef" className="text-foreground font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Transaction Reference <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="transactionRef"
                      type="text"
                      placeholder="e.g. REF12345"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      required
                      className="h-12 font-mono text-base text-foreground bg-background"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={loading}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !transactionId.trim() || !transactionRef.trim()}
                    className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Submit Renewal'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default RenewalPaymentPage;