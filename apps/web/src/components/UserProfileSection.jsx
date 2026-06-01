import React from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, User as UserIcon } from 'lucide-react';

const UserProfileSection = () => {
  const { currentUser, isAdmin, isPremium } = useAuth();

  if (!currentUser) return null;

  const displayName = currentUser.name || currentUser.email?.split('@')[0] || 'User';
  const displayEmail = currentUser.email || 'No email';

  let badgeConfig = {
    label: 'Free',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200',
    icon: UserIcon
  };

  if (isAdmin) {
    badgeConfig = {
      label: 'Admin',
      className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
      icon: Shield
    };
  } else if (isPremium) {
    badgeConfig = {
      label: 'Premium',
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200',
      icon: Crown
    };
  }

  const BadgeIcon = badgeConfig.icon;

  return (
    <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 bg-white">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-[#8B0000]/20 to-[#8B0000]/10 flex items-center justify-center shrink-0">
          <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-[#8B0000]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-bold text-gray-900 truncate">
            {displayName}
          </h3>
          <p className="text-xs md:text-sm text-gray-500 truncate">
            {displayEmail}
          </p>
        </div>
      </div>
      
      <Badge className={`w-full justify-center gap-1.5 py-1.5 text-xs md:text-sm font-semibold border ${badgeConfig.className}`}>
        <BadgeIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        {badgeConfig.label}
      </Badge>
    </div>
  );
};

export default UserProfileSection;