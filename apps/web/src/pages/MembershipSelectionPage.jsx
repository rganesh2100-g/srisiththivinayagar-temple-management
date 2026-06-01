import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Check, Sparkles, ArrowRight, Plus, Minus } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MembershipSelectionPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  // We store the base monthly amount. 
  // If user switches to yearly, we multiply by 12 for display.
  // If user increments yearly, it adds 120 to display (which is +10 to monthlyAmount).
  const [monthlyAmount, setMonthlyAmount] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayAmount = billingCycle === 'monthly' ? monthlyAmount : monthlyAmount * 12;

  const handleIncrement = () => {
    setMonthlyAmount(prev => prev + 10);
  };

  const handleDecrement = () => {
    setMonthlyAmount(prev => Math.max(10, prev - 10));
  };

  const handleChoosePremium = () => {
    if (!currentUser?.id) {
      toast.error('User session not found. Please log in again.');
      return;
    }
    
    setIsSubmitting(true);
    // Navigate to payment page with selected billing cycle and exact custom amount
    navigate('/membership-payment', { 
      state: { 
        billingCycle,
        amount: displayAmount
      } 
    });
  };

  const benefits = [
    "Access to daily poojas",
    "Temple newsletter",
    "Community events",
    "Basic spiritual guidance",
    "Temple Member access",
    "Access to important temple information"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Helmet>
        <title>Upgrade Membership | Temple Portal</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Elevate Your Experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upgrade to Premium to unlock exclusive temple services, priority bookings, and deeper engagement with our community.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <Tabs value={billingCycle} onValueChange={setBillingCycle} className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted rounded-xl">
              <TabsTrigger value="monthly" className="rounded-lg text-base font-medium">Monthly Billing</TabsTrigger>
              <TabsTrigger value="yearly" className="rounded-lg text-base font-medium">Yearly Billing</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="flex flex-col border-primary shadow-xl relative overflow-hidden bg-card transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1.5 rounded-bl-xl text-sm font-bold flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-4 h-4" /> Premium Upgrade
            </div>
            
            <CardHeader className="pt-10 text-center">
              <CardTitle className="text-3xl text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                Premium Membership
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Full access with exclusive spiritual benefits
              </CardDescription>
              
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleDecrement} 
                  disabled={monthlyAmount <= 10} 
                  className="h-12 w-12 rounded-full border-primary/30 text-primary hover:bg-primary/10 transition-all"
                  aria-label="Decrease amount"
                >
                  <Minus className="h-6 w-6" />
                </Button>
                
                <div className="flex items-end justify-center text-6xl font-extrabold text-foreground min-w-[180px]">
                  €{displayAmount}
                  <span className="ml-2 text-xl font-medium text-muted-foreground pb-1">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleIncrement} 
                  className="h-12 w-12 rounded-full border-primary/30 text-primary hover:bg-primary/10 transition-all"
                  aria-label="Increase amount"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Adjust your contribution to support the temple
              </p>
            </CardHeader>
            
            <CardContent className="flex-1 pt-6 pb-8 px-8">
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full text-primary shrink-0">
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="text-foreground font-medium text-base">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="pb-10 px-8">
              <Button 
                size="lg"
                className="w-full h-14 text-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]" 
                onClick={handleChoosePremium}
                disabled={isSubmitting}
              >
                Proceed to Payment
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MembershipSelectionPage;