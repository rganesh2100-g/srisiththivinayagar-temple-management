import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, MessageSquare, CheckCircle2, Calendar, CreditCard, Hash } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import MessageThread from '@/components/MessageThread.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const ApprovalHistoryListView = ({ data, poojasMap, messagesMap }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-border/60">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="font-semibold text-foreground">Pooja Details</TableHead>
            <TableHead className="font-semibold text-foreground">Devotee</TableHead>
            <TableHead className="font-semibold text-foreground">Schedule</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Amount</TableHead>
            <TableHead className="font-semibold text-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((booking) => {
            const isExpanded = expandedRows.has(booking.id);
            const poojaName = poojasMap[booking.pooja_id]?.name || booking.expand?.pooja?.name || 'Unknown Pooja';
            const messages = messagesMap[booking.id] || [];
            const hasMessages = messages.length > 0;

            return (
              <React.Fragment key={booking.id}>
                <TableRow 
                  className={`group cursor-pointer transition-colors border-border/40 ${isExpanded ? 'bg-muted/20' : 'hover:bg-muted/30'}`}
                  onClick={() => hasMessages && toggleRow(booking.id)}
                >
                  <TableCell className="py-4">
                    {hasMessages ? (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    ) : (
                      <div className="w-6 h-6" />
                    )}
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <div className="font-medium text-foreground">{poojaName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Hash className="w-3 h-3" /> {booking.transaction_id || 'N/A'}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <div className="font-medium text-foreground">{booking.expand?.user?.name || 'Unknown User'}</div>
                    <div className="text-xs text-muted-foreground">{booking.expand?.user?.email || 'No email'}</div>
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {booking.pooja_date ? format(new Date(booking.pooja_date), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      {booking.time_slot}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4 text-right">
                    <div className="font-medium text-foreground flex items-center justify-end gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      €{booking.donation_amount}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        on {format(new Date(booking.updated), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                
                <AnimatePresence>
                  {isExpanded && hasMessages && (
                    <TableRow className="bg-muted/10 hover:bg-muted/10 border-border/40">
                      <TableCell colSpan={6} className="p-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 pl-14 border-l-2 border-primary/30 ml-4 my-2">
                            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-primary" />
                              Communication History
                            </h4>
                            <div className="max-w-3xl bg-background rounded-xl border border-border/50 p-4 shadow-sm">
                              <MessageThread messages={messages} currentUserRole="admin" />
                            </div>
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApprovalHistoryListView;