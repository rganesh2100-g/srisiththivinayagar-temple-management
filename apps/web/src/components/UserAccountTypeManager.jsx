import React, { useState, useEffect } from 'react';
import pocketbaseClient from '@/lib/pocketbaseClient.js';
import { useToast } from '@/hooks/use-toast.js';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent 
} from '@/components/ui/card.jsx';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Shield, Zap, User, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const UserAccountTypeManager = () => {
  const [users, setUsers] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both users and account types directly from PocketBase in parallel
      const [usersRes, accountTypesRes] = await Promise.all([
        pocketbaseClient.collection('users').getFullList({ 
          sort: '-created',
          $autoCancel: false 
        }),
        pocketbaseClient.collection('account_types').getFullList({ 
          sort: 'name',
          $autoCancel: false 
        })
      ]);
      
      setUsers(usersRes || []);
      setAccountTypes(accountTypesRes || []);
    } catch (err) {
      console.error('Error fetching data from PocketBase:', err);
      setError(err.message || 'Failed to load users and account types.');
      toast({
        title: 'Connection Error',
        description: 'Could not load data from the database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccountTypeChange = async (userId, newType) => {
    try {
      // Update directly in PocketBase
      await pocketbaseClient.collection('users').update(
        userId, 
        { account_type: newType }, 
        { $autoCancel: false }
      );

      // Update local state to reflect the change immediately
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, account_type: newType } : user
        )
      );

      toast({
        title: 'Account Type Updated',
        description: `User has been successfully moved to ${newType}.`,
      });
    } catch (err) {
      console.error('Error updating user:', err);
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not save the new account type.',
        variant: 'destructive',
      });
    }
  };

  // Dynamic grouping based on database account types
  const groupedUsers = {};
  accountTypes.forEach(type => {
    groupedUsers[type.name] = [];
  });
  groupedUsers['Unassigned'] = []; // Fallback for users without a matching type

  users.forEach(user => {
    const userType = (user.account_type || '').toLowerCase();
    const matchedType = accountTypes.find(t => t.name.toLowerCase() === userType);
    
    if (matchedType) {
      groupedUsers[matchedType.name].push(user);
    } else {
      groupedUsers['Unassigned'].push(user);
    }
  });

  const getSectionIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('admin')) return Shield;
    if (lower.includes('premium')) return Zap;
    return User;
  };

  const getSectionColor = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('admin')) return 'text-primary bg-primary/10 border-primary/20';
    if (lower.includes('premium')) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    if (name === 'Unassigned') return 'text-destructive bg-destructive/10 border-destructive/20';
    return 'text-muted-foreground bg-muted border-border';
  };

  if (loading) {
    return (
      <div className="space-y-6 mt-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">User Account Management</h2>
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-6 rounded-xl bg-destructive/5 border border-destructive/20 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-destructive/80 mb-3" />
        <h3 className="text-lg font-semibold text-destructive">Failed to load system data</h3>
        <p className="text-sm text-destructive/80 mt-1 max-w-md">{error}</p>
        <Button 
          variant="outline" 
          className="mt-6 gap-2"
          onClick={fetchData}
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">User Account Management</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage platform access and assign user tiers directly.</p>
          </div>
        </div>
        <Badge variant="secondary" className="px-4 py-1.5 text-sm rounded-full font-medium">
          {users.length} Total Users
        </Badge>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No Users Found</h3>
          <p className="text-muted-foreground mt-1">There are currently no users registered in the database.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedUsers).map(([sectionName, sectionUsers]) => {
            // Hide the unassigned section if empty to keep UI clean
            if (sectionName === 'Unassigned' && sectionUsers.length === 0) return null;

            const Icon = getSectionIcon(sectionName);
            const colorClass = getSectionColor(sectionName);
            const sectionTypeConfig = accountTypes.find(t => t.name === sectionName);

            return (
              <Card key={sectionName} className="overflow-hidden border-border shadow-sm transition-all hover:shadow-md">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg border", colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg font-semibold">{sectionName}</CardTitle>
                          <Badge variant="secondary" className="rounded-full bg-background border-border">
                            {sectionUsers.length}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1 text-sm">
                          {sectionTypeConfig?.description || (sectionName === 'Unassigned' 
                            ? 'Users without a recognized membership tier.' 
                            : 'Users assigned to this tier.')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {sectionUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No users currently assigned to this tier.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {sectionUsers.map((user) => (
                        <div 
                          key={user.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:px-6 bg-background hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-semibold shadow-sm border border-border">
                              {(user.name || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {user.name || 'Unnamed User'}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <Select
                              value={accountTypes.some(t => t.name === user.account_type) ? user.account_type : undefined}
                              onValueChange={(value) => handleAccountTypeChange(user.id, value)}
                            >
                              <SelectTrigger className="w-[160px] h-9 bg-background shadow-sm">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                              <SelectContent>
                                {accountTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.name}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserAccountTypeManager;