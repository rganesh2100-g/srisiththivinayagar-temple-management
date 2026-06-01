import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { User, Mail, ShieldCheck } from 'lucide-react';
import { useSubscriptionData } from '@/hooks/useSubscriptionData.js';
import { Skeleton } from '@/components/ui/skeleton.jsx';

const PremiumProfileSection = memo(({ userData }) => {
  const { data: subData, loading } = useSubscriptionData(userData?.id);

  return (
    <Card className="shadow-lg border-none rounded-2xl overflow-hidden bg-gradient-to-b from-[#630330] to-[#4a0224] h-full">
      <CardHeader className="pb-6 border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-xl text-primary-foreground">
          <User className="w-5 h-5" />
          Premium Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6 text-primary-foreground/90">
        <div>
          <label className="text-sm font-medium text-primary-foreground/60">Full Name</label>
          <p className="text-base font-semibold text-white mt-1">{userData?.fullName || userData?.name || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-primary-foreground/60 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email Address
          </label>
          <p className="text-base font-semibold text-white mt-1">{userData?.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-primary-foreground/60 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FFD700]" /> Account Type
          </label>
          <div className="inline-flex mt-2 items-center px-3 py-1 rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 text-sm font-medium">
            {userData?.account_type || 'Premium Member'}
          </div>
        </div>
        
        {loading ? (
          <div className="pt-4 border-t border-white/10 space-y-2">
            <Skeleton className="h-4 w-24 bg-white/20" />
            <Skeleton className="h-5 w-32 bg-white/20" />
          </div>
        ) : subData ? (
          <div className="pt-4 border-t border-white/10">
            <label className="text-sm font-medium text-primary-foreground/60">Subscription Status</label>
            <p className="text-sm font-semibold text-white mt-1 capitalize">{subData.status}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});

PremiumProfileSection.displayName = 'PremiumProfileSection';
export default PremiumProfileSection;