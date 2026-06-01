import React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, CreditCard, User, Hash, Mail, Phone, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BookingDetailsCard = ({ booking, poojaName }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-success/10 text-success border-success/20';
      case 'Pending Approval': return 'bg-warning/10 text-warning border-warning/20';
      case 'Awaiting User Response': return 'bg-accent/10 text-accent border-accent/20';
      case 'Cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Completed': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border pb-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl font-serif text-foreground mb-1">
              {poojaName || 'Pooja Booking'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-3.5 h-3.5" />
              <span className="font-mono">{booking.id}</span>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
            {booking.status}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          
          {/* Devotee Details */}
          <div className="p-5 space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Devotee Information
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">{booking.expand?.user?.name || 'Unknown User'}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{booking.expand?.user?.email || 'No email'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{booking.expand?.user?.phone || 'No phone'}</span>
              </div>
            </div>
          </div>

          {/* Schedule & Payment */}
          <div className="p-5 space-y-4 bg-muted/5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Booking Details
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {booking.pooja_date ? format(new Date(booking.pooja_date), 'EEEE, MMMM d, yyyy') : 'N/A'}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {booking.time_slot}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 text-sm pt-2 border-t border-border/50">
                <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Donation</span>
                    <span className="font-bold text-foreground">€{booking.donation_amount?.toFixed(2)}</span>
                  </div>
                  {booking.transaction_id && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-muted-foreground text-xs">TXN ID</span>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground truncate max-w-[120px]" title={booking.transaction_id}>
                        {booking.transaction_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
        
        <div className="bg-muted/20 px-5 py-3 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
          <span>Booked on: {format(new Date(booking.created), 'MMM d, yyyy h:mm a')}</span>
          <span>Last updated: {format(new Date(booking.updated), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingDetailsCard;