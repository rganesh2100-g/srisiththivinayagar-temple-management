import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import SubscriptionPaymentModal from './SubscriptionPaymentModal.jsx';

const SubscriptionStatusCard = () => {
  const { currentUser, refreshUserData } = useAuth();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // If no user, don't render
  if (!currentUser) return null;

  // Robust check for premium status using AuthContext data directly
  const isPremium = 
    currentUser.subscription_status === 'premium' || 
    currentUser.user_role === 'Premium Membership' || 
    currentUser.premium_status === 'Active' ||
    currentUser.membershipTier === 'premium' ||
    currentUser.membership_type === 'premium' ||
    currentUser.account_type === 'Premium Member';

  // Don't show for free members, they have the upgrade section
  if (!isPremium) return null;

  const expiryStr = currentUser.subscription_expiry_date;
  let daysRemaining = 0;
  let status = 'active';

  if (expiryStr) {
    const expiry = new Date(expiryStr);
    const now = new Date();
    daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) {
      status = 'expired';
    }
  } else {
    // If premium but no expiry date, flag as expired to force renewal/date setting
    status = 'expired';
    daysRemaining = -1;
  }

  const handlePaymentSuccess = async () => {
    // Refresh user data in context to get the updated expiry date
    await refreshUserData(currentUser.id);
  };

  let stateConfig = {
    badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    icon: CheckCircle2,
    title: 'Active Subscription',
    description: 'Your premium membership is active.',
    dateClass: 'text-emerald-700 font-medium',
    showRenewButton: false
  };

  if (status === 'expired') {
    stateConfig = {
      badgeClass: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
      icon: ShieldAlert,
      title: 'Subscription Expired',
      description: 'Your premium access has expired. Renew now to restore benefits.',
      dateClass: 'text-destructive font-medium',
      showRenewButton: true
    };
  } else if (daysRemaining <= 7) {
    stateConfig = {
      badgeClass: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
      icon: Clock,
      title: 'Expiring Soon',
      description: `Your subscription expires in ${daysRemaining} days.`,
      dateClass: 'text-amber-700 font-medium',
      showRenewButton: true
    };
  }

  const StateIcon = stateConfig.icon;
  const amountDue = 10.00; // Default renewal amount

  return (
    <>
      <Card className={`border-border/50 shadow-sm overflow-hidden transition-all duration-300 ${status === 'expired' ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
        <div className="px-6 py-4 border-b border-border/50 bg-card flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Subscription Status
          </h2>
          <Badge className={stateConfig.badgeClass}>
            {status === 'expired' ? 'Expired' : daysRemaining <= 7 ? 'Expiring Soon' : 'Active'}
          </Badge>
        </div>
        
        <CardContent className="p-6 bg-card">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${status === 'expired' ? 'bg-destructive/10 text-destructive' : daysRemaining <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <StateIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{stateConfig.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{stateConfig.description}</p>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Renewal Date:</span>
                    <span className={stateConfig.dateClass}>
                      {expiryStr ? formatDateGerman(expiryStr) : 'Action Required'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Amount Due:</span>
                    <span className="font-medium text-foreground">€{amountDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {stateConfig.showRenewButton && (
              <div className="w-full md:w-auto shrink-0">
                <Button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98]"
                >
                  Renew Subscription
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SubscriptionPaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        defaultAmount={amountDue}
      />
    </>
  );
};

export default SubscriptionStatusCard;