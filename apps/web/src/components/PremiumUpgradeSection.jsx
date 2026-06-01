import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown } from 'lucide-react';

const PremiumUpgradeSection = ({ onUpgradeClick }) => {
  const benefits = [
    'Access to Temple Accounts (Income/Expense transparency)',
    'Priority Pooja Booking',
    'Exclusive Monthly Newsletter',
    'VIP seating during major festivals',
    'Free prasadam delivery on special occasions'
  ];

  return (
    <Card className="border-2 border-[#FFD700]/50 bg-gradient-to-br from-white to-[#FFD700]/10 shadow-md overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/20 rounded-bl-full -z-10"></div>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#FFD700]/20 rounded-lg">
            <Crown className="w-6 h-6 text-[#8B0000]" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#8B0000]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Upgrade to Premium Account
          </CardTitle>
        </div>
        <CardDescription className="text-gray-600 text-base">
          Enhance your spiritual journey and support the temple by becoming a Premium Member.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Premium Benefits</h4>
          <ul className="space-y-2.5">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-0.5 bg-[#8B0000]/10 p-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5 text-[#8B0000]" />
                </div>
                <span className="text-gray-700 text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <Button 
          onClick={onUpgradeClick} 
          className="w-full sm:w-auto bg-gradient-to-r from-[#8B0000] to-[#CC2222] hover:from-[#630330] hover:to-[#8B0000] text-white shadow-md transition-all duration-300"
        >
          Upgrade Now - €120/Year
        </Button>
      </CardContent>
    </Card>
  );
};

export default PremiumUpgradeSection;