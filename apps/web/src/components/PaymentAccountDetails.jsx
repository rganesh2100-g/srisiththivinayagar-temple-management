import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, User, Hash, Mail, QrCode, AlertCircle, Link as LinkIcon, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils.js';

const PaymentAccountDetails = ({ 
  className = '', 
  layout = 'horizontal', 
  disableAutoFetch = false, 
  paymentAccount = null 
}) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(!disableAutoFetch && !paymentAccount);
  const [error, setError] = useState(null);

  const isVertical = layout === 'vertical';

  const fetchConfig = useCallback(async () => {
    if (disableAutoFetch) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const records = await pb.collection('payment_accounts').getFullList({
        $autoCancel: false
      });
      
      if (!records || records.length === 0) {
        throw new Error('No active bank account configuration found. Please contact administration.');
      }
      
      const record = records[0];
      
      const qrCodeUrl = record.qr_code 
        ? pb.files.getUrl(record, record.qr_code)
        : null;

      setConfig({
        ...record,
        qrCodeUrl
      });
    } catch (err) {
      console.error('[PaymentAccountDetails] Fetch error:', err);
      setError(err.message || 'Bank account details are currently unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [disableAutoFetch]);

  useEffect(() => {
    if (paymentAccount) {
      const qrCodeUrl = paymentAccount.qr_code 
        ? pb.files.getUrl(paymentAccount, paymentAccount.qr_code)
        : null;
      setConfig({
        ...paymentAccount,
        qrCodeUrl
      });
      setLoading(false);
    } else if (!disableAutoFetch) {
      fetchConfig();
    }
  }, [paymentAccount, disableAutoFetch, fetchConfig]);

  if (loading) {
    return (
      <div className={cn("space-y-6 w-full", className)}>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden w-full">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-5">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className={cn(
              "grid gap-8 lg:gap-12",
              isVertical ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[1.5fr_1fr]"
            )}>
              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-full max-w-[300px]" />
                  </div>
                ))}
              </div>
              <div className={cn(
                "flex flex-col items-center justify-center space-y-4",
                isVertical 
                  ? "pt-8 border-t border-border/50" 
                  : "md:border-l border-border/50 md:pl-8 lg:pl-12 pt-8 md:pt-0 border-t md:border-t-0"
              )}>
                <Skeleton className="h-56 w-56 rounded-xl" />
                <Skeleton className="h-10 w-full max-w-[260px] rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !config) {
    return (
      <Card className={cn("border-destructive/20 shadow-sm rounded-2xl bg-card w-full", className)}>
        <CardContent className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="font-semibold text-xl text-foreground mb-2">Connection Error</h3>
          <p className="text-muted-foreground text-base max-w-md mb-6">
            {error || 'Failed to load bank account details.'}
          </p>
          {!disableAutoFetch && (
            <Button onClick={fetchConfig} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6 w-full", className)}>
      {/* Yellow Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed font-medium">
          Please transfer the exact subscription amount to the bank account below. You can also scan the QR code or use the payment link.
        </p>
      </div>

      <Card className="border-primary/10 shadow-lg rounded-2xl bg-card overflow-hidden w-full">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
          <CardTitle className="text-2xl font-bold text-foreground tracking-tight">
            Payment Account Details
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-1">
            Secure payment information for your transaction.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 md:p-8">
          <div className={cn(
            "grid gap-8 lg:gap-12",
            isVertical ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[1.5fr_1fr]"
          )}>
            {/* Left Column: Bank Details */}
            <div className="space-y-6 min-w-0">
              
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-muted rounded-lg text-muted-foreground shrink-0 shadow-sm border border-border/50">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Bank Name</p>
                  <p className="text-lg font-semibold text-foreground break-words">
                    {config.bank_name || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-muted rounded-lg text-muted-foreground shrink-0 shadow-sm border border-border/50">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Account Name</p>
                  <p className="text-lg font-semibold text-foreground break-words">
                    {config.account_name || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-muted rounded-lg text-muted-foreground shrink-0 shadow-sm border border-border/50">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Account Number</p>
                  <p className="text-lg font-mono font-bold text-foreground tracking-wide bg-muted/30 px-3 py-1.5 rounded-md inline-block border border-border/50 break-all">
                    {config.account_number || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-muted rounded-lg text-muted-foreground shrink-0 shadow-sm border border-border/50">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Contact Email</p>
                  {config.email ? (
                    <a 
                      href={`mailto:${config.email}`}
                      className="text-base font-medium text-primary hover:text-primary/80 hover:underline transition-colors break-all"
                    >
                      {config.email}
                    </a>
                  ) : (
                    <p className="text-base text-foreground">N/A</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 pt-4 border-t border-border/50">
                <div className="p-2.5 bg-muted rounded-lg text-muted-foreground shrink-0 shadow-sm border border-border/50">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Direct Payment Link</p>
                  {config.payment_link ? (
                    <Button asChild className="bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-[0.98] w-full sm:w-auto">
                      <a 
                        href={config.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LinkIcon className="w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">Pay Online</span>
                      </a>
                    </Button>
                  ) : (
                    <p className="text-base text-muted-foreground italic">Not configured</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: QR Code */}
            <div className={cn(
              "flex flex-col items-center justify-center space-y-6 w-full",
              isVertical 
                ? "pt-8 border-t border-border/50" 
                : "md:border-l border-border/50 md:pl-8 lg:pl-12 pt-8 md:pt-0 border-t md:border-t-0"
            )}>
              <div className="p-4 bg-white rounded-2xl border shadow-sm w-full max-w-[260px] aspect-square flex items-center justify-center relative overflow-hidden group mx-auto">
                {config.qrCodeUrl ? (
                  <img 
                    src={config.qrCodeUrl} 
                    alt="Bank Account QR Code" 
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                
                {/* Fallback shown if no URL or if image fails to load */}
                <div 
                  className="flex-col items-center justify-center text-muted-foreground/50 w-full h-full bg-muted/20 rounded-xl"
                  style={{ display: config.qrCodeUrl ? 'none' : 'flex' }}
                >
                  <QrCode className="w-12 h-12 mb-3 opacity-50" />
                  <span className="text-sm font-medium text-center px-4">
                    {!config.qr_code ? 'No QR code provided by administration' : 'Failed to load QR code'}
                  </span>
                </div>
              </div>
              
              <Button 
                disabled={!config.qrCodeUrl}
                className="w-full max-w-[260px] h-12 text-base font-bold tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
              >
                <QrCode className="w-5 h-5 mr-2 shrink-0" />
                SCAN TO PAY
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentAccountDetails;