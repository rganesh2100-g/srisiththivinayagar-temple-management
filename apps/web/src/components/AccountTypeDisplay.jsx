import React from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Crown, User } from 'lucide-react';

const AccountTypeDisplay = () => {
  const { currentUser } = useAuth();
  const isPremium = currentUser?.account_type === 'Premium Membership' || currentUser?.membership_type === 'premium';

  return (
    <Card className={`border-border/50 shadow-sm rounded-2xl ${isPremium ? 'bg-primary/5 border-primary/20' : 'bg-card hover:shadow-md transition-shadow'}`}>
      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${isPremium ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {isPremium ? <Crown className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">{isPremium ? 'Premium Member' : 'Free Member'}</h3>
            <p className="text-sm text-muted-foreground">
              {isPremium 
                ? 'You have full access to all premium features and priority bookings.' 
                : 'Upgrade to premium for exclusive features and priority access.'}
            </p>
          </div>
        </div>
        {!isPremium && (
          <Link to="/membership-selection" className="shrink-0">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all active:scale-[0.98]">
              Upgrade
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountTypeDisplay;