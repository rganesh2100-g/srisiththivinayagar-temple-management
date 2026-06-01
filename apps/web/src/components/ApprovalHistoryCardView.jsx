import React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, CreditCard, User, Mail, Phone, Hash, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import MessageThread from '@/components/MessageThread.jsx';

const ApprovalHistoryCardView = ({ data, poojasMap, messagesMap }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((booking) => {
        const poojaName = poojasMap[booking.pooja_id]?.name || booking.expand?.pooja?.name || 'Unknown Pooja';
        const messages = messagesMap[booking.id] || [];
        const hasMessages = messages.length > 0;

        return (
          <Card key={booking.id} className="flex flex-col overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 bg-card">
            <CardHeader className="pb-4 border-b border-border/40 bg-muted/10">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground leading-tight mb-1">{poojaName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-background px-2 py-0.5 rounded-md border border-border/50 w-fit">
                    <Hash className="w-3 h-3" /> {booking.transaction_id || 'N/A'}
                  </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3" /> Confirmed
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-5 flex-1 space-y-5">
              {/* Devotee Info */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{booking.expand?.user?.name || 'Unknown User'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground pl-1">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{booking.expand?.user?.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground pl-1">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{booking.expand?.user?.phone || 'No phone'}</span>
                </div>
              </div>

              <div className="h-px w-full bg-border/40" />

              {/* Schedule & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary/70" />
                    {booking.pooja_date ? format(new Date(booking.pooja_date), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {booking.time_slot}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Donation</span>
                  <div className="flex items-center gap-1.5 text-lg font-bold text-foreground">
                    <CreditCard className="w-4 h-4 text-primary/70" />
                    €{booking.donation_amount}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Approved: {format(new Date(booking.updated), 'MMM dd')}
                  </div>
                </div>
              </div>
            </CardContent>

            {hasMessages && (
              <CardFooter className="p-0 border-t border-border/40 bg-muted/5 mt-auto">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="messages" className="border-none">
                    <AccordionTrigger className="px-5 py-3 hover:bg-muted/20 text-sm font-medium transition-colors hover:no-underline">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        View Messages ({messages.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-2 border-t border-border/40 bg-background">
                      <MessageThread messages={messages} currentUserRole="admin" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default ApprovalHistoryCardView;