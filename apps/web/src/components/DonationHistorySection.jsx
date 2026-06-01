import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, AlertCircle, RefreshCw } from 'lucide-react';
import { verifyQueryExpand } from '@/lib/relationshipVerification.js';

const DonationHistorySection = () => {
  const { currentUser } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDonations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const queryOptions = {
        filter: `user="${currentUser.id}"`,
        sort: '-created',
        expand: 'user',
        $autoCancel: false
      };
      verifyQueryExpand('donations', queryOptions);
      
      const records = await pb.collection('donations').getList(1, 50, queryOptions);
      setDonations(records.items);
    } catch (err) {
      console.error('Error fetching donations:', err);
      setError('Failed to load donation history.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Pending</Badge>;
    }
  };

  const parseNotes = (notes, status) => {
    if (!notes) return { displayNotes: '-', rejectionReason: null };
    
    let displayNotes = notes;
    let rejectionReason = null;

    if (status === 'rejected' && displayNotes.includes('Rejection Reason:')) {
      const match = displayNotes.match(/Rejection Reason:\s*(.*)/);
      if (match && match[1]) {
        rejectionReason = match[1].trim();
        displayNotes = displayNotes.replace(/\|\s*Rejection Reason:\s*.*/, '').trim();
      }
    }

    displayNotes = displayNotes.replace(/Name:.*\||Email:.*\||Contact:.*\||Occasion:.*\||TXN:.*\|?/g, '').trim();
    
    return { 
      displayNotes: displayNotes || '-', 
      rejectionReason 
    };
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-[#8B0000] to-[#CC2222]"></div>
      <CardHeader className="pb-4 border-b border-gray-100 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
              <Heart className="w-5 h-5 text-[#8B0000]" /> My Donations History
            </CardTitle>
            <CardDescription>A complete record of your sacred contributions.</CardDescription>
          </div>
          <Button onClick={fetchDonations} variant="outline" size="sm" className="gap-2 bg-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 bg-white">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button onClick={fetchDonations} variant="outline">Try Again</Button>
          </div>
        ) : donations.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Donations Yet</h3>
            <p className="text-gray-500 max-w-sm">
              You haven't made any donations yet. Your contributions will appear here once submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="font-semibold text-gray-900">Category</TableHead>
                  <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Transaction ID</TableHead>
                  <TableHead className="font-semibold text-gray-900">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => {
                  const { displayNotes, rejectionReason } = parseNotes(donation.notes, donation.status);
                  const dateStr = donation.created;
                  
                  return (
                    <TableRow key={donation.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {donation.category || 'General'}
                      </TableCell>
                      <TableCell className="font-semibold text-[#8B0000]">
                        €{donation.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(donation.status)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {donation.transaction_id || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          {displayNotes !== '-' && (
                            <span className="text-sm text-gray-600 truncate" title={displayNotes}>
                              {displayNotes}
                            </span>
                          )}
                          {rejectionReason && (
                            <span className="text-xs text-red-600 font-medium flex items-center gap-1" title={rejectionReason}>
                              <AlertCircle className="w-3 h-3" /> {rejectionReason}
                            </span>
                          )}
                          {displayNotes === '-' && !rejectionReason && <span className="text-gray-400">-</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DonationHistorySection;