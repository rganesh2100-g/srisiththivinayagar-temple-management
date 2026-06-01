import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus.js';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Loader2, Plus, Minus, AlertTriangle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SubscriptionPaymentModal from '@/components/SubscriptionPaymentModal.jsx';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import logger from '@/lib/logger.js';

const MembershipPage = () => {
  const { currentUser, refreshUser } = useAuth();
  const { t } = useTranslation();
  
  const { 
    isPremium, 
    isApproved, 
    isPendingApproval, 
    isRenewalPending, 
    isExpired, 
    expiryDate, 
    daysUntilExpiry,
    loading: statusLoading 
  } = useSubscriptionStatus(currentUser);
  
  const [showPayment, setShowPayment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [premiumPrice, setPremiumPrice] = useState(10);

  useEffect(() => {
    setPremiumPrice(billingCycle === 'monthly' ? 10 : 120);
  }, [billingCycle]);

  const freeBenefits = [
    t('membershipPage.benefits.free1'),
    t('membershipPage.benefits.free2'),
    t('membershipPage.benefits.free3'),
    t('membershipPage.benefits.free4'),
  ];

  const premiumBenefits = [
    'Access to daily poojas',
    'Temple newsletter',
    'Community events',
    'Basic spiritual guidance',
    'Temple Member access',
    'Access to important temple information (e.g., income and expenses)',
  ];

  const handlePaymentSuccess = async () => {
    await refreshUser();
    setShowPayment(false);
  };

  const handleDowngrade = async () => {
    if (!currentUser) return;

    const confirmed = window.confirm(t('common.confirmAction'));
    if (!confirmed) return;

    setActionLoading(true);
    try {
      logger.info('Downgrading user to free membership', { userId: currentUser.id, email: currentUser.email });

      await pb.collection('users').update(currentUser.id, {
        membershipTier: 'free',
        membership_type: 'free',
        approval_status: '',
        subscription_expiry_date: ''
      }, { $autoCancel: false });

      logger.info('User downgraded successfully', { userId: currentUser.id });

      await refreshUser();
      toast.success('Membership downgraded to Free');
    } catch (error) {
      logger.error('Downgrade failed', error);
      toast.error('Downgrade failed');
    } finally {
      setActionLoading(false);
    }
  };

  const adjustPrice = (amount) => {
    const minPrice = billingCycle === 'monthly' ? 10 : 120;
    setPremiumPrice(prev => Math.max(minPrice, prev + amount));
  };

  const getStatusBadge = () => {
    if (!currentUser) return <span className="bg-muted text-foreground px-3 py-1 rounded-full text-sm font-bold">Logged Out</span>;
    if (!isPremium) return <span className="bg-muted text-foreground px-3 py-1 rounded-full text-sm font-bold">{t('membershipPage.freeMember')}</span>;
    if (isPendingApproval) return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">{t('membershipPage.pendingApproval')}</span>;
    if (isRenewalPending) return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">Renewal Pending</span>;
    if (isExpired) return <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-bold">{t('membershipPage.premiumExpired')}</span>;
    if (isApproved) return <span className="bg-[#FFD700]/20 text-[#8B0000] px-3 py-1 rounded-full text-sm font-bold">{t('membershipPage.premiumActive')}</span>;
    return null;
  };

  return (
    <>
      <Helmet>
        <title>{t('membershipPage.pageTitle')} - {t('nav.templeName')}</title>
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <section className="relative h-[30vh] min-h-[250px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1568864181749-69ab5dafc9f2"
                alt="Temple membership"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B0000]/80 to-black/70 mix-blend-multiply"></div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 text-center px-4"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('membershipPage.pageTitle')}
              </h1>
              <p className="text-lg text-[#FFD700] font-medium">{t('membershipPage.pageSubtitle')}</p>
            </motion.div>
          </section>

          <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {currentUser && !statusLoading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <p className="text-lg text-muted-foreground flex items-center justify-center gap-2">
                  {t('membershipPage.currentStatus')}
                  {getStatusBadge()}
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full shadow-md border border-border hover:shadow-lg transition-all duration-300 flex flex-col">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {t('membershipPage.freeTitle')}
                    </CardTitle>
                    <div className="text-4xl font-bold text-foreground mb-2">€0</div>
                    <CardDescription className="text-sm">{t('membershipPage.freeDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 flex flex-col">
                    <ul className="space-y-3 flex-1">
                      {freeBenefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="pt-6 mt-auto">
                      {isPremium && (
                        <Button
                          onClick={handleDowngrade}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : t('membershipPage.downgrade')}
                        </Button>
                      )}
                      {!isPremium && currentUser && (
                        <div className="text-center py-2.5 bg-muted rounded-lg border border-border">
                          <p className="text-sm font-medium text-muted-foreground">{t('membershipPage.yourPlan')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full shadow-xl border-2 border-[#FFD700] bg-gradient-to-b from-white to-[#FFD700]/5 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/20 rounded-bl-full -z-10"></div>
                  <CardHeader className="text-center pb-6 relative z-10">
                    <div className="absolute top-4 right-4">
                      <Crown className="w-6 h-6 text-[#FFD700]" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#8B0000] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {t('membershipPage.premiumTitle')}
                    </CardTitle>
                    
                    {(!isPremium || isExpired) && (
                      <div className="flex justify-center mb-4 gap-2">
                        <Button
                          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-6 py-2 h-9 rounded-md text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-[#8B0000] hover:bg-[#6b0000] text-white shadow-sm border-[#8B0000]' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                        >
                          Monthly
                        </Button>
                        <Button
                          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-6 py-2 h-9 rounded-md text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-[#8B0000] hover:bg-[#6b0000] text-white shadow-sm border-[#8B0000]' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                        >
                          Yearly
                        </Button>
                      </div>
                    )}

                    <div className="text-4xl font-bold text-foreground mb-2">
                      €{billingCycle === 'monthly' ? '10' : '120'}
                      <span className="text-base text-muted-foreground font-normal">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    <CardDescription className="text-sm">{t('membershipPage.premiumDesc')}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6 flex-1 flex flex-col relative z-10">
                    <ul className="space-y-3 flex-1">
                      {premiumBenefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-[#8B0000] mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-6 border-t border-border mt-auto space-y-4">
                      {(!isPremium || isExpired) && (
                        <div className="flex flex-col items-center gap-2">
                          <Label className="text-xs text-muted-foreground">
                            {t('membershipPage.customDonation')} (Min €{billingCycle === 'monthly' ? '10' : '120'})
                          </Label>
                          <div className="flex items-center gap-4 bg-background rounded-lg border border-border p-1 w-full max-w-[250px] mx-auto">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => adjustPrice(-10)} 
                              disabled={premiumPrice <= (billingCycle === 'monthly' ? 10 : 120)} 
                              className="h-8 w-8 text-[#8B0000] hover:bg-[#8B0000]/10 hover:text-[#8B0000]"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Input
                              type="number"
                              min={billingCycle === 'monthly' ? 10 : 120}
                              step="1"
                              value={premiumPrice}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) setPremiumPrice(val);
                              }}
                              className="h-8 text-center font-bold text-lg border-none shadow-none focus-visible:ring-0 px-0"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => adjustPrice(10)} 
                              className="h-8 w-8 text-[#8B0000] hover:bg-[#8B0000]/10 hover:text-[#8B0000]"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {statusLoading ? (
                        <Button disabled className="w-full bg-muted text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('common.loading')}
                        </Button>
                      ) : !currentUser ? (
                        <Button asChild className="w-full bg-[#8B0000] hover:bg-[#6b0000] text-white shadow-md transition-all duration-200">
                          <Link to="/login">{t('membershipPage.loginToSubscribe')}</Link>
                        </Button>
                      ) : isRenewalPending ? (
                        <Button disabled className="w-full bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed">
                          <CalendarClock className="w-4 h-4 mr-2" /> Renewal Pending
                        </Button>
                      ) : isPendingApproval ? (
                        <Button disabled className="w-full bg-muted text-muted-foreground cursor-not-allowed border border-border">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('membershipPage.pendingApproval')}
                        </Button>
                      ) : isPremium ? (
                        <div className="space-y-3">
                          <div className="text-center py-2.5 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/30">
                            {isExpired ? (
                              <p className="text-sm text-destructive font-semibold flex items-center justify-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> {t('membershipPage.premiumExpired')}
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-[#8B0000] font-semibold">{t('membershipPage.premiumActive')}</p>
                                {expiryDate && (
                                  <p className="text-xs text-[#8B0000]/80 mt-1">
                                    Valid until {formatDateGerman(expiryDate)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          
                          {(isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 7)) && (
                            <Button
                              asChild
                              className="w-full bg-[#8B0000] hover:bg-[#6b0000] text-white shadow-md transition-all duration-200"
                            >
                              <Link to="/renew-subscription">Renew Subscription</Link>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowPayment(true)}
                          className="w-full bg-[#8B0000] hover:bg-[#6b0000] text-white shadow-md transition-all duration-200"
                        >
                          {t('membershipPage.upgrade')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />
      </div>

      <SubscriptionPaymentModal 
        isOpen={showPayment} 
        onClose={() => setShowPayment(false)} 
        onSuccess={handlePaymentSuccess}
        defaultAmount={premiumPrice}
        subscriptionType={billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
      />
    </>
  );
};

export default MembershipPage;