import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, Loader2 } from 'lucide-react';
import PaymentAccountDetails from '@/components/PaymentAccountDetails.jsx';
import pb from '@/lib/pocketbaseClient';

const AdminTemplePaymentAccounts = () => {
  const [accountRecord, setAccountRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const records = await pb.collection('payment_accounts').getList(1, 1, { $autoCancel: false });
        if (records.items.length > 0) {
          setAccountRecord(records.items[0]);
        }
      } catch (error) {
        console.error('Error fetching payment account:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccount();
  }, []);

  return (
    <AdminLayout>
      <Helmet>
        <title>Temple Payment Accounts | Admin Portal</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#8B0000] tracking-tight">Temple Payment Account Details</h1>
        <p className="text-gray-600 mt-1">Manage and view temple payment gateway accounts and configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <PaymentAccountDetails accountRecord={accountRecord} />
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="border-gray-200 border-dashed shadow-sm bg-gray-50/30 h-full">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center h-full">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <Landmark className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">More Settings Coming Soon</h3>
              <p className="text-sm text-gray-500 max-w-[200px] leading-relaxed">
                Additional payment gateway configurations (Stripe, PayPal) will be available here in future updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTemplePaymentAccounts;