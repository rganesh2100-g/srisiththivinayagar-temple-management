import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Loader2, Receipt, CreditCard, ShieldCheck, Hash, FileText } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const PaymentSummaryPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [transactionId, setTransactionId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PREMIUM_AMOUNT = 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!transactionId.trim() || !transactionRef.trim()) {
      toast.error('Please enter transaction ID and reference');
      return;
    }

    if (!currentUser?.id) {
      toast.error('User session not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        user: currentUser.id,
        plan_type: 'premium',
        amount: PREMIUM_AMOUNT,
        total_amount: PREMIUM_AMOUNT,
        transaction_id: transactionId.trim(),
        transaction_ref: transactionRef.trim(),
        status: 'pending',
        billing_cycle: 'monthly'
      };

      await pb.collection('subscriptions').create(payload, { $autoCancel: false });

      toast.success('Premium membership request submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Premium membership error:', error);
      toast.error(error.message || 'An error occurred while submitting your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Helmet>
        <title>Payment Summary | Temple Portal</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-lg shadow-xl border-border/50">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Payment Summary
            </CardTitle>
            <CardDescription className="text-base">
              Complete your premium membership registration
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Membership Type</span>
                <span className="font-semibold text-foreground">Premium</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Amount Due</span>
                <span className="text-2xl font-bold text-primary">€{PREMIUM_AMOUNT.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Please transfer the amount to the temple's bank account and enter the transaction details below for verification.
              </p>
            </div>

            <form id="payment-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="transactionId" 
                    placeholder="Enter transaction ID" 
                    className="pl-10"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionRef">Transaction Reference <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="transactionRef" 
                    placeholder="Enter transaction reference" 
                    className="pl-10"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    required
                  />
                </div>
              </div>
            </form>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              form="payment-form"
              className="w-full h-12 text-base font-medium" 
              disabled={isSubmitting || !transactionId.trim() || !transactionRef.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Complete Premium Signup'
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default PaymentSummaryPage;