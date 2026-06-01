import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, Send, FileText } from 'lucide-react';

const ResendReceiptModal = ({ 
  isOpen, 
  onClose, 
  onSend, 
  isLoading, 
  defaultEmail = '',
  defaultSubject = 'Receipt for your donation',
  defaultMessage = 'Thank you for your generous donation. Please find your receipt attached.'
}) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includePdf, setIncludePdf] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail || '');
      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setIncludePdf(true);
      setError('');
    }
  }, [isOpen, defaultEmail, defaultSubject, defaultMessage]);

  const validateEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    setError('');
    await onSend({
      recipientEmail: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      includePdf
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send Custom Email
          </DialogTitle>
          <DialogDescription>
            Send a custom email message to the user, optionally including their receipt PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-email">Recipient Email <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="receipt-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className={`pl-10 text-foreground ${error && !email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject <span className="text-destructive">*</span></Label>
            <Input
              id="email-subject"
              type="text"
              placeholder="Receipt for your transaction"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (error) setError('');
              }}
              className={`text-foreground ${error && !subject ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-message">Message Body</Label>
            <Textarea
              id="email-message"
              placeholder="Write your custom message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] text-foreground resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="include-pdf" 
              checked={includePdf} 
              onCheckedChange={setIncludePdf}
              disabled={isLoading}
            />
            <Label 
              htmlFor="include-pdf" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              Include Receipt PDF Attachment
            </Label>
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading || !email.trim() || !subject.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Send Email</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResendReceiptModal;