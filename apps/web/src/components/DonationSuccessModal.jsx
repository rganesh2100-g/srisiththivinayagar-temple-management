import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Building2, CreditCard, Activity } from 'lucide-react';

const DonationSuccessModal = ({ isOpen, onClose, donationData }) => {
  const navigate = useNavigate();

  if (!donationData) return null;

  const handleClose = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-md text-center p-6 sm:p-8 rounded-3xl mx-auto">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 ring-4 ring-background shrink-0">
          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-3 text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
            Donation Submitted
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground text-center leading-relaxed text-pretty">
            Thank you for your generous contribution. Your donation details have been recorded and are pending verification.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-2xl p-5 my-6 text-left space-y-4 border border-border/50">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
              <Building2 className="w-4 h-4" /> Temple
            </span>
            <span className="text-sm font-medium text-foreground text-right truncate" title={donationData.templeName}>
              {donationData.templeName}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
              <CreditCard className="w-4 h-4" /> Amount
            </span>
            <span className="text-base font-bold text-foreground">
              €{parseFloat(donationData.amount).toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
              <Calendar className="w-4 h-4" /> Date
            </span>
            <span className="text-sm font-medium text-foreground">
              {donationData.date}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
              <Activity className="w-4 h-4" /> Status
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {donationData.status}
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-center mt-2">
          <Button 
            onClick={handleClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-2.5 sm:py-3 h-auto text-base sm:text-lg font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] w-full"
          >
            Return to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DonationSuccessModal;