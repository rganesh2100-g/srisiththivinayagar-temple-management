import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';
import { format } from 'date-fns';

const formatEuro = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
};

const PaymentDetailsModal = ({ payment, isOpen, onClose, onStatusChange, onRefresh }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingStatus, setIsProcessingStatus] = useState(null); // 'approved' or 'rejected'

  if (!payment) return null;

  const userName = payment.expand?.user?.name || payment.expand?.user?.fullName || 'Unknown User';
  const userEmail = payment.expand?.user?.email || payment.email || 'No email';
  const hasReceipt = Boolean(payment.receipt_id || payment.receipt_pdf);

  const handleGenerateReceipt = async () => {
    setIsGenerating(true);
    try {
      const response = await apiServerClient.fetch(`/admin-payments/${payment.id}/generate-receipt`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate receipt');
      }
      
      toast.success('Receipt generated successfully');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Generate receipt error:', error);
      toast.error(error.message || 'Error generating receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusAction = async (status) => {
    setIsProcessingStatus(status);
    const success = await onStatusChange(payment, status);
    setIsProcessingStatus(null);
    if (success) {
      onClose();
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground hover:bg-success/90">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Rejected</Badge>;
      default:
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">Pending</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            Review payment information and receipt status.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">User Information</h4>
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Details</h4>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-sm font-semibold text-foreground">{formatEuro(payment.total_amount || payment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan:</span>
                  <span className="text-sm capitalize font-medium text-foreground">{payment.plan_type || 'Premium'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cycle:</span>
                  <span className="text-sm capitalize font-medium text-foreground">{payment.billing_cycle || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span>{getStatusBadge(payment.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Submitted:</span>
                  <span className="text-sm font-medium text-foreground">
                    {payment.created ? format(new Date(payment.created), 'PPp') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border/50 h-full">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Receipt Status
              </h4>
              
              {hasReceipt ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Receipt ID</span>
                    <span className="text-sm font-mono font-medium text-foreground">{payment.receipt_id || payment.receipt_number || 'Available'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Generated At</span>
                    <span className="text-sm font-medium text-foreground">
                      {payment.receipt_generated_at ? format(new Date(payment.receipt_generated_at), 'PPp') : 
                       payment.receipt_sent_at ? format(new Date(payment.receipt_sent_at), 'PPp') : 
                       'Date unavailable'}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" /> Receipt Generated
                  </Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground italic">No receipt generated</p>
                  <Button 
                    onClick={handleGenerateReceipt} 
                    disabled={isGenerating} 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" /> Generate Receipt</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 flex sm:justify-between items-center">
          <Button variant="ghost" onClick={onClose} disabled={isProcessingStatus !== null}>
            Close
          </Button>
          
          {payment.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                onClick={() => handleStatusAction('rejected')}
                disabled={isProcessingStatus !== null}
              >
                {isProcessingStatus === 'rejected' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
              <Button
                className="bg-success text-success-foreground hover:bg-success/90"
                onClick={() => handleStatusAction('approved')}
                disabled={isProcessingStatus !== null}
              >
                {isProcessingStatus === 'approved' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsModal;