import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CheckCircle2, CreditCard, Hash, Mail, User } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SubscriptionThankYouPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = location.state?.isLoggedIn ?? true;
  const upgradeData = location.state?.upgradeData;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Thank You | Temple Portal</title>
      </Helmet>
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="border-primary/20 shadow-xl overflow-hidden rounded-2xl bg-card max-w-lg w-full">
          <div className="h-2 bg-emerald-500 w-full" />
          <CardContent className="p-10 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Playfair Display, serif' }}>
                Thank You
              </CardTitle>
              <p className="text-lg font-semibold text-foreground">
                God bless you.
              </p>
              <div className="w-16 h-0.5 bg-primary/30 mx-auto" />
              <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-left">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your upgrade request has been submitted to the admin team. You will receive an email notification once your payment is verified and your premium membership is upgraded.
                </p>
              </div>
              {upgradeData && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" /> Name
                    </span>
                    <span className="text-sm font-medium text-foreground text-right truncate">{upgradeData.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Plan
                    </span>
                    <span className="text-sm font-medium text-foreground capitalize">Premium {upgradeData.subscription_type}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Hash className="w-4 h-4" /> Transaction
                    </span>
                    <span className="text-sm font-mono font-medium text-foreground text-right break-all">{upgradeData.transaction_id}</span>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={() => navigate(isLoggedIn ? '/dashboard' : '/')} className="mt-2 h-12 px-8 text-base font-semibold rounded-xl">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionThankYouPage;
