import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Building2, Landmark, Hash, Mail, Image as ImageIcon, Link as LinkIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

const AdminPaymentAccountPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);
  
  const [formData, setFormData] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    email: '',
    payment_link: '',
    iban: ''
  });
  
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);

  useEffect(() => {
    fetchPaymentAccount();
  }, []);

  const fetchPaymentAccount = async () => {
    try {
      setLoading(true);
      const result = await pb.collection('payment_accounts').getList(1, 1, { $autoCancel: false });
      
      if (result.items.length > 0) {
        const record = result.items[0];
        setRecordId(record.id);
        setFormData({
          bank_name: record.bank_name || '',
          account_name: record.account_name || '',
          account_number: record.account_number || '',
          email: record.email || '',
          payment_link: record.payment_link || '',
          iban: record.iban || ''
        });
        
        if (record.qr_code) {
          setQrPreview(pb.files.getUrl(record, record.qr_code));
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment account details:', error);
      toast.error('Failed to load payment account data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = new FormData();
      data.append('bank_name', formData.bank_name.trim());
      data.append('account_name', formData.account_name.trim());
      data.append('account_number', formData.account_number.trim());
      data.append('email', formData.email.trim());
      data.append('payment_link', formData.payment_link.trim());
      data.append('iban', formData.iban.trim());
      
      if (qrFile) {
        data.append('qr_code', qrFile);
      }

      if (recordId) {
        await pb.collection('payment_accounts').update(recordId, data, { $autoCancel: false });
        toast.success('Payment account details updated successfully');
      } else {
        const newRecord = await pb.collection('payment_accounts').create(data, { $autoCancel: false });
        setRecordId(newRecord.id);
        toast.success('Payment account details created successfully');
      }
      
      // Refresh to ensure we have the latest correct URLs and data
      fetchPaymentAccount();
      
    } catch (error) {
      console.error('Failed to save payment account:', error);
      toast.error('Failed to save payment account details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading payment configuration...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Payment Account Configuration | Admin Portal</title>
      </Helmet>

      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-playfair tracking-tight text-foreground">Payment Account Configuration</h1>
          <p className="text-base text-muted-foreground mt-1">Manage global payment details shown to users during checkout and donations</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pb-12">
        <form onSubmit={handleSubmit}>
          <Card className="border-border shadow-md overflow-hidden rounded-2xl">
            <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60 w-full" />
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-6 pt-6">
              <CardTitle className="text-xl">Bank & Account Details</CardTitle>
              <CardDescription>Enter the official bank details to receive funds.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="bank_name" className="text-foreground font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Bank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Sparkasse"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_name" className="text-foreground font-semibold flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-muted-foreground" />
                    Account Holder Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="account_name"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Sri Siththi Vinayagar Temple e.V."
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_number" className="text-foreground font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    Account Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="account_number"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    placeholder="e.g., 123456789"
                    required
                    className="h-11 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iban" className="text-foreground font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    IBAN
                  </Label>
                  <Input
                    id="iban"
                    name="iban"
                    value={formData.iban}
                    onChange={handleInputChange}
                    placeholder="e.g., DE12 3456 7890 1234 5678 90"
                    className="h-11 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Contact Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="finance@temple.com"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_link" className="text-foreground font-semibold flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    Direct Payment Link (URL)
                  </Label>
                  <Input
                    id="payment_link"
                    name="payment_link"
                    type="url"
                    value={formData.payment_link}
                    onChange={handleInputChange}
                    placeholder="e.g., https://paypal.me/temple"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Provide a PayPal or Stripe payment URL if available</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50">
                <div className="space-y-4">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    QR Code Image
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="shrink-0">
                      {qrPreview ? (
                        <div className="p-2 border border-border rounded-xl bg-white shadow-sm">
                          <img src={qrPreview} alt="QR Code Preview" className="w-32 h-32 object-contain" />
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-muted/50 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 flex-1 w-full">
                      <Label htmlFor="qr_code" className="sr-only">Upload QR Code</Label>
                      <Input
                        id="qr_code"
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        className="h-11 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                        Upload a clear QR code image that users can scan to make direct transfers via their banking app or PayPal. PNG or JPEG formats work best.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-6 border-t border-border/50 bg-muted/20 flex justify-end">
              <Button type="submit" size="lg" disabled={saving} className="px-8 min-w-[160px]">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentAccountPage;