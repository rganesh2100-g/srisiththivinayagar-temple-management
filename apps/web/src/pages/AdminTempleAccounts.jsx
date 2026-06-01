import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, RefreshCw, Filter, X, CalendarDays, Wallet, Search, FileText, Mail, TrendingUp, TrendingDown, Scale, FileSpreadsheet, Tag, Loader2, Tags } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Monthly Signup Revenue',
  'Donations',
  'Pooja Bookings',
  'Expense',
  'Staff Salaries',
  'Other Income',
  'General'
];

const AdminTempleAccounts = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingClassifications, setIsLoadingClassifications] = useState(true);
  const [error, setError] = useState(null);
  
  // Export & Share State
  const [isExporting, setIsExporting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareForm, setShareForm] = useState({
    email: '',
    periodType: 'Monthly',
    startDate: '',
    endDate: '',
  });

  const defaultFilters = {
    categoryFilter: 'all',
    classification: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    accountSearch: ''
  };

  const [filters, setFilters] = useState(defaultFilters);

  const fetchClassifications = async () => {
    setIsLoadingClassifications(true);
    try {
      const res = await pb.collection('classifications').getFullList({ sort: 'name', $autoCancel: false });
      setClassifications(res);
    } catch (err) {
      console.error('Failed to fetch classifications:', err);
      toast.error('Failed to load classifications.');
    } finally {
      setIsLoadingClassifications(false);
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let filterQuery = '';
      const conditions = [];

      // Server-side filtering for category, classification, and dates
      if (filters.categoryFilter !== 'all') {
        if (filters.categoryFilter === 'Expense') {
          conditions.push(`amount < 0`);
        } else {
          conditions.push(`category="${filters.categoryFilter}"`);
        }
      }

      if (filters.classification !== 'all') {
        conditions.push(`classification="${filters.classification}"`);
      }

      if (filters.startDate) {
        conditions.push(`date >= "${filters.startDate} 00:00:00"`);
      }
      
      if (filters.endDate) {
        conditions.push(`date <= "${filters.endDate} 23:59:59"`);
      }

      if (conditions.length > 0) {
        filterQuery = conditions.join(' && ');
      }

      const result = await pb.collection('temple_accounts').getList(1, 1000, {
        sort: '-date',
        filter: filterQuery,
        $autoCancel: false
      });
      
      setTransactions(result.items);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load temple accounts data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters.categoryFilter, filters.classification, filters.startDate, filters.endDate]);

  useEffect(() => {
    // Fix: Use currentUser.role instead of undefined isAdmin from useAuth
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchClassifications();
    fetchTransactions();
  }, [currentUser, navigate, fetchTransactions]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const isFilterActive = useMemo(() => {
    return filters.categoryFilter !== 'all' || 
           filters.classification !== 'all' || 
           filters.startDate !== '' || 
           filters.endDate !== '' || 
           filters.minAmount !== '' || 
           filters.maxAmount !== '' || 
           filters.accountSearch !== '';
  }, [filters]);

  // Client-side filtering for amount and search text
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const amount = Math.abs(parseFloat(t.amount) || 0);
      if (filters.minAmount && amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) return false;
      
      if (filters.accountSearch) {
        const searchLower = filters.accountSearch.toLowerCase();
        const matchName = t.member_name?.toLowerCase().includes(searchLower);
        const matchId = t.transaction_id?.toLowerCase().includes(searchLower);
        const matchDesc = t.description?.toLowerCase().includes(searchLower);
        if (!matchName && !matchId && !matchDesc) return false;
      }
      return true;
    });
  }, [transactions, filters.minAmount, filters.maxAmount, filters.accountSearch]);

  const calculateSummary = (txs) => {
    let income = 0;
    let expenses = 0;
    
    txs.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      const classif = (t.classification || '').toLowerCase();
      const amt = parseFloat(t.amount) || 0;
      
      const isExpense = classif === 'expense' || 
                        classif === 'expenses' ||
                        cat.includes('expense') || 
                        cat.includes('maintenance') || 
                        cat.includes('charity') || 
                        cat.includes('staff') || 
                        cat.includes('salaries') || 
                        amt < 0;
                        
      if (isExpense) {
        expenses += Math.abs(amt);
      } else {
        income += Math.abs(amt);
      }
    });
    
    return { income, expenses, net: income - expenses };
  };

  const yearlySummary = useMemo(() => calculateSummary(filteredTransactions), [filteredTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(t);
    });
    
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[1][0].date) - new Date(a[1][0].date);
    });
  }, [filteredTransactions]);

  const getCategoryBadge = (t) => {
    const classif = (t.classification || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const isExpense = classif === 'expense' || classif === 'expenses' ||
                      cat.includes('expense') || 
                      cat.includes('salaries') || 
                      parseFloat(t.amount) < 0;
                      
    if (isExpense) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-transparent text-[10px] px-1.5 py-0">Expense</Badge>;
    }
    if (cat.includes('donation')) {
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent text-[10px] px-1.5 py-0">Donation</Badge>;
    }
    if (cat.includes('pooja')) {
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-transparent text-[10px] px-1.5 py-0">Pooja</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent text-[10px] px-1.5 py-0">{t.category || 'Income'}</Badge>;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const response = await apiServerClient.fetch('/temple-accounts/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error('Export failed on the server');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '_');
      a.download = `Temple_Accounts_${dateStr}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareReport = async () => {
    if (!shareForm.email) {
      toast.error('Please provide a recipient email.');
      return;
    }
    if (shareForm.periodType === 'Custom Date Range' && (!shareForm.startDate || !shareForm.endDate)) {
      toast.error('Please select both start and end dates.');
      return;
    }

    try {
      setIsSharing(true);
      
      let start = shareForm.startDate;
      let end = shareForm.endDate;
      const now = new Date();

      if (shareForm.periodType === 'Monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (shareForm.periodType === 'Yearly') {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      }

      const response = await apiServerClient.fetch('/temple-accounts/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: shareForm.email,
          reportType: 'with-excel', 
          startDate: start,
          endDate: end
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send report');
      }
      
      toast.success(`Report sent successfully to ${shareForm.email}`);
      setIsShareModalOpen(false);
      setShareForm({ ...shareForm, email: '' });
    } catch (error) {
      console.error('Share error:', error);
      toast.error(error.message || 'Failed to send report. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Temple Accounts | Admin Portal</title>
      </Helmet>
      
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Temple Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">View, filter, and export financial transactions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" size="sm" className="bg-card border-green-600 text-green-700 hover:bg-green-50 gap-1.5 h-8 text-xs transition-all">
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button onClick={() => setIsShareModalOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-8 text-xs transition-all">
            <Mail className="w-3.5 h-3.5" /> Share Report
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-border shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pt-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Filter className="w-4 h-4 text-primary" /> Filter Transactions
          </CardTitle>
          {isFilterActive && (
            <Button onClick={clearFilters} variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1 px-2">
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</Label>
              <div className="input-icon-wrapper">
                <Tag className="input-icon-left w-4 h-4" />
                <Select value={filters.categoryFilter} onValueChange={(v) => handleFilterChange('categoryFilter', v)}>
                  <SelectTrigger className="input-with-icon bg-background border-input h-8 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Classification</Label>
              <div className="input-icon-wrapper">
                <Tags className="input-icon-left w-4 h-4" />
                <Select value={filters.classification} onValueChange={(v) => handleFilterChange('classification', v)}>
                  <SelectTrigger className="input-with-icon bg-background border-input h-8 text-xs">
                    <SelectValue placeholder={isLoadingClassifications ? "Loading..." : "All Classifications"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classifications</SelectItem>
                    {classifications.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date Range</Label>
              <div className="flex items-center gap-2">
                <div className="input-icon-wrapper flex-1">
                  <CalendarDays className="input-icon-left w-3.5 h-3.5" />
                  <Input 
                    type="date" 
                    value={filters.startDate} 
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="input-with-icon bg-background border-input text-xs h-8"
                  />
                </div>
                <span className="text-muted-foreground text-xs">-</span>
                <div className="input-icon-wrapper flex-1">
                  <CalendarDays className="input-icon-left w-3.5 h-3.5" />
                  <Input 
                    type="date" 
                    value={filters.endDate} 
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="input-with-icon bg-background border-input text-xs h-8"
                    min={filters.startDate}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount Range (€)</Label>
              <div className="flex items-center gap-2">
                <div className="input-icon-wrapper flex-1">
                  <Wallet className="input-icon-left w-3.5 h-3.5" />
                  <Input 
                    type="number" 
                    placeholder="Min" 
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    className="input-with-icon bg-background border-input text-xs h-8"
                  />
                </div>
                <span className="text-muted-foreground text-xs">-</span>
                <div className="input-icon-wrapper flex-1">
                  <Wallet className="input-icon-left w-3.5 h-3.5" />
                  <Input 
                    type="number" 
                    placeholder="Max" 
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    className="input-with-icon bg-background border-input text-xs h-8"
                    min={filters.minAmount}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Temple Account / Desc</Label>
              <div className="input-icon-wrapper">
                <Search className="input-icon-left w-3.5 h-3.5" />
                <Input 
                  placeholder="Search name or ID..." 
                  value={filters.accountSearch}
                  onChange={(e) => handleFilterChange('accountSearch', e.target.value)}
                  className="input-with-icon bg-background border-input text-xs h-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="report-content" className="bg-background p-1">
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-800 mb-0.5">Total Income</p>
                  <h3 className="text-xl font-bold text-emerald-900 tabular-nums">{formatCurrency(yearlySummary.income)}</h3>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-red-50/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-800 mb-0.5">Total Expenses</p>
                  <h3 className="text-xl font-bold text-red-900 tabular-nums">{formatCurrency(yearlySummary.expenses)}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-800 mb-0.5">Net Balance</p>
                  <h3 className={`text-xl font-bold tabular-nums ${yearlySummary.net >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                    {formatCurrency(yearlySummary.net)}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-8 w-40 rounded-md" />
                <Card className="border-border">
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
              <Button onClick={fetchTransactions} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </CardContent>
          </Card>
        ) : groupedTransactions.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No transactions found</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                {isFilterActive 
                  ? "We couldn't find any transactions matching your current filters." 
                  : "There are no financial records in the system yet."}
              </p>
              {isFilterActive && (
                <Button onClick={clearFilters} variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/5">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedTransactions.map(([monthYear, monthTransactions]) => {
              const monthSummary = calculateSummary(monthTransactions);
              
              return (
                <div key={monthYear} className="space-y-3 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm">
                        {monthYear}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                        {monthTransactions.length} records
                      </span>
                    </h2>
                    
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        <TrendingUp className="w-3.5 h-3.5" /> {formatCurrency(monthSummary.income)}
                      </div>
                      <div className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded">
                        <TrendingDown className="w-3.5 h-3.5" /> {formatCurrency(monthSummary.expenses)}
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded ${monthSummary.net >= 0 ? 'text-blue-700 bg-blue-50' : 'text-red-700 bg-red-50'}`}>
                        <Scale className="w-3.5 h-3.5" /> {formatCurrency(monthSummary.net)}
                      </div>
                    </div>
                  </div>
                  
                  <Card className="border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="expense-table-header">
                          <TableRow>
                            <TableHead className="w-[100px] font-semibold py-2">Date</TableHead>
                            <TableHead className="w-[120px] font-semibold py-2">Classification</TableHead>
                            <TableHead className="font-semibold py-2">Description / Name</TableHead>
                            <TableHead className="font-semibold py-2">Related Account</TableHead>
                            <TableHead className="text-right font-semibold py-2">Amount (€)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthTransactions.map((t) => {
                            const classif = (t.classification || '').toLowerCase();
                            const cat = (t.category || '').toLowerCase();
                            const isExpense = classif === 'expense' || classif === 'expenses' || cat.includes('expense') || cat.includes('salaries') || parseFloat(t.amount) < 0;
                            const amount = Math.abs(parseFloat(t.amount) || 0);
                            
                            return (
                              <TableRow key={t.id} className="hover:bg-muted/50 transition-colors bg-card">
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2">
                                  {formatDateGerman(t.date)}
                                </TableCell>
                                <TableCell className="py-2">
                                  {getCategoryBadge(t)}
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="font-medium text-foreground text-xs">{t.member_name || 'N/A'}</div>
                                  {t.transaction_id && (
                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {t.transaction_id}</div>
                                  )}
                                </TableCell>
                                <TableCell className="py-2">
                                  <span className="text-xs text-muted-foreground">{t.category || 'General Fund'}</span>
                                </TableCell>
                                <TableCell className={`text-right whitespace-nowrap text-xs py-2 ${isExpense ? 'expense-amount-negative' : 'expense-amount-positive'}`}>
                                  {isExpense ? '-' : '+'}{amount.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="professional-dialog-content sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-playfair">Share Financial Report</DialogTitle>
            <DialogDescription>
              Send a comprehensive financial report via email with an Excel attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={shareForm.email} 
                onChange={(e) => setShareForm(prev => ({ ...prev, email: e.target.value }))} 
                placeholder="admin@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Time Period</Label>
              <Select value={shareForm.periodType} onValueChange={(v) => setShareForm(prev => ({ ...prev, periodType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Current Month</SelectItem>
                  <SelectItem value="Yearly">Current Year</SelectItem>
                  <SelectItem value="Custom Date Range">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {shareForm.periodType === 'Custom Date Range' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={shareForm.startDate} 
                    onChange={(e) => setShareForm(prev => ({ ...prev, startDate: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={shareForm.endDate} 
                    onChange={(e) => setShareForm(prev => ({ ...prev, endDate: e.target.value }))} 
                    min={shareForm.startDate}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
            <Button onClick={handleShareReport} disabled={isSharing || !shareForm.email} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              {isSharing ? 'Sending...' : 'Send Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTempleAccounts;