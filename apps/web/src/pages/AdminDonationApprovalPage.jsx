import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import DonationDetailsModal from '@/components/DonationDetailsModal.jsx';
import SoftDeleteConfirmationDialog from '@/components/SoftDeleteConfirmationDialog.jsx';
import ExcelExportButton from '@/components/ExcelExportButton.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  HeartHandshake, 
  Calendar as CalendarIcon, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  Mail,
  FilterX,
  ArrowUpDown,
  Trash2,
  RefreshCw,
  Download,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { verifyQueryExpand } from '@/lib/relationshipVerification.js';

const AdminDonationApprovalPage = () => {
  const [allDonations, setAllDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('active');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);
  const [resendingReceiptId, setResendingReceiptId] = useState(null);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    donation: null,
    type: 'soft_delete',
    loading: false
  });

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [reportEmail, setReportEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAllDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryOptions = {
        filter: `is_deleted=${activeTab === 'deleted'}`,
        sort: '-created',
        expand: 'user',
        $autoCancel: false
      };
      verifyQueryExpand('donations', queryOptions);

      const records = await pb.collection('donations').getFullList(queryOptions);
      setAllDonations(records);
    } catch (err) {
      console.error('Error fetching donations:', err);
      setError('Failed to load donations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAllDonations();
  }, [fetchAllDonations]);

  const getDonorInfo = (donation) => {
    let name = donation.expand?.user?.name || 'Unknown User';
    let email = donation.expand?.user?.email || 'No email';
    let phone = donation.expand?.user?.phone || 'No phone';

    if (donation.notes) {
      const nameMatch = donation.notes.match(/Name:\s*([^|]+)/);
      if (nameMatch && nameMatch[1].trim()) name = nameMatch[1].trim();

      const emailMatch = donation.notes.match(/Email:\s*([^|]+)/);
      if (emailMatch && emailMatch[1].trim()) email = emailMatch[1].trim();

      const phoneMatch = donation.notes.match(/Phone:\s*([^|]+)/);
      if (phoneMatch && phoneMatch[1].trim()) phone = phoneMatch[1].trim();
    }

    return { name, email, phone };
  };

  const { 
    filteredDonations, 
    availableMonths, 
    availableCategories,
    stats,
    monthlyStats,
    classificationStats
  } = useMemo(() => {
    let filtered = [...allDonations];
    const monthsSet = new Set();
    const categoriesSet = new Set();

    allDonations.forEach(d => {
      const dateObj = new Date(d.created);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
      if (d.category) categoriesSet.add(d.category);
    });

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    if (monthFilter !== 'all') {
      filtered = filtered.filter(d => {
        const dateObj = new Date(d.created);
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === monthFilter;
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(d => d.category === categoryFilter);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(d => new Date(d.created) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => new Date(d.created) <= toDate);
    }

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(d => {
        const { name, email, phone } = getDonorInfo(d);
        return (
          name.toLowerCase().includes(searchLower) ||
          email.toLowerCase().includes(searchLower) ||
          phone.toLowerCase().includes(searchLower) ||
          (d.transaction_id && d.transaction_id.toLowerCase().includes(searchLower)) ||
          (d.notes && d.notes.toLowerCase().includes(searchLower)) ||
          (d.receipt_id && d.receipt_id.toLowerCase().includes(searchLower))
        );
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    let total = 0;
    let pending = 0;
    let approved = 0;
    const groupedMonths = {};
    const groupedCategories = {};

    filtered.forEach(record => {
      const amount = record.amount || 0;
      total += amount;
      if (record.status === 'pending') pending += amount;
      if (record.status === 'approved') {
        approved += amount;
        
        const dateObj = new Date(record.created);
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const category = record.category || 'General Fund';

        if (!groupedMonths[monthKey]) {
          groupedMonths[monthKey] = { monthKey, monthLabel, totalAmount: 0, highestDonation: 0, categories: {} };
        }
        groupedMonths[monthKey].totalAmount += amount;
        if (amount > groupedMonths[monthKey].highestDonation) groupedMonths[monthKey].highestDonation = amount;
        
        if (!groupedMonths[monthKey].categories[category]) {
          groupedMonths[monthKey].categories[category] = { name: category, total: 0, count: 0 };
        }
        groupedMonths[monthKey].categories[category].total += amount;
        groupedMonths[monthKey].categories[category].count += 1;

        if (!groupedCategories[category]) {
          groupedCategories[category] = { name: category, total: 0, count: 0 };
        }
        groupedCategories[category].total += amount;
        groupedCategories[category].count += 1;
      }
    });

    const sortedMonths = Object.values(groupedMonths).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    sortedMonths.forEach(month => {
      month.categories = Object.values(month.categories).sort((a, b) => b.total - a.total);
    });

    const sortedCategories = Object.values(groupedCategories).sort((a, b) => b.total - a.total);

    return {
      filteredDonations: filtered,
      availableMonths: Array.from(monthsSet).sort().reverse(),
      availableCategories: Array.from(categoriesSet).sort(),
      stats: { total, pending, approved },
      monthlyStats: sortedMonths,
      classificationStats: sortedCategories
    };
  }, [allDonations, statusFilter, monthFilter, categoryFilter, dateFrom, dateTo, debouncedSearch, sortOrder]);

  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
  const paginatedDonations = filteredDonations.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, monthFilter, categoryFilter, dateFrom, dateTo, debouncedSearch, sortOrder]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setMonthFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortOrder('desc');
  };

  const handleApproveDonation = async (donation) => {
    setProcessingId(donation.id);
    setActionLoading(true);
    
    try {
      const endpoint = '/donations/approve';
      const res = await apiServerClient.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: donation.id,
          status: 'approved'
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve donation');
      }
      
      setIsModalOpen(false);
      toast.success('Donation approved successfully');
      fetchAllDonations();
    } catch (err) {
      console.error('Approval error:', err);
      toast.error(err.message || 'Failed to approve donation');
    } finally {
      setProcessingId(null);
      setActionLoading(false);
    }
  };

  const handleDownloadReceipt = async (donationId, receiptNumber) => {
    try {
      setDownloadingReceipt(donationId);
      const response = await apiServerClient.fetch(`/donations/${donationId}/download-receipt`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate receipt PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${receiptNumber || donationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err.message || 'Failed to download receipt');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const handleResendReceipt = async (donation) => {
    try {
      setResendingReceiptId(donation.id);
      await pb.collection('donations').update(donation.id, { resend_receipt: true }, { $autoCancel: false });
      toast.success('Receipt resend triggered successfully');
    } catch (err) {
      console.error('Resend error:', err);
      toast.error('Failed to trigger receipt resend');
    } finally {
      setResendingReceiptId(null);
    }
  };

  const handleReject = async (donation, reason) => {
    setActionLoading(true);
    try {
      const existingNotes = donation.notes || '';
      const rejectionNote = reason ? ` | Rejection Reason: ${reason}` : '';
      
      await pb.collection('donations').update(donation.id, {
        status: 'rejected',
        notes: existingNotes + rejectionNote
      }, { $autoCancel: false });

      toast.success('Donation rejected.');
      setIsModalOpen(false);
      fetchAllDonations();
    } catch (err) {
      console.error('Rejection error:', err);
      toast.error('Failed to reject donation.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (donation, type) => {
    setDeleteDialog({
      isOpen: true,
      donation,
      type,
      loading: false
    });
  };

  const confirmDeleteAction = async () => {
    const { donation, type } = deleteDialog;
    if (!donation) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));
    
    const donationId = donation.id;
    const amount = donation.amount;
    const accountId = donation.account_id || donation.category;

    if (donation.status === 'approved') {
      const missingFields = [];
      if (!donationId) missingFields.push('donationId (id)');
      if (amount === undefined || amount === null) missingFields.push('amount');
      if (!accountId) missingFields.push('accountId (account_id/category)');

      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        toast.error(`Cannot process financial update: ${errorMsg}`);
        setDeleteDialog(prev => ({ ...prev, loading: false }));
        return;
      }
    }
    
    try {
      if (type === 'soft_delete') {
        await pb.collection('donations').update(donation.id, { is_deleted: true }, { $autoCancel: false });
        if (donation.status === 'approved') {
          try {
            await apiServerClient.fetch('/soft-delete/donation-remove', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donationId, amount, accountId })
            });
          } catch (apiErr) {
            console.error('API Error:', apiErr);
          }
        }
        toast.success('Donation moved to trash');
        
      } else if (type === 'restore') {
        await pb.collection('donations').update(donation.id, { is_deleted: false }, { $autoCancel: false });
        if (donation.status === 'approved') {
          try {
            await apiServerClient.fetch('/soft-delete/donation-restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donationId, amount, accountId })
            });
          } catch (apiErr) {
            console.error('API Error:', apiErr);
          }
        }
        toast.success('Donation restored successfully');
        
      } else if (type === 'hard_delete') {
        if (donation.status === 'approved') {
          try {
            await apiServerClient.fetch('/soft-delete/donation-permanent-delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donationId, amount, accountId })
            });
          } catch (apiErr) {
            console.error('API Error:', apiErr);
          }
        }
        await pb.collection('donations').delete(donation.id, { $autoCancel: false });
        toast.success('Donation permanently deleted');
      }
      
      setDeleteDialog({ isOpen: false, donation: null, type: 'soft_delete', loading: false });
      fetchAllDonations();
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      toast.error(`Failed to ${type.replace('_', ' ')} donation`);
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const sendEmailReport = async () => {
    if (!reportEmail || !reportEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingEmail(true);
    try {
      let dateRangeStr = 'All Time';
      if (dateFrom && dateTo) dateRangeStr = `${dateFrom} to ${dateTo}`;
      else if (dateFrom) dateRangeStr = `From ${dateFrom}`;
      else if (dateTo) dateRangeStr = `Until ${dateTo}`;

      const payload = {
        recipientEmail: reportEmail,
        filters: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          dateRange: dateRangeStr !== 'All Time' ? dateRangeStr : undefined
        }
      };

      const response = await apiServerClient.fetch('/donations/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send report');
      }

      toast.success(`Email report sent successfully to ${reportEmail}`);
      setIsEmailModalOpen(false);
      setReportEmail('');
    } catch (err) {
      console.error('Email send error:', err);
      toast.error(err.message || 'Failed to send email report');
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 shadow-none text-[10px] px-2 py-0.5">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 shadow-none text-[10px] px-2 py-0.5">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 shadow-none text-[10px] px-2 py-0.5">Pending</Badge>;
    }
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    monthFilter !== 'all',
    categoryFilter !== 'all',
    dateFrom !== '',
    dateTo !== '',
    searchQuery !== ''
  ].filter(Boolean).length;

  const exportColumns = [
    { header: 'Date', accessor: (row) => new Date(row.created).toLocaleDateString() },
    { header: 'Donor Name', accessor: (row) => getDonorInfo(row).name },
    { header: 'Email', accessor: (row) => getDonorInfo(row).email },
    { header: 'Phone', accessor: (row) => getDonorInfo(row).phone },
    { header: 'Amount (€)', key: 'amount' },
    { header: 'Category', key: 'category' },
    { header: 'Status', key: 'status' },
    { header: 'Receipt ID', key: 'receipt_id' },
    { header: 'Transaction ID', key: 'transaction_id' }
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>Donation Approvals & Reports | Admin Portal</title>
      </Helmet>

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Donation Approvals & Reports
          </h1>
          <p className="text-sm text-muted-foreground">Review contributions, manage digital receipts, and generate reports.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'active' && (
            <ExcelExportButton 
              data={filteredDonations} 
              filename="donations-report" 
              columns={exportColumns} 
              className="bg-card"
            />
          )}
          <Button size="sm" onClick={() => setIsEmailModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Mail className="w-4 h-4 mr-2" /> Email Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Filtered Total</p>
                <h3 className="text-xl font-bold text-foreground mt-1">€{stats.total.toFixed(2)}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <HeartHandshake className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Filtered Approved</p>
                <h3 className="text-xl font-bold text-green-600 mt-1">€{stats.approved.toFixed(2)}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Filtered Pending</p>
                <h3 className="text-xl font-bold text-amber-600 mt-1">€{stats.pending.toFixed(2)}</h3>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Loader2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Name, email, phone, receipt..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-xs bg-background"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {availableMonths.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Classification</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date Range</Label>
                <div className="flex items-center gap-1">
                  <Input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 text-xs px-2 bg-background"
                  />
                  <span className="text-muted-foreground text-xs">-</span>
                  <Input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 text-xs px-2 bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="h-8 text-xs px-3 bg-muted"
                title="Toggle Sort Order"
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </Button>
              
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-8 text-xs px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <FilterX className="w-3.5 h-3.5 mr-1.5" />
                  Clear ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-muted p-1">
          <TabsTrigger value="active" className="text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-2" />
            Active Records ({activeTab === 'active' ? filteredDonations.length : '...'})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Trash / Deleted
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Breakdown Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0 outline-none">
          <Card className="border-none shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              {error ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <AlertCircle className="w-6 h-6 text-destructive mb-2" />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchAllDonations}>Try Again</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold text-foreground text-xs py-2">Date</TableHead>
                        <TableHead className="font-semibold text-foreground text-xs py-2">Donor Name</TableHead>
                        <TableHead className="font-semibold text-foreground text-xs py-2">Email</TableHead>
                        <TableHead className="font-semibold text-foreground text-xs py-2">Amount</TableHead>
                        <TableHead className="font-semibold text-foreground text-xs py-2">Category</TableHead>
                        <TableHead className="font-semibold text-foreground text-xs py-2">Status</TableHead>
                        <TableHead className="font-semibold text-foreground text-xs py-2 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-2"><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="py-2"><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="py-2"><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell className="py-2"><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell className="py-2"><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="py-2"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                            <TableCell className="py-2"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : paginatedDonations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <FilterX className="w-8 h-8 text-muted/30 mb-2" />
                              <p className="text-sm font-medium text-foreground">No donations match your filters</p>
                              <p className="text-xs mt-1">Try adjusting or clearing your search criteria.</p>
                              {activeFilterCount > 0 && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                                  Clear Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedDonations.map((donation) => {
                          const { name, email } = getDonorInfo(donation);
                          const hasReceipt = Boolean(donation.receipt_pdf);
                          return (
                            <TableRow 
                              key={donation.id} 
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <TableCell 
                                className="text-muted-foreground text-xs tabular-nums py-2 cursor-pointer"
                                onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
                              >
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                                  {new Date(donation.created).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell 
                                className="font-medium text-foreground text-xs py-2 cursor-pointer"
                                onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
                              >
                                {name}
                              </TableCell>
                              <TableCell 
                                className="text-muted-foreground text-xs truncate max-w-[150px] py-2 cursor-pointer" 
                                title={email}
                                onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
                              >
                                {email}
                              </TableCell>
                              <TableCell 
                                className="font-semibold text-primary text-xs tabular-nums py-2 cursor-pointer"
                                onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
                              >
                                €{donation.amount?.toFixed(2)}
                              </TableCell>
                              <TableCell 
                                className="text-muted-foreground text-xs py-2 cursor-pointer"
                                onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
                              >
                                {donation.category || 'General'}
                              </TableCell>
                              <TableCell 
                                className="py-2 cursor-pointer"
                                onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
                              >
                                <div className="space-y-1.5">
                                  {getStatusBadge(donation.status)}
                                  {donation.receipt_id && (
                                    <div className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded inline-block shadow-sm">
                                      {donation.receipt_id}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <div className="flex justify-end gap-2 flex-wrap">
                                  {donation.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-success/10 text-success hover:bg-success/20 border-success/20"
                                      onClick={(e) => { e.stopPropagation(); handleApproveDonation(donation); }}
                                      disabled={processingId === donation.id}
                                    >
                                      {processingId === donation.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                      Approve
                                    </Button>
                                  )}
                                  
                                  {donation.status === 'approved' && (
                                    <>
                                      {hasReceipt && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            handleResendReceipt(donation);
                                          }}
                                          disabled={resendingReceiptId === donation.id}
                                          title="Resend Receipt Email"
                                        >
                                          {resendingReceiptId === donation.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                      )}
                                      {donation.receipt_id && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                          onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(donation.id, donation.receipt_id); }}
                                          disabled={downloadingReceipt === donation.id}
                                          title="Download Receipt PDF"
                                        >
                                          {downloadingReceipt === donation.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                                          PDF
                                        </Button>
                                      )}
                                    </>
                                  )}

                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteDialog(donation, 'soft_delete');
                                    }}
                                    title="Move to Trash"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{(page - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * itemsPerPage, filteredDonations.length)}</span> of <span className="font-medium text-foreground">{filteredDonations.length}</span> results
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-background h-7 text-xs px-2"
                    >
                      <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="bg-background h-7 text-xs px-2"
                    >
                      Next <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deleted" className="mt-0 outline-none">
          <Card className="border-none shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground text-xs py-2">Date</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs py-2">Donor Name</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs py-2">Amount</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs py-2">Status</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs py-2">Deleted At</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : paginatedDonations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p>No deleted donations found.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDonations.map((donation) => {
                        const { name } = getDonorInfo(donation);
                        return (
                          <TableRow key={donation.id} className="opacity-75 bg-muted/10">
                            <TableCell className="text-muted-foreground text-xs py-2">
                              {new Date(donation.created).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium text-foreground text-xs py-2">{name}</TableCell>
                            <TableCell className="font-semibold text-primary text-xs py-2">€{donation.amount?.toFixed(2)}</TableCell>
                            <TableCell className="py-2">{getStatusBadge(donation.status)}</TableCell>
                            <TableCell className="text-destructive text-xs py-2 font-medium">
                              {new Date(donation.updated).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                  onClick={() => openDeleteDialog(donation, 'restore')}
                                >
                                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restore
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="h-8 px-2"
                                  onClick={() => openDeleteDialog(donation, 'hard_delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-0 outline-none space-y-6">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">Overall Classification Breakdown</CardTitle>
              <CardDescription>Based on currently filtered approved donations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {classificationStats.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No approved donations match the current filters.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Category</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase text-center">Count</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classificationStats.map(cat => (
                      <TableRow key={cat.name}>
                        <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{cat.count}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">€{cat.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monthlyStats.map((month) => (
              <Card key={month.monthKey} className="shadow-sm overflow-hidden bg-card">
                <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                      {month.monthLabel}
                    </CardTitle>
                    <Badge className="bg-success/20 text-success hover:bg-success/30 border-success/30 text-sm px-3 py-1">
                      €{month.totalAmount.toFixed(2)}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Highest single donation: <span className="font-semibold text-foreground">€{month.highestDonation.toFixed(2)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-transparent hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classification</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Count</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {month.categories.map((cat) => (
                        <TableRow key={cat.name} className="hover:bg-muted/30">
                          <TableCell className="text-sm font-medium text-foreground py-3">{cat.name}</TableCell>
                          <TableCell className="text-sm text-center text-muted-foreground py-3">
                            <Badge variant="secondary" className="font-normal">
                              {cat.count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-right font-semibold text-foreground tabular-nums py-3">
                            €{cat.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <DonationDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        donation={selectedDonation}
        onApprove={() => handleApproveDonation(selectedDonation)}
        onReject={handleReject}
        actionLoading={actionLoading}
      />

      <SoftDeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, donation: null, type: 'soft_delete', loading: false })}
        onConfirm={confirmDeleteAction}
        title={
          deleteDialog.type === 'soft_delete' ? 'Move Donation to Trash?' :
          deleteDialog.type === 'restore' ? 'Restore Donation?' : 'Permanently Delete Donation?'
        }
        description={
          deleteDialog.type === 'soft_delete' ? `Are you sure you want to move this donation from ${getDonorInfo(deleteDialog.donation || {}).name} to trash?` :
          deleteDialog.type === 'restore' ? `This will restore the donation from ${getDonorInfo(deleteDialog.donation || {}).name} back to the active list.` :
          `Are you sure you want to permanently delete this donation? This action cannot be undone.`
        }
        actionType={deleteDialog.type}
        loading={deleteDialog.loading}
        isFinancial={deleteDialog.donation?.status === 'approved'}
        amount={deleteDialog.donation?.amount}
      />

      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Donation Report</DialogTitle>
            <DialogDescription>
              Send a detailed report of the currently filtered donations to an email address.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@temple.com"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  className="pl-9 text-foreground"
                />
              </div>
            </div>
            <div className="bg-muted/30 p-3 rounded-md text-xs text-muted-foreground space-y-1">
              <p><strong>Included in report:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>{filteredDonations.length} filtered records</li>
                <li>Total Amount: €{stats.approved.toFixed(2)}</li>
                <li>Monthly & Classification Breakdowns</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} disabled={sendingEmail}>
              Cancel
            </Button>
            <Button onClick={sendEmailReport} disabled={sendingEmail || !reportEmail} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {sendingEmail ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Send Report</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminDonationApprovalPage;