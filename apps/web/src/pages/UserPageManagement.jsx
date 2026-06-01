import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import AdminLayout from '@/components/AdminLayout.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Users, Shield, Star, User, AlertCircle, RefreshCw } from 'lucide-react';

const UserPageManagement = () => {
  const [users, setUsers] = useState({
    admins: [],
    premium: [],
    free: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all users. We attempt to expand subscriptions_via_user to check subscription status,
      // but also fallback to the user's membership_type field.
      const records = await pb.collection('users').getFullList({
        expand: 'subscriptions_via_user',
        sort: '-created',
        $autoCancel: false
      });

      const categorized = {
        admins: [],
        premium: [],
        free: []
      };

      records.forEach(user => {
        if (user.role === 'admin') {
          categorized.admins.push(user);
        } else {
          // Check if they have a premium subscription or their membership_type is premium
          const hasPremiumSub = user.expand?.subscriptions_via_user?.some(
            sub => sub.plan_type === 'premium' && sub.status === 'active'
          );
          
          if (user.membership_type === 'premium' || hasPremiumSub) {
            categorized.premium.push(user);
          } else {
            categorized.free.push(user);
          }
        }
      });

      setUsers(categorized);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users from the database. Please try again.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const UserTable = ({ data, emptyMessage }) => {
    if (loading) {
      return (
        <div className="space-y-4 py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-8 w-[100px] rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No users found</h3>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user) => (
              <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{user.name || 'Unnamed User'}</span>
                      <span className="text-xs text-muted-foreground font-mono mt-0.5">ID: {user.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{user.email}</div>
                  {user.phone && <div className="text-xs text-muted-foreground mt-0.5">{user.phone}</div>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(user.created)}
                </TableCell>
                <TableCell className="text-right">
                  {user.verified ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800/30">Verified</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800/30">Unverified</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>User Management | Admin Dashboard</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                User Management
              </h1>
              <p className="mt-1 text-muted-foreground">
                View and manage users categorized by their membership tiers.
              </p>
            </div>
          </div>
          <button 
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card rounded-2xl shadow-sm border border-border/50">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Connection Error</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">{error}</p>
            <button 
              onClick={fetchUsers}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        ) : (
          <Tabs defaultValue="premium" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-auto p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="admin" className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Admins</span>
                  {!loading && (
                    <Badge variant="secondary" className="ml-1.5 bg-muted-foreground/15">{users.admins.length}</Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="premium" className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">Premium</span>
                  {!loading && (
                    <Badge variant="secondary" className="ml-1.5 bg-muted-foreground/15">{users.premium.length}</Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="free" className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Free Users</span>
                  {!loading && (
                    <Badge variant="secondary" className="ml-1.5 bg-muted-foreground/15">{users.free.length}</Badge>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="mt-0 outline-none">
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Administrator Accounts
                  </CardTitle>
                  <CardDescription>Users with full system access and management capabilities.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <UserTable data={users.admins} emptyMessage="No administrator accounts found." />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="premium" className="mt-0 outline-none">
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-amber-500/5 border-b border-border/50 pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Premium Members
                  </CardTitle>
                  <CardDescription>Users with active premium subscriptions and exclusive access.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <UserTable data={users.premium} emptyMessage="No premium members found." />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="free" className="mt-0 outline-none">
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    Free Members
                  </CardTitle>
                  <CardDescription>Standard users with basic access to the platform.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <UserTable data={users.free} emptyMessage="No free members found." />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserPageManagement;