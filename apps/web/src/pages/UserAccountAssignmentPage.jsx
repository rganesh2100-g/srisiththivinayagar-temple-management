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
import { Search, LockKeyhole, RefreshCw, CheckCircle2 } from 'lucide-react';

const UserAccountAssignmentPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let filterQuery = '';
      if (debouncedSearch) {
        const safeSearch = debouncedSearch.replace(/"/g, '\\"');
        filterQuery = `name ~ "${safeSearch}" || email ~ "${safeSearch}"`;
      }

      // Using getFullList for simplified immediate assignment page (or getList if large scale)
      const result = await pb.collection('users').getList(1, 50, {
        filter: filterQuery,
        sort: '-created',
        $autoCancel: false
      });
      
      setUsers(result.items || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to fetch user list for assignment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch]);

  const handleAssignAccountType = async (userId, newType) => {
    setUpdatingId(userId);
    try {
      const updatedUser = await pb.collection('users').update(userId, {
        account_type: newType
      }, { $autoCancel: false });
      
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      toast.success(`Account assigned as ${newType} successfully`);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to assign account type');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Account Type Assignment | Admin Dashboard</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shadow-sm">
              <LockKeyhole className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                Account Assignment
              </h1>
              <p className="mt-1 text-muted-foreground">
                Rapidly assign Free Membership or Premium Membership tiers to active users.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%] font-semibold">User Name</TableHead>
                  <TableHead className="w-[30%] font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Current Account Type</TableHead>
                  <TableHead className="text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-10 w-[180px] ml-auto rounded-lg" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => {
                    const currentType = user.account_type || 'Free Membership';
                    const isPremium = currentType === 'Premium Membership';
                    
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{user.name || 'Unnamed User'}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={isPremium ? 'border-amber-500/30 text-amber-700 bg-amber-500/10 dark:text-amber-400' : 'border-primary/30 text-primary bg-primary/10'}
                          >
                            {currentType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select 
                            disabled={updatingId === user.id}
                            value={currentType} 
                            onValueChange={(val) => handleAssignAccountType(user.id, val)}
                          >
                            <SelectTrigger className="w-[200px] ml-auto bg-background">
                              {updatingId === user.id ? (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                  <RefreshCw className="w-4 h-4 animate-spin" /> Updating...
                                </div>
                              ) : (
                                <SelectValue placeholder="Assign Type" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Free Membership">Free Membership</SelectItem>
                              <SelectItem value="Premium Membership">
                                <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                                  <CheckCircle2 className="w-4 h-4" /> Premium Membership
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserAccountAssignmentPage;