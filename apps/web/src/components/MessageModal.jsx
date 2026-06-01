import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Send, User } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';

const MessageModal = ({ isOpen, onClose, booking, adminId, onSuccess }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_CHARS = 500;

  if (!booking) return null;

  const poojaName = booking.expand?.pooja_id?.pooja_name || booking.expand?.pooja_id?.name || 'Pooja';

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiServerClient.fetch('/booking-messages/send-booking-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          message: message.trim(),
          adminId: adminId,
          customerEmail: booking.email,
          customerName: booking.name,
          poojaName: poojaName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      toast.success('Message sent successfully');
      setMessage('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Send className="w-5 h-5 text-primary" />
            Message Customer
          </DialogTitle>
          <DialogDescription>
            Send an email notification directly to the customer regarding their booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{booking.name}</p>
              <p className="text-xs text-muted-foreground truncate">{booking.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="message" className="text-foreground font-medium">Your Message</Label>
              <span className={`text-xs ${message.length > MAX_CHARS ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                {message.length} / {MAX_CHARS}
              </span>
            </div>
            <Textarea
              id="message"
              placeholder="Type your message here... (e.g., requesting additional details or providing instructions)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px] resize-none focus-visible:ring-primary"
              maxLength={MAX_CHARS}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSubmitting || !message.trim() || message.length > MAX_CHARS}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageModal;