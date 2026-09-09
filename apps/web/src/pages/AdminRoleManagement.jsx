import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout.jsx';
import apiServerClient from '@/utils/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShieldAlert, ShieldCheck, Trash2, UserCog, User, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const AdminRoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null); // Ensure error state is cleared on retry
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        roleFilter: roleFilter
      });
      
      const response = await apiServerClient.fetch(`/users?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.data) {
        setUsers(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        const apiError = data.error || 'Failed to fetch users from server';
        setError(apiError);
        console.error('API Error fetching users:', data);
      }
    } catch (err) {
      console.error('Full error details fetching users:', err);
      // Store the raw error object or string to be safely rendered in the UI
      setError(err); 
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      const response = await apiServerClient.fetch(`/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      const data = await response.json();
      
      if (response.ok && data.data) {
        toast.success(`User role updated to ${newRole}`);
        // Optimistically update the local state to avoid full refetch
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u)
        );
      } else {
        const apiError = data.error || 'Failed to update role';
        toast.error(apiError);
        console.error('API Error updating role:', data);
      }
    } catch (err) {
      console.error('Full error details updating role:', err);
      const safeErrorMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'An error occurred';
      toast.error(`Failed to update role. Please try again. Details: ${safeErrorMsg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    setActionLoading(userToDelete.id);
    try {
      // Using PocketBase directly for deletion as per typical architecture
      await pb.collection('users').delete(userToDelete.id, { $autoCancel: false });
      
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      
      // If we deleted the last user on the page, go to previous page
      if (users.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchUsers();
      }
    } catch (err) {
      console.error('Full error details deleting user:', err);
      const safeErrorMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'An error occurred';
      toast.error(`Failed to delete user. Please try again. Details: ${safeErrorMsg}`);
    } finally {
      setActionLoading(null);
      setUserToDelete(null);
    }
  };

  const TableSkeleton = () => (
    <div className="space-y-4 py-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <Helmet>
        <title>Role Management | Admin Dashboard</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Role Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage user roles, administrative access, and system accounts.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by email or name..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-background">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
              <SelectItem value="user">Users Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card rounded-2xl shadow-lg border border-border/50">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Failed to load users. Please try again.</h3>
            
            {/* Safe error rendering logic */}
            <div className="text-sm text-muted-foreground mb-6 max-w-md mx-auto p-3 bg-muted/50 rounded-lg break-words text-left font-mono">
              {typeof error === 'string' 
                ? error 
                : (error?.message || JSON.stringify(error) || 'An unknown error occurred')}
            </div>
            
            <Button onClick={fetchUsers} variant="default" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry Fetching Users
            </Button>
          </div>
        ) : (
          /* Users Table */
          <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="px-6 py-4">
                  <TableSkeleton />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <UserCog className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query or role filters.
                  </p>
                  {(search || roleFilter !== 'all') && (
                    <Button 
                      variant="link" 
                      onClick={() => { setSearch(''); setRoleFilter('all'); }}
                      className="mt-2 text-primary"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {user.role === 'admin' ? (
                                <ShieldCheck className="w-5 h-5 text-primary" />
                              ) : (
                                <User className="w-5 h-5 text-primary/70" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.name || user.full_name || 'N/A'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={user.role === 'admin' ? 'bg-primary text-primary-foreground' : ''}
                          >
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={user.verified ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-amber-600 border-amber-200 bg-amber-50'}>
                            {user.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {user.role === 'admin' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRoleChange(user.id, 'user')}
                                disabled={actionLoading === user.id}
                                className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                              >
                                Demote to User
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRoleChange(user.id, 'admin')}
                                disabled={actionLoading === user.id}
                                className="text-primary border-primary/20 hover:bg-primary/5"
                              >
                                Make Admin
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(user)}
                              disabled={actionLoading === user.id}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            
            {/* Pagination */}
            {!loading && users.length > 0 && (
              <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/10">
                <span className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="gap-1"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription className="pt-3">
              Are you sure you want to permanently delete the account for <span className="font-semibold text-foreground">{userToDelete?.email}</span>?
              This action cannot be undone and will remove all associated user data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading === userToDelete?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading === userToDelete?.id}
            >
              {actionLoading === userToDelete?.id ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRoleManagement;