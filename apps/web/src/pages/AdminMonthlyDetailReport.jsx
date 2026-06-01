import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { getGermanDate, formatDateGerman } from '@/lib/germanTimeUtils.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Printer, ArrowLeft, Filter, X, Search, SlidersHorizontal, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'All Categories',
  'Monthly Signup Revenue',
  'Donations',
  'Pooja Bookings',
  'Expenses',
  'Staff Salaries',
  'Other Income'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminMonthlyDetailReport = () => {
  const { month: urlMonth, year: urlYear } = useParams();
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Determine initial month and year (URL params fallback to current German time)
  const { initialMonth, initialYear } = useMemo(() => {
    const germanNow = getGermanDate();
    const currentMonthName = MONTHS[germanNow.getMonth()];
    const currentYear = germanNow.getFullYear().toString();
    
    return {
      initialMonth: urlMonth || currentMonthName,
      initialYear: urlYear || currentYear
    };
  }, [urlMonth, urlYear]);

  // Calculate default dates for the initial month/year
  const defaultDates = useMemo(() => {
    const monthIndex = MONTHS.indexOf(initialMonth);
    const yearNum = parseInt(initialYear);
    
    if (monthIndex === -1 || isNaN(yearNum)) return { from: '', to: '' };

    const firstDay = new Date(yearNum, monthIndex, 1);
    const lastDay = new Date(yearNum, monthIndex + 1, 0);
    
    const formatForInput = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      from: formatForInput(firstDay),
      to: formatForInput(lastDay)
    };
  }, [initialMonth, initialYear]);

  const defaultFilters = useMemo(() => ({
    monthFilter: initialMonth,
    yearFilter: initialYear,
    category: 'All Categories',
    fromDate: defaultDates.from,
    toDate: defaultDates.to,
    nameSearch: '',
    minAmount: '',
    maxAmount: '',
    transactionIdSearch: '',
    statusFilter: 'All'
  }), [initialMonth, initialYear, defaultDates]);

  const [filters, setFilters] = useState(defaultFilters);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Extract available years from data
  const availableYears = useMemo(() => {
    const years = new Set(allTransactions.map(t => t.year).filter(Boolean));
    years.add(parseInt(initialYear)); // Ensure current/initial year is always an option
    return Array.from(years).sort((a, b) => b - a).map(String);
  }, [allTransactions, initialYear]);

  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate('/');
      return;
    }

    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Fetch ALL transactions to allow cross-month filtering
        const records = await pb.collection('temple_accounts').getFullList({
          sort: '-date',
          $autoCancel: false
        });
        setAllTransactions(records);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [currentUser, isAdmin, navigate]);

  // Sync Date Range when Month or Year dropdown changes
  useEffect(() => {
    if (filters.monthFilter !== 'All Months' && filters.yearFilter !== 'All Years') {
      const monthIndex = MONTHS.indexOf(filters.monthFilter);
      const yearNum = parseInt(filters.yearFilter);
      
      if (monthIndex !== -1 && !isNaN(yearNum)) {
        const firstDay = new Date(yearNum, monthIndex, 1);
        const lastDay = new Date(yearNum, monthIndex + 1, 0);
        
        const formatForInput = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        setFilters(prev => ({
          ...prev,
          fromDate: formatForInput(firstDay),
          toDate: formatForInput(lastDay)
        }));
      }
    }
  }, [filters.monthFilter, filters.yearFilter]);

  // Apply filters whenever filters or allTransactions change
  useEffect(() => {
    let result = [...allTransactions];
    let count = 0;

    // 1. Month Filter
    if (filters.monthFilter && filters.monthFilter !== 'All Months') {
      result = result.filter(t => t.month === filters.monthFilter);
      count++;
    }

    // 2. Year Filter
    if (filters.yearFilter && filters.yearFilter !== 'All Years') {
      result = result.filter(t => t.year?.toString() === filters.yearFilter);
      count++;
    }

    // 3. Category Filter
    if (filters.category !== 'All Categories') {
      result = result.filter(t => t.category === filters.category);
      count++;
    }

    // 4. Date Range Filter
    if (filters.fromDate) {
      const from = new Date(filters.fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.date) >= from);
      count++;
    }
    if (filters.toDate) {
      const to = new Date(filters.toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.date) <= to);
      if (!filters.fromDate) count++; // Only count date filter once if both are set
    }

    // 5. Name Search
    if (filters.nameSearch.trim()) {
      const searchLower = filters.nameSearch.toLowerCase();
      result = result.filter(t => t.member_name?.toLowerCase().includes(searchLower));
      count++;
    }

    // 6. Amount Range
    if (filters.minAmount !== '') {
      result = result.filter(t => parseFloat(t.amount) >= parseFloat(filters.minAmount));
      count++;
    }
    if (filters.maxAmount !== '') {
      result = result.filter(t => parseFloat(t.amount) <= parseFloat(filters.maxAmount));
      if (filters.minAmount === '') count++;
    }

    // 7. Transaction ID Search
    if (filters.transactionIdSearch.trim()) {
      const searchLower = filters.transactionIdSearch.toLowerCase();
      result = result.filter(t => t.transaction_id?.toLowerCase().includes(searchLower));
      count++;
    }

    // 8. Status Filter
    if (filters.statusFilter !== 'All') {
      if (filters.statusFilter === 'Pending') {
        result = []; // Assuming all temple_accounts records are completed/approved
      }
      count++;
    }

    setFilteredTransactions(result);
    setActiveFiltersCount(count);
  }, [filters, allTransactions]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      monthFilter: 'All Months',
      yearFilter: 'All Years',
      category: 'All Categories',
      fromDate: '',
      toDate: '',
      nameSearch: '',
      minAmount: '',
      maxAmount: '',
      transactionIdSearch: '',
      statusFilter: 'All'
    });
  };

  const resetToMonth = () => {
    setFilters(defaultFilters);
  };

  const removeFilter = (key) => {
    if (key === 'dateRange') {
      setFilters(prev => ({ ...prev, fromDate: '', toDate: '' }));
    } else if (key === 'amountRange') {
      setFilters(prev => ({ ...prev, minAmount: '', maxAmount: '' }));
    } else if (key === 'monthFilter') {
      setFilters(prev => ({ ...prev, monthFilter: 'All Months' }));
    } else if (key === 'yearFilter') {
      setFilters(prev => ({ ...prev, yearFilter: 'All Years' }));
    } else {
      setFilters(prev => ({ ...prev, [key]: key === 'category' ? 'All Categories' : key === 'statusFilter' ? 'All' : '' }));
    }
  };

  const isExpenseTx = (t) => {
    return t.classification?.toLowerCase() === 'expense' || 
           t.category?.toLowerCase().includes('expense') || 
           t.category?.toLowerCase().includes('salaries') || 
           parseFloat(t.amount) < 0;
  };

  // Separate Income and Expenses
  const incomeTransactions = useMemo(() => filteredTransactions.filter(t => !isExpenseTx(t)), [filteredTransactions]);
  const expenseTransactions = useMemo(() => filteredTransactions.filter(t => isExpenseTx(t)), [filteredTransactions]);

  // Calculate Summaries based on FILTERED data
  const summary = useMemo(() => {
    const income = incomeTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);
    const expenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netTotal: income - expenses
    };
  }, [incomeTransactions, expenseTransactions]);

  const displayMonth = filters.monthFilter !== 'All Months' ? filters.monthFilter : 'All Months';
  const displayYear = filters.yearFilter !== 'All Years' ? filters.yearFilter : 'All Years';

  const handlePrint = () => {
    window.print();
  };

  // Generate Active Filter Chips
  const activeFilterChips = [];
  if (filters.monthFilter !== 'All Months') {
    activeFilterChips.push({ key: 'monthFilter', label: `Month: ${filters.monthFilter}` });
  }
  if (filters.yearFilter !== 'All Years') {
    activeFilterChips.push({ key: 'yearFilter', label: `Year: ${filters.yearFilter}` });
  }
  if (filters.category !== 'All Categories') {
    activeFilterChips.push({ key: 'category', label: `Category: ${filters.category}` });
  }
  if (filters.fromDate || filters.toDate) {
    const fromStr = filters.fromDate ? formatDateGerman(filters.fromDate) : 'Any';
    const toStr = filters.toDate ? formatDateGerman(filters.toDate) : 'Any';
    activeFilterChips.push({ key: 'dateRange', label: `Date: ${fromStr} - ${toStr}` });
  }
  if (filters.nameSearch) {
    activeFilterChips.push({ key: 'nameSearch', label: `Name: ${filters.nameSearch}` });
  }
  if (filters.minAmount || filters.maxAmount) {
    const minStr = filters.minAmount ? `€${filters.minAmount}` : '0';
    const maxStr = filters.maxAmount ? `€${filters.maxAmount}` : 'Max';
    activeFilterChips.push({ key: 'amountRange', label: `Amount: ${minStr} - ${maxStr}` });
  }
  if (filters.transactionIdSearch) {
    activeFilterChips.push({ key: 'transactionIdSearch', label: `ID: ${filters.transactionIdSearch}` });
  }
  if (filters.statusFilter !== 'All') {
    activeFilterChips.push({ key: 'statusFilter', label: `Status: ${filters.statusFilter}` });
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>{displayMonth} {displayYear} Report | Admin Portal</title>
      </Helmet>
      
      <div className="flex-1 max-w-7xl mx-auto w-full pb-12 print-container">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <Link to="/admin/temple-accounts">
              <Button variant="outline" size="icon" className="rounded-full bg-card">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">Monthly Detail Report</h1>
              <p className="text-muted-foreground">{displayMonth} {displayYear}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant={isFilterOpen ? "secondary" : "outline"}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="gap-2 bg-card"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button onClick={handlePrint} className="bg-foreground hover:bg-foreground/90 text-background gap-2">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div className="bg-card p-5 rounded-xl shadow-sm border border-border mb-6 no-print animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Advanced Filters
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                  Clear All
                </Button>
                <Button variant="secondary" size="sm" onClick={resetToMonth} className="bg-primary/10 text-primary hover:bg-primary/20">
                  Reset to Current
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Month */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Month
                </Label>
                <Select value={filters.monthFilter} onValueChange={(v) => handleFilterChange('monthFilter', v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Months">All Months</SelectItem>
                    {MONTHS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Year
                </Label>
                <Select value={filters.yearFilter} onValueChange={(v) => handleFilterChange('yearFilter', v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Years">All Years</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
                <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-1.5 lg:col-span-2 xl:col-span-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Date Range</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    value={filters.fromDate} 
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="date" 
                    value={filters.toDate} 
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="bg-background"
                    min={filters.fromDate}
                  />
                </div>
              </div>

              {/* Name Search */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Member Name</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name..." 
                    value={filters.nameSearch}
                    onChange={(e) => handleFilterChange('nameSearch', e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount Range (€)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    placeholder="Min" 
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="number" 
                    placeholder="Max" 
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    className="bg-background"
                    min={filters.minAmount}
                  />
                </div>
              </div>

              {/* Transaction ID */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Transaction ID</Label>
                <Input 
                  placeholder="Search ID..." 
                  value={filters.transactionIdSearch}
                  onChange={(e) => handleFilterChange('transactionIdSearch', e.target.value)}
                  className="bg-background font-mono text-sm"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                <Select value={filters.statusFilter} onValueChange={(v) => handleFilterChange('statusFilter', v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
            <span className="text-sm text-muted-foreground font-medium">Active Filters:</span>
            {activeFilterChips.map(chip => (
              <Badge key={chip.key} variant="secondary" className="bg-card border-border text-foreground gap-1.5 py-1 px-2.5">
                {chip.label}
                <button onClick={() => removeFilter(chip.key)} className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Print Header (Visible only when printing) */}
        <div className="hidden print-only mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Sri Siththi Vinayagar Tempel Kultur Verein e.V</h1>
          <h2 className="text-xl font-semibold text-foreground/80">Financial Report: {displayMonth} {displayYear}</h2>
          <p className="text-sm text-muted-foreground mt-2">Generated on: {formatDateGerman(new Date())}</p>
          {activeFilterChips.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Filtered by: {activeFilterChips.map(c => c.label).join(' | ')}
            </p>
          )}
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">Total Income</p>
            <p className="text-2xl font-bold text-emerald-600">€{summary.totalIncome.toFixed(2)}</p>
          </Card>
          <Card className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">€{summary.totalExpenses.toFixed(2)}</p>
          </Card>
          <Card className={`p-5 rounded-xl border shadow-sm ${summary.netTotal >= 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200'}`}>
            <p className={`text-sm font-medium mb-1 ${summary.netTotal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net Balance</p>
            <p className={`text-2xl font-bold ${summary.netTotal >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
              €{summary.netTotal.toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Income Transactions Section */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Income Transactions
            </h3>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
              Subtotal: €{summary.totalIncome.toFixed(2)}
            </Badge>
          </div>
          <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Name / Paid By</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Amount (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No income records found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomeTransactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap">{formatDateGerman(t.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 font-normal">
                            {t.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{t.member_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{t.transaction_id || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-700 whitespace-nowrap">
                          +{Math.abs(parseFloat(t.amount)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Expense Transactions Section */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" /> Expense Transactions
            </h3>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1">
              Subtotal: €{summary.totalExpenses.toFixed(2)}
            </Badge>
          </div>
          <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Name / Paid To</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Amount (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No expense records found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenseTransactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap">{formatDateGerman(t.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-red-50/50 text-red-700 border-red-200 font-normal">
                            {t.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{t.member_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{t.transaction_id || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-red-600 whitespace-nowrap">
                          -{Math.abs(parseFloat(t.amount)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminMonthlyDetailReport;