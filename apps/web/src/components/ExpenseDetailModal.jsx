import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Tag, Hash, FileText, ExternalLink, Image as ImageIcon, AlertCircle, Loader2, Mail, Send, User, CreditCard } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import { toast } from 'sonner';

const ExpenseDetailModal = ({ isOpen, onClose, expense }) => {
  // 1. ALL useState hooks
  const [fullExpense, setFullExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 2. Data Fetching Effect
  useEffect(() => {
    if (isOpen && expense?.id) {
      setLoading(true);
      setError(null);
      
      // Fetch fresh, full record
      pb.collection('expenses').getOne(expense.id, {
        expand: 'category_id',
        $autoCancel: false
      })
      .then(record => {
        setFullExpense(record);
        setLoading(false);
      })
      .catch(err => {
        console.error('[DEBUG] Error fetching full expense details:', err);
        setError('Failed to load full expense details.');
        setLoading(false);
      });
    } else {
      setFullExpense(null);
      setIsEmailModalOpen(false);
      setEmailRecipient('');
    }
  }, [isOpen, expense]);

  // 3. Safe derivations (must not throw even if expense is null)
  const displayData = fullExpense || expense;
  
  const rawBillFile = displayData?.bill_file;
  const fallbackFile = displayData?.image || displayData?.attachment || displayData?.receipt_image || displayData?.file || null;
  const rawFieldValue = rawBillFile !== undefined ? rawBillFile : fallbackFile;

  const fileFilename = Array.isArray(rawFieldValue) ? rawFieldValue[0] : rawFieldValue;

  const fileUrl = (fileFilename && displayData) ? pb.files.getUrl(displayData, fileFilename) : null;
  const downloadUrl = (fileFilename && displayData) ? pb.files.getUrl(displayData, fileFilename, { download: 1 }) : null;
  const isImage = fileFilename?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  // 4. Debug Logging Effect - MUST be called before early return
  useEffect(() => {
    if (isOpen && displayData) {
      console.group('🔍 CRITICAL DEBUG: Expense Image Field Issue');
      console.log('(a) Full Expense Record:', displayData);
      console.log('(b) Raw Field Value (bill_file):', displayData.bill_file);
      console.log('    Extracted Filename (handled array/fallback):', fileFilename);
      console.log('(c) Generated File URL:', fileUrl);
      
      if (!displayData.bill_file) {
        console.warn('⚠️ WARNING: "bill_file" field is missing or empty in this record. If you uploaded a file, check PocketBase schema to ensure a "file" type field named "bill_file" exists in the "expenses" collection.');
      }
      console.groupEnd();
    }
  }, [isOpen, displayData, fileFilename, fileUrl]);

  // 5. ALL HOOKS FINISHED. Safe to perform early return.
  if (!expense) return null;

  const categoryDisplayName = displayData.expand?.category_id?.name || displayData.category || 'Unknown';
  
  const paidToStr = displayData.paid_to || 'Not specified';
  const descStr = displayData.description || 'Not specified';
  const methodStr = displayData.payment_method || 'Not specified';

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailRecipient || !emailRecipient.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await apiServerClient.fetch('/expense/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: displayData.id,
          recipientEmail: emailRecipient
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to send email');
      }

      toast.success('Expense details sent successfully.');
      setIsEmailModalOpen(false);
      setEmailRecipient('');
    } catch (err) {
      console.error('Error sending expense email:', err);
      toast.error(err.message || 'An error occurred while sending the email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadClick = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, '_blank');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="professional-dialog-content sm:max-w-[800px] gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold font-playfair text-foreground">Expense Details</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1 font-mono">
                  ID: {displayData.id}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-sm bg-muted/50 py-1.5 px-3">
                {formatDateGerman(displayData.date)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-2">
            
            {/* Details Section */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Category
                </p>
                <div className="text-base font-semibold text-foreground">
                  {loading && !fullExpense ? <Skeleton className="h-6 w-32" /> : categoryDisplayName}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Details / Paid To
                </p>
                <div className="text-sm text-foreground leading-relaxed space-y-2.5">
                  {loading && !fullExpense ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Paid To</span>
                          <span className="font-medium text-foreground">{paidToStr}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Description</span>
                          <span className="text-muted-foreground">{descStr}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Payment Method</span>
                          <span className="text-muted-foreground">{methodStr}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-5 space-y-4">
                <div>
                  <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Quantity
                  </p>
                  <div className="text-sm text-foreground">
                    {loading && !fullExpense ? <Skeleton className="h-5 w-16" /> : (displayData.quantity || '-')}
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-1.5">Total Amount</p>
                  <div className="text-3xl font-bold text-red-600 tabular-nums">
                    {loading && !fullExpense ? (
                      <Skeleton className="h-9 w-32" />
                    ) : (
                      `€${Number(displayData.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachment Section */}
            <div className="md:col-span-3 bg-muted/20 rounded-xl border border-border p-5 flex flex-col h-full min-h-[350px]">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" /> Receipt / Bill Attachment
              </h4>
              
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-background/50 rounded-lg border border-dashed border-border/60">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Loading attachment...</p>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-destructive/5 rounded-lg border border-dashed border-destructive/20 text-center p-6">
                  <AlertCircle className="w-10 h-10 text-destructive/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-destructive">{error}</p>
                </div>
              ) : !fileFilename ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-background rounded-lg border border-dashed border-border/60 p-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-base font-medium text-foreground mb-1">No attachment provided</p>
                  <p className="text-sm text-muted-foreground max-w-[250px]">
                    This expense entry was saved without a receipt or bill file.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-5">
                  <div className="flex-1 bg-background rounded-xl border border-border overflow-hidden flex items-center justify-center p-3 relative group shadow-sm min-h-[200px]">
                    {isImage ? (
                      <img 
                        src={fileUrl} 
                        alt={descStr || "Expense Receipt"} 
                        className="max-w-full max-h-[350px] object-contain rounded-md shadow-sm transition-transform duration-300 group-hover:scale-[1.02] cursor-pointer"
                        onClick={() => window.open(fileUrl, '_blank')}
                      />
                    ) : (
                      <div className="text-center p-8">
                        <FileText className="w-14 h-14 text-primary/50 mx-auto mb-4" />
                        <p className="text-base font-medium text-foreground mb-1">Document Attachment</p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[250px] mx-auto px-4 py-1 bg-muted rounded-md">
                          {fileFilename}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-auto">
                    <Button variant="outline" className="flex-1 bg-background hover:bg-muted" onClick={() => window.open(fileUrl, '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" /> Open File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="text-primary border-primary/20 hover:bg-primary/5"
                onClick={() => setIsEmailModalOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2" /> Email Details
              </Button>
              {fileFilename && (
                <Button 
                  variant="outline" 
                  className="bg-background hover:bg-muted"
                  onClick={handleDownloadClick}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              )}
            </div>
            <Button variant="secondary" onClick={onClose} className="px-8 bg-muted hover:bg-muted/80 text-foreground">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Share Expense Details
            </DialogTitle>
            <DialogDescription>
              Send a copy of this expense record and its attachment to an email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email Address</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="admin@example.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEmailModalOpen(false)} disabled={isSendingEmail}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSendingEmail || !emailRecipient}>
                {isSendingEmail ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send Email</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseDetailModal;