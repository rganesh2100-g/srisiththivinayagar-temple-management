import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CalendarCheck, FileText } from 'lucide-react';

const PremiumActionCards = memo(({ onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <Card className="shadow-sm border-border/50 rounded-2xl hover:shadow-md transition-all duration-300 flex flex-col">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <CalendarCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Priority Bookings</CardTitle>
          <CardDescription>
            Manage your exclusive event and pooja reservations.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => onNavigate('/my-bookings')}>
            View Bookings
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50 rounded-2xl hover:shadow-md transition-all duration-300 flex flex-col">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-secondary-foreground" />
          </div>
          <CardTitle className="text-xl">Financial Transparency</CardTitle>
          <CardDescription>
            Access detailed temple financial reports and ledgers.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => onNavigate('/financial-transparency')}>
            View Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

PremiumActionCards.displayName = 'PremiumActionCards';
export default PremiumActionCards;