import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react';

const BookingModal = ({ isOpen, onClose, pooja }) => {
  const navigate = useNavigate();

  if (!pooja) return null;

  const handleProceed = () => {
    onClose();
    navigate(`/checkout/${pooja.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-background text-foreground p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary font-serif">
            Book {pooja.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            You will be redirected to our secure checkout process to select your preferred date, time, and complete the booking.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <CalendarIcon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Ready to book?</h3>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            The booking process takes just a few minutes. You'll need to provide participant details and a transaction ID for the donation.
          </p>
        </div>

        <DialogFooter className="flex sm:justify-between gap-3 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleProceed}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;