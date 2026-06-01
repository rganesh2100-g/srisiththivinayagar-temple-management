import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

const ReceiptViewer = ({ isOpen, onClose, receiptId, bookingId, donationId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (isOpen && (bookingId || donationId)) {
      fetchReceiptForViewing();
    } else {
      setPdfUrl(null);
    }
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, bookingId, donationId]);

  const fetchReceiptForViewing = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      let method = 'GET';
      
      if (bookingId) {
        endpoint = `/pooja-bookings/${bookingId}/receipt`;
        console.log(`[ReceiptViewer] Fetching pooja receipt from: ${endpoint}`);
      } else if (donationId) {
        endpoint = `/receipts/donations/${donationId}/generate-receipt`;
        method = 'POST';
        console.log(`[ReceiptViewer] Fetching donation receipt from: ${endpoint}`);
      } else {
        toast.error('Invalid receipt reference');
        onClose();
        return;
      }

      console.log(`[ReceiptViewer] FETCHING_PDF_FROM_BACKEND`);
      const response = await apiServerClient.fetch(endpoint, { method });
      console.log(`[ReceiptViewer] Response status: ${response.status}`);
      
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[ReceiptViewer] PDF_RECEIVED with size: ${arrayBuffer.byteLength} bytes`);
        
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        console.log(`[ReceiptViewer] PDF_BLOB_SIZE = ${blob.size}`);
        
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else if (response.status === 404) {
        toast.error('Booking or receipt not found');
        onClose();
      } else if (response.status === 500) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Failed to generate receipt - ${errorData.error || 'Internal server error'}`);
        onClose();
      } else {
        toast.error('Failed to load receipt');
        onClose();
      }
    } catch (error) {
      console.error('[ReceiptViewer] Error fetching receipt:', error);
      toast.error('Failed to load receipt');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    
    console.log(`[ReceiptViewer] PDF_DOWNLOAD_REQUESTED with ${donationId ? `donationId: ${donationId}` : `bookingId: ${bookingId}`}`);
    console.log(`[ReceiptViewer] CREATING_DOWNLOAD_LINK`);
    
    const filename = bookingId ? `Receipt-Pooja-${bookingId}.pdf` : `Receipt-Donation-${donationId}.pdf`;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log(`[ReceiptViewer] PDF_DOWNLOAD_COMPLETE`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Receipt {receiptId ? `#${receiptId}` : ''}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative bg-muted/30 rounded-md border overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading receipt document...</p>
            </div>
          ) : pdfUrl ? (
            <iframe 
              src={pdfUrl} 
              className="w-full h-full border-0" 
              title={`Receipt ${receiptId || 'Document'}`}
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>No receipt document available</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={!pdfUrl || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="w-4 h-4 mr-2" /> Download Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewer;