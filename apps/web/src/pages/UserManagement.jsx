import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Search, Users, ShieldCheck, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      let filterQuery = '';
      if (debouncedSearch) {
        const safeSearch = debouncedSearch.replace(/"/g, '\\"');
        filterQuery = `name ~ "${safeSearch}" || email ~ "${safeSearch}"`;
      }

      const result = await pb.collection('users').getList(page, limit, {
        filter: filterQuery,
        sort: '-created',
        $autoCancel: false
      });
      
      setUsers(result.items || []);
      setTotal(result.totalItems || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'An error occurred while loading users.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountTypeChange = async (userId, newValue) => {
    setActionLoading(userId);
    try {
      const data = await pb.collection('users').update(userId, { 
        account_type: newValue 
      }, { $autoCancel: false });
      
      toast.success(`Account type updated to ${newValue}.`);
      
      setUsers(prevUsers => 
        prevUsers.map(u => u.id === userId 
          ? { ...u, account_type: data.account_type, account_type_status: data.account_type_status } 
          : u
        )
      );
    } catch (error) {
      console.error('Error updating account type:', error);
      toast.error(error.message || 'Failed to update user account type.');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const TableSkeleton = () => (
    <div className="space-y-4 py-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-border/50 last:border-0">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <div className="flex gap-4 items-center">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <Helmet>
        <title>User Management | Admin Dashboard</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                User Management
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage members, update explicit account types, and review statuses.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchUsers} className="gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>

        {/* Search */}
        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search users by name or email..." 
              className="pl-9 bg-background h-11 rounded-xl transition-all duration-200 focus-visible:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card rounded-2xl shadow-sm border border-border/50">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Failed to load users</h3>
            <div className="text-sm text-muted-foreground mb-6 max-w-md mx-auto p-3 bg-muted/50 rounded-lg border border-border/50">
              {error}
            </div>
            <Button onClick={fetchUsers} variant="default" className="rounded-xl shadow-sm">
              Retry Fetching Users
            </Button>
          </div>
        ) : (
          /* Users Table */
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden transition-all duration-200">
            <div className="overflow-x-auto">
              {loading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 shadow-sm border border-border/50">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query.
                  </p>
                  {search && (
                    <Button variant="link" onClick={() => setSearch('')} className="mt-2 text-primary hover:text-primary/80">
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40%] font-semibold">User Details</TableHead>
                      <TableHead className="font-semibold">Explicit Account Type</TableHead>
                      <TableHead className="text-right font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const accType = user.account_type || 'Free Membership';
                      return (
                        <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors duration-200">
                          <TableCell>
                            <div className="flex flex-col py-1">
                              <span className="font-medium text-foreground text-base mb-0.5">
                                {user.name || 'Unnamed User'}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              disabled={actionLoading === user.id}
                              value={accType} 
                              onValueChange={(val) => handleAccountTypeChange(user.id, val)}
                            >
                              <SelectTrigger className="w-[200px] bg-background rounded-lg shadow-sm border-border/50 focus:ring-primary/20 transition-all duration-200">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-lg border-border/50">
                                <SelectItem value="Free Membership" className="rounded-lg cursor-pointer font-medium">Free Membership</SelectItem>
                                <SelectItem value="Premium Membership" className="rounded-lg cursor-pointer font-medium text-amber-600 dark:text-amber-400">
                                  Premium Membership
                                </SelectItem>
                                <SelectItem value="admin" className="rounded-lg cursor-pointer">
                                  <div className="flex items-center gap-2 text-primary font-medium">
                                    <ShieldCheck className="w-4 h-4" /> Admin
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant="outline" 
                              className={
                                user.account_type_status === 'enabled' || !user.account_type_status
                                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800/30 dark:bg-emerald-500/10' 
                                  : 'text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800/30 dark:bg-amber-500/10'
                              }
                            >
                              {user.account_type_status === 'enabled' || !user.account_type_status ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
            
            {/* Pagination */}
            {!loading && users.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/10 gap-4">
                <span className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * limit, total)}</span> of <span className="font-medium text-foreground">{total}</span> users
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-1 h-9 rounded-lg shadow-sm hover:bg-background hover:text-foreground transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="gap-1 h-9 rounded-lg shadow-sm hover:bg-background hover:text-foreground transition-all duration-200"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserManagement;