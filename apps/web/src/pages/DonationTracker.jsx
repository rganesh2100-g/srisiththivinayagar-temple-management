import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, CheckCircle, Trash2, HeartHandshake, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DonationTracker = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0
  });

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      let filterStr = '';
      if (statusFilter !== 'all') {
        filterStr = `status="${statusFilter}"`;
      }

      const records = await pb.collection('donations').getFullList({
        filter: filterStr,
        expand: 'user_id',
        sort: '-donation_date',
        $autoCancel: false
      });

      setDonations(records);

      // Calculate stats
      const allRecords = await pb.collection('donations').getFullList({ $autoCancel: false });
      let t = 0, p = 0, a = 0;
      allRecords.forEach(d => {
        t += d.amount;
        if (d.status === 'pending') p += d.amount;
        if (d.status === 'approved') a += d.amount;
      });
      setStats({ total: t, pending: p, approved: a });

    } catch (err) {
      console.error('Error fetching donations:', err);
      setError('Failed to load donations. Please try again.');
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    setProcessing(true);
    try {
      await pb.collection('donations').update(id, {
        status: 'approved',
        approval_date: new Date().toISOString()
      }, { $autoCancel: false });
      toast.success('Donation approved');
      fetchDonations();
    } catch (err) {
      console.error('Error approving donation:', err);
      toast.error('Failed to approve donation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donation record?')) return;
    setProcessing(true);
    try {
      await pb.collection('donations').delete(id, { $autoCancel: false });
      toast.success('Donation deleted');
      fetchDonations();
    } catch (err) {
      console.error('Error deleting donation:', err);
      toast.error('Failed to delete donation');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setProcessing(true);
    try {
      const promises = Array.from(selectedIds).map(id => 
        pb.collection('donations').update(id, {
          status: 'approved',
          approval_date: new Date().toISOString()
        }, { $autoCancel: false })
      );
      await Promise.all(promises);
      toast.success(`${selectedIds.size} donations approved`);
      setSelectedIds(new Set());
      fetchDonations();
    } catch (err) {
      console.error('Error bulk approving:', err);
      toast.error('Failed to approve some donations');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDonations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDonations.map(d => d.id)));
    }
  };

  const filteredDonations = donations.filter(d => {
    const donorName = d.expand?.user_id?.name || d.expand?.user_id?.email || '';
    return donorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           d.amount.toString().includes(searchTerm);
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Donation Tracker | Admin | Sri Sithivinayagar Temple</title>
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#8B0000] mb-2">Donation Tracker</h1>
        <p className="text-gray-600">Manage and approve temple donations.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Total Donations</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">€{stats.total.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <HeartHandshake className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Approved Amount</p>
                <h3 className="text-2xl font-bold text-green-600 mt-1">€{stats.approved.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Pending Amount</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">€{stats.pending.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                <Loader2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-none shadow-md mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row flex-1 gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search donor or amount..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 text-black w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-50 border-gray-200 text-black">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedIds.size > 0 && (
            <Button 
              onClick={handleBulkApprove} 
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap w-full sm:w-auto"
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve Selected ({selectedIds.size})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 flex-1 rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h3>
              <p className="text-gray-500 mb-6 max-w-md">{error}</p>
              <Button onClick={fetchDonations} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </Button>
            </div>
          ) : filteredDonations.length === 0 ? (
            <div className="text-center py-16 px-4 text-gray-500">
              <HeartHandshake className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No donations found</h3>
              <p>There are no donations matching your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.size === filteredDonations.length && filteredDonations.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-[#CC2222] focus:ring-[#CC2222]"
                      />
                    </th>
                    <th className="px-4 py-4 font-semibold">Donor</th>
                    <th className="px-4 py-4 font-semibold">Amount</th>
                    <th className="px-4 py-4 font-semibold">Date</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDonations.map((donation) => (
                    <tr key={donation.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(donation.id)}
                          onChange={() => toggleSelect(donation.id)}
                          className="rounded border-gray-300 text-[#CC2222] focus:ring-[#CC2222]"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {donation.expand?.user_id?.name || donation.expand?.user_id?.email || 'Anonymous'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">€{donation.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(donation.donation_date)}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{donation.category || 'General'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize inline-flex items-center gap-1.5 ${
                          donation.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {donation.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {donation.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {donation.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-3"
                              disabled={processing}
                              onClick={() => handleApprove(donation.id)}
                            >
                              Approve
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 h-8 w-8 p-0"
                            disabled={processing}
                            onClick={() => handleDelete(donation.id)}
                            aria-label="Delete donation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default DonationTracker;