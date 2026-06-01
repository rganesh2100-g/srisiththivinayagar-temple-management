import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus.js';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, TrendingUp, Calendar, ChevronDown, ChevronUp, Lock, CreditCard, Users, Clock, AlertTriangle } from 'lucide-react';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FinancialTransparency = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Use our centralized subscription status hook
  const { 
    isPremium, 
    isApproved, 
    isPendingApproval, 
    isRenewalPending, 
    isExpired,
    loading: accessLoading 
  } = useSubscriptionStatus(currentUser);
  
  const [loadingData, setLoadingData] = useState(false);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [monthData, setMonthData] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [subSummary, setSubSummary] = useState({ total: 0, monthly: 0, yearly: 0 });

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (isApproved && !isExpired) {
      fetchYearlyData();
      fetchSubscriptionIncome();
    }
  }, [currentUser, navigate, isApproved, isExpired, currentYear]);

  const fetchYearlyData = async () => {
    try {
      setLoadingData(true);
      const records = await pb.collection('temple_accounts').getFullList({
        filter: `year = ${currentYear}`,
        $autoCancel: false
      });
      
      let income = 0;
      let expense = 0;
      
      records.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        const isExp = t.category?.toLowerCase().includes('expense') || 
                      t.category?.toLowerCase().includes('salaries') || 
                      amt < 0;
        if (isExp) expense += Math.abs(amt);
        else income += amt;
      });
      
      setSummary({ totalIncome: income, totalExpense: expense });
    } catch (err) {
      console.error('Error fetching financials:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSubscriptionIncome = async () => {
    try {
      const records = await pb.collection('temple_accounts').getFullList({
        filter: `category = "Subscription" && status = "Approved" && year = ${currentYear}`,
        sort: '-date',
        $autoCancel: false
      });
      
      setSubscriptionData(records);
      
      const totals = records.reduce((acc, curr) => {
        const amt = parseFloat(curr.amount) || 0;
        acc.total += amt;
        if (curr.subscription_type === 'Monthly') acc.monthly += amt;
        if (curr.subscription_type === 'Yearly') acc.yearly += amt;
        return acc;
      }, { total: 0, monthly: 0, yearly: 0 });
      
      setSubSummary(totals);
    } catch (err) {
      console.error('Error fetching subscription income:', err);
    }
  };

  const handleMonthClick = async (month) => {
    if (expandedMonth === month) {
      setExpandedMonth(null);
      return;
    }
    
    setExpandedMonth(month);
    setLoadingMonth(true);
    
    try {
      const records = await pb.collection('temple_accounts').getFullList({
        filter: `month = "${month}" && year = ${currentYear}`,
        sort: '-date',
        $autoCancel: false
      });
      setMonthData(records);
    } catch (err) {
      console.error('Error fetching month data:', err);
    } finally {
      setLoadingMonth(false);
    }
  };

  const Layout = (currentUser?.role === 'admin' || currentUser?.account_type === 'Admin' || currentUser?.account_type === 'admin') 
    ? AdminLayout 
    : DashboardLayout;

  if (accessLoading || (isApproved && !isExpired && loadingData)) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B0000]" />
        </div>
      </Layout>
    );
  }

  const renderAccessMessage = () => {
    if (!isPremium) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Premium Members Only</h2>
          <p className="text-gray-600 mb-8">
            Premium membership required to view temple accounts. Please upgrade your membership to access detailed financial transparency reports.
          </p>
          <Button asChild className="w-full bg-[#8B0000] hover:bg-[#6b0000] text-white">
            <Link to="/membership">{t('membershipPage.upgrade')}</Link>
          </Button>
        </div>
      );
    }

    if (isPendingApproval) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Approval Pending</h2>
          <p className="text-gray-600 mb-8">
            Your account is pending admin approval. You will gain access once approved.
          </p>
        </div>
      );
    }

    if (isRenewalPending) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Renewal Pending</h2>
          <p className="text-gray-600 mb-8">
            Your renewal payment is pending admin approval. You will regain full access once processed.
          </p>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Subscription Expired</h2>
          <p className="text-gray-600 mb-8">
            Your subscription has expired. Please renew to continue accessing this page.
          </p>
          <Button asChild className="w-full bg-[#8B0000] hover:bg-[#6b0000] text-white">
            <Link to="/renew-subscription">Renew Subscription</Link>
          </Button>
        </div>
      );
    }

    return null;
  };

  const accessMessage = renderAccessMessage();

  if (accessMessage) {
    return (
      <Layout>
        <Helmet>
          <title>{t('header.financialTransparency')} | Admin Action Required</title>
        </Helmet>
        <div className="flex-1 p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
          {accessMessage}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{t('header.financialTransparency')} | {t('nav.templeName')}</title>
      </Helmet>
      
      <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#8B0000]" style={{ fontFamily: 'Playfair Display, serif' }}>
            {t('header.financialTransparency')}
          </h1>
          <p className="text-gray-600 mt-2">Detailed financial reports for {currentYear}.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Income (YTD)</p>
              <p className="text-2xl font-bold text-gray-900">€{summary.totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Expenses (YTD)</p>
              <p className="text-2xl font-bold text-gray-900">€{summary.totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#8B0000]" /> Subscription Income
            </h2>
            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
              Total: €{subSummary.total.toFixed(2)}
            </Badge>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-blue-900">Monthly Plans</span>
                </div>
                <span className="text-lg font-bold text-blue-900">€{subSummary.monthly.toFixed(2)}</span>
              </div>
              <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-md">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-purple-900">Yearly Plans</span>
                </div>
                <span className="text-lg font-bold text-purple-900">€{subSummary.yearly.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No subscription income recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptionData.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateGerman(entry.date)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {entry.receipt_id || '-'}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {entry.member_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={entry.subscription_type === 'Yearly' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                            {entry.subscription_type || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          €{parseFloat(entry.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#8B0000]" /> General Monthly Reports
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {months.map((month, index) => {
              const isExpanded = expandedMonth === month;
              
              return (
                <div key={month} className="flex flex-col">
                  <button 
                    onClick={() => handleMonthClick(month)}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors w-full text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono text-sm w-6">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-lg font-medium text-gray-900">
                        {month} {currentYear}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-gray-50/50 border-t border-gray-50">
                      {loadingMonth ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                      ) : monthData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No transactions recorded for {month} {currentYear}.
                        </div>
                      ) : (
                        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount (€)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {monthData.map((t) => {
                                const isExpense = t.category?.toLowerCase().includes('expense') || 
                                                  t.category?.toLowerCase().includes('salaries') || 
                                                  parseFloat(t.amount) < 0;
                                return (
                                  <TableRow key={t.id}>
                                    <TableCell className="whitespace-nowrap text-sm">{formatDateGerman(t.date)}</TableCell>
                                    <TableCell className="text-sm">
                                      {t.category}
                                      {t.entry_type && <span className="ml-2 text-xs text-gray-400">({t.entry_type})</span>}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium text-sm whitespace-nowrap ${isExpense ? 'text-red-600' : 'text-gray-900'}`}>
                                      {isExpense ? '-' : ''}{Math.abs(parseFloat(t.amount)).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FinancialTransparency;