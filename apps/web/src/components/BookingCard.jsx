import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, CreditCard, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BookingCard = ({ booking }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'badge-success';
      case 'Pending Approval': return 'badge-warning';
      case 'Cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'badge-muted';
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 border-border flex flex-col h-full">
      <CardContent className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg text-foreground font-serif leading-tight line-clamp-2">
            {booking.name || 'Pooja Booking'}
          </h3>
          <span className={`badge-custom shrink-0 ml-2 ${getStatusColor(booking.booking_status)}`}>
            {booking.booking_status}
          </span>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>{booking.booking_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">€{booking.donation_amount?.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto border-t border-border/50 bg-muted/10">
        <Button asChild variant="outline" className="w-full mt-4">
          <Link to={`/booking-confirmation/${booking.id}`}>
            <Eye className="w-4 h-4 mr-2" /> View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingCard;