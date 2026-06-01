import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { getFullList, listRecords } from '@/lib/pbHelper.js';
import AdminLayout from '@/components/AdminLayout.jsx';
import { 
  Users, Heart, Calendar, CreditCard, CheckSquare, 
  TrendingUp, Activity, AlertCircle, RefreshCw, PlusCircle, Settings
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.jsx";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    poojaRevenue: 0,
    approvedBookings: 0,
    totalDonations: 0,
    totalPoojas: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        usersData,
        pendingPoojasData,
        poojaAccounts,
        donationsData,
        poojasData
      ] = await Promise.all([
        listRecords('users', 1, 1),
        listRecords('pooja_bookings', 1, 1, { filter: 'status="Pending Approval" || status="pending"' }),
        getFullList('temple_accounts', { filter: 'category="Pooja Booking"' }),
        getFullList('donations', { filter: 'status="approved"' }),
        listRecords('poojas', 1, 1, { filter: 'status="published"' })
      ]);

      const totalPoojaRevenue = poojaAccounts.reduce((sum, record) => sum + (record.amount || 0), 0);
      const totalDonations = donationsData.reduce((sum, record) => sum + (record.amount || 0), 0);

      setStats({
        totalUsers: usersData.totalItems,
        pendingApprovals: pendingPoojasData.totalItems,
        poojaRevenue: totalPoojaRevenue,
        approvedBookings: poojaAccounts.length,
        totalDonations: totalDonations,
        totalPoojas: poojasData.totalItems
      });
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load dashboard metrics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: t('admin.pendingApprovals', 'Pending Approvals'),
      value: stats.pendingApprovals,
      icon: CheckSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      link: '/admin/pooja-approvals',
      linkText: t('admin.reviewApprovals', 'Review Approvals')
    },
    {
      title: t('admin.poojaRevenue', 'Pooja Revenue'),
      value: `€${stats.poojaRevenue.toLocaleString()}`,
      subtitle: `${stats.approvedBookings} ${t('admin.approvedBookings', 'Approved Bookings')}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      link: '/admin/temple-accounts',
      linkText: t('admin.viewAccounts', 'View Accounts')
    },
    {
      title: t('admin.totalUsers', 'Total Users'),
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      link: '/admin/users',
      linkText: t('admin.users', 'Manage Users')
    },
    {
      title: t('admin.totalDonations', 'Total Donations'),
      value: `€${stats.totalDonations.toLocaleString()}`,
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      link: '/admin/donations',
      linkText: t('admin.viewDonations', 'View Donations')
    }
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.dashboard', 'Admin Dashboard')} | {t('nav.templeName', 'Temple Portal')}</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/admin/dashboard">Admin</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard Overview</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
              {t('admin.dashboard', 'Dashboard Overview')}
            </h1>
            <p className="text-muted-foreground">{t('admin.overview', 'Monitor temple activities and manage operations.')}</p>
          </div>
          <Button variant="outline" onClick={fetchDashboardStats} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardStats} className="bg-background">
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <Skeleton className="h-12 w-12 rounded-xl mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-medium mb-1">{card.title}</h3>
                  <div className="text-3xl font-bold text-foreground mb-1 tracking-tight">{card.value}</div>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground mb-4">{card.subtitle}</p>
                  )}
                  <div className="mt-auto pt-4 border-t border-border/50">
                    <Link to={card.link} className={`text-sm font-semibold ${card.color} hover:underline flex items-center gap-1.5`}>
                      {card.linkText} &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Quick Actions
            </h3>
            <div className="space-y-3">
              <Link to="/admin/poojas/create" className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">Create New Pooja</p>
                    <p className="text-xs text-muted-foreground">Add a new pooja offering to the catalog</p>
                  </div>
                </div>
              </Link>
              
              <Link to="/admin/pooja-approvals" className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">Pending Approvals</p>
                    <p className="text-xs text-muted-foreground">Review devotee booking requests</p>
                  </div>
                </div>
                {stats.pendingApprovals > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {stats.pendingApprovals} New
                  </span>
                )}
              </Link>

              <Link to="/admin/users" className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">Manage Users</p>
                    <p className="text-xs text-muted-foreground">Update roles, block users, or change membership status</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-center items-center text-center">
             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
               <Calendar className="w-8 h-8 text-muted-foreground" />
             </div>
             <h3 className="text-xl font-bold mb-2">Total Published Poojas</h3>
             <p className="text-4xl font-extrabold text-primary mb-2">{stats.totalPoojas}</p>
             <p className="text-muted-foreground">Active offerings available to devotees</p>
             <Button asChild variant="outline" className="mt-6">
               <Link to="/admin/poojas/create">Manage Catalog</Link>
             </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;