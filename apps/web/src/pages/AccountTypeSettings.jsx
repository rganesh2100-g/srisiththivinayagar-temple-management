import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Shield, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, XCircle, 
  Users, LayoutTemplate, Globe, Loader2, FileText
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

import AdminLayout from '@/components/AdminLayout.jsx';
import AccountTypeAccessMatrix from '@/components/AccountTypeAccessMatrix.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Separator } from '@/components/ui/separator.jsx';

const AccountTypeSettings = () => {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState('types');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Data State ---
  const [accountTypes, setAccountTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pageAccesses, setPageAccesses] = useState([]);
  const [pages, setPages] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Modal States ---
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: null, id: null, name: '' });
  
  const [typeModal, setTypeModal] = useState({ isOpen: false, mode: 'create', data: null });
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, mode: 'create', data: null });
  const [accessModal, setAccessModal] = useState({ isOpen: false, mode: 'create', data: null });
  const [globalAccessModal, setGlobalAccessModal] = useState({ isOpen: false, mode: 'create', data: null });

  // --- Form States ---
  const [typeForm, setTypeForm] = useState({ name: '', description: '', is_enabled: true });
  const [assignmentForm, setAssignmentForm] = useState({ userId: '', accountTypeId: '' });
  const [accessForm, setAccessForm] = useState({ pageRoute: '', userId: 'all', accessLevel: 'view', isActive: true });
  const [globalAccessForm, setGlobalAccessForm] = useState({ pageRoute: '', accessLevel: 'view', isActive: true });

  // --- Fetch Data ---
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [typesRes, usersRes, assignmentsRes, accessRes, pagesRes] = await Promise.all([
        pb.collection('account_types').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('users').getFullList({ sort: 'name', $autoCancel: false }),
        pb.collection('user_account_assignments').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('page_access').getFullList({ sort: 'pageRoute', $autoCancel: false }),
        pb.collection('pages').getFullList({ sort: 'name', $autoCancel: false })
      ]);
      
      setAccountTypes(typesRes);
      setUsers(usersRes);
      setAssignments(assignmentsRes);
      setPageAccesses(accessRes);
      setPages(pagesRes);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load configuration data. Please try again.');
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Helpers ---
  const getUserName = (userId) => {
    if (userId === 'all' || !userId) return 'All Users';
    const user = users.find(u => u.id === userId);
    return user ? (user.name || user.email) : 'Unknown User';
  };

  const getAccountTypeName = (typeId) => {
    const type = accountTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown Type';
  };

  // --- Delete Handler (Generic) ---
  const handleDelete = async () => {
    if (!deleteConfig.id || !deleteConfig.type) return;
    
    setIsSubmitting(true);
    try {
      await pb.collection(deleteConfig.type).delete(deleteConfig.id, { $autoCancel: false });
      toast.success('Record deleted successfully');
      setDeleteConfig({ isOpen: false, type: null, id: null, name: '' });
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SECTION 1: ACCOUNT TYPES
  // ==========================================
  const openTypeModal = (mode, data = null) => {
    setTypeForm(data ? { 
      name: data.name, 
      description: data.description || '', 
      is_enabled: data.is_enabled 
    } : { name: '', description: '', is_enabled: true });
    setTypeModal({ isOpen: true, mode, data });
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    if (!typeForm.name.trim()) return toast.error('Name is required');

    setIsSubmitting(true);
    try {
      if (typeModal.mode === 'create') {
        await pb.collection('account_types').create(typeForm, { $autoCancel: false });
        toast.success('Account type created');
      } else {
        await pb.collection('account_types').update(typeModal.data.id, typeForm, { $autoCancel: false });
        toast.success('Account type updated');
      }
      setTypeModal({ isOpen: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      console.error('Save type error:', err);
      toast.error(err.message || 'Failed to save account type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTypeStatus = async (type) => {
    try {
      await pb.collection('account_types').update(type.id, { is_enabled: !type.is_enabled }, { $autoCancel: false });
      toast.success(`Account type ${!type.is_enabled ? 'enabled' : 'disabled'}`);
      setAccountTypes(prev => prev.map(t => t.id === type.id ? { ...t, is_enabled: !t.is_enabled } : t));
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error('Failed to update status');
    }
  };

  // ==========================================
  // SECTION 2: USER ASSIGNMENTS
  // ==========================================
  const openAssignmentModal = (mode, data = null) => {
    setAssignmentForm(data ? { 
      userId: data.userId, 
      accountTypeId: data.accountTypeId 
    } : { userId: '', accountTypeId: '' });
    setAssignmentModal({ isOpen: true, mode, data });
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.userId || !assignmentForm.accountTypeId) {
      return toast.error('User and Account Type are required');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...assignmentForm,
        assignedAt: new Date().toISOString()
      };

      if (assignmentModal.mode === 'create') {
        await pb.collection('user_account_assignments').create(payload, { $autoCancel: false });
        toast.success('Assignment created');
      } else {
        await pb.collection('user_account_assignments').update(assignmentModal.data.id, payload, { $autoCancel: false });
        toast.success('Assignment updated');
      }
      setAssignmentModal({ isOpen: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      console.error('Save assignment error:', err);
      toast.error(err.message || 'Failed to save assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SECTION 3: PAGE ACCESS
  // ==========================================
  const openAccessModal = (mode, data = null) => {
    setAccessForm(data ? { 
      pageRoute: data.pageRoute, 
      userId: data.userId || 'all', 
      accessLevel: data.accessLevel || 'view',
      isActive: data.isActive ?? true
    } : { pageRoute: '', userId: 'all', accessLevel: 'view', isActive: true });
    setAccessModal({ isOpen: true, mode, data });
  };

  const handleSaveAccess = async (e) => {
    e.preventDefault();
    if (!accessForm.pageRoute.trim()) return toast.error('Page Route is required');

    setIsSubmitting(true);
    try {
      const payload = {
        ...accessForm,
        userId: accessForm.userId === 'all' ? '' : accessForm.userId
      };

      if (accessModal.mode === 'create') {
        await pb.collection('page_access').create(payload, { $autoCancel: false });
        toast.success('Page access created');
      } else {
        await pb.collection('page_access').update(accessModal.data.id, payload, { $autoCancel: false });
        toast.success('Page access updated');
      }
      setAccessModal({ isOpen: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      console.error('Save access error:', err);
      toast.error(err.message || 'Failed to save page access');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAccessStatus = async (access) => {
    try {
      await pb.collection('page_access').update(access.id, { isActive: !access.isActive }, { $autoCancel: false });
      toast.success(`Access rule ${!access.isActive ? 'enabled' : 'disabled'}`);
      setPageAccesses(prev => prev.map(a => a.id === access.id ? { ...a, isActive: !a.isActive } : a));
    } catch (err) {
      console.error('Toggle access status error:', err);
      toast.error('Failed to update status');
    }
  };

  // ==========================================
  // SECTION 4: GLOBAL PAGES ACCESS
  // ==========================================
  const openGlobalAccessModal = (mode, data = null) => {
    setGlobalAccessForm(data ? { 
      pageRoute: data.pageRoute, 
      accessLevel: data.accessLevel || 'view',
      isActive: data.isActive ?? true
    } : { pageRoute: '', accessLevel: 'view', isActive: true });
    setGlobalAccessModal({ isOpen: true, mode, data });
  };

  const handleSaveGlobalAccess = async (e) => {
    e.preventDefault();
    if (!globalAccessForm.pageRoute.trim()) return toast.error('Page Route is required');

    setIsSubmitting(true);
    try {
      const payload = {
        pageRoute: globalAccessForm.pageRoute,
        userId: '', // Global rule
        accessLevel: globalAccessForm.accessLevel,
        isActive: globalAccessForm.isActive
      };

      if (globalAccessModal.mode === 'create') {
        await pb.collection('page_access').create(payload, { $autoCancel: false });
        toast.success('Global page access created');
      } else {
        await pb.collection('page_access').update(globalAccessModal.data.id, payload, { $autoCancel: false });
        toast.success('Global page access updated');
      }
      setGlobalAccessModal({ isOpen: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      console.error('Save global access error:', err);
      toast.error(err.message || 'Failed to save global page access');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGlobalAccessLevelChange = async (pageRoute, newLevel, existingRuleId) => {
    try {
      if (existingRuleId) {
        await pb.collection('page_access').update(existingRuleId, { accessLevel: newLevel }, { $autoCancel: false });
        toast.success('Access level updated');
      } else {
        await pb.collection('page_access').create({
          pageRoute,
          userId: '',
          accessLevel: newLevel,
          isActive: true
        }, { $autoCancel: false });
        toast.success('Global access rule created');
      }
      fetchData();
    } catch (err) {
      console.error('Update access level error:', err);
      toast.error('Failed to update access level');
    }
  };

  const toggleGlobalAccessStatus = async (pageRoute, isActive, existingRuleId) => {
    try {
      if (existingRuleId) {
        await pb.collection('page_access').update(existingRuleId, { isActive: !isActive }, { $autoCancel: false });
        toast.success(`Global access ${!isActive ? 'enabled' : 'disabled'}`);
      } else {
        await pb.collection('page_access').create({
          pageRoute,
          userId: '',
          accessLevel: 'view',
          isActive: true
        }, { $autoCancel: false });
        toast.success('Global access enabled');
      }
      fetchData();
    } catch (err) {
      console.error('Toggle global access status error:', err);
      toast.error('Failed to update status');
    }
  };

  // --- Render Helpers ---
  const renderSkeletonRows = (columns) => (
    Array.from({ length: 3 }).map((_, idx) => (
      <TableRow key={idx}>
        {Array.from({ length: columns }).map((_, colIdx) => (
          <TableCell key={colIdx}><Skeleton className="h-5 w-full max-w-[200px]" /></TableCell>
        ))}
      </TableRow>
    ))
  );

  return (
    <AdminLayout>
      <Helmet>
        <title>Account & Access Settings | Admin Dashboard</title>
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                Account & Access Settings
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage account types, user assignments, and page access rules.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-destructive/10 rounded-2xl border border-destructive/20">
            <AlertCircle className="w-8 h-8 text-destructive mb-3" />
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/20">
              Retry Loading
            </Button>
          </div>
        )}

        {!error && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-muted/50 p-1 rounded-xl flex-wrap h-auto shadow-sm">
              <TabsTrigger value="types" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Account Types
              </TabsTrigger>
              <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="w-4 h-4 mr-2" />
                User Assignments
              </TabsTrigger>
              <TabsTrigger value="access" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Globe className="w-4 h-4 mr-2" />
                User Page Access
              </TabsTrigger>
              <TabsTrigger value="global-access" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="w-4 h-4 mr-2" />
                Global Pages Access
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ACCOUNT TYPES */}
            <TabsContent value="types" className="space-y-8 outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Configured Account Types</h2>
                    <p className="text-sm text-muted-foreground mt-1">Define base membership and role tiers for your platform.</p>
                  </div>
                  <Button onClick={() => openTypeModal('create')} size="sm" className="gap-2 rounded-xl shadow-sm">
                    <Plus className="w-4 h-4" /> Create Type
                  </Button>
                </div>
                <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-[25%] font-semibold">Name</TableHead>
                          <TableHead className="w-[40%] font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? renderSkeletonRows(4) : accountTypes.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No account types found.</TableCell></TableRow>
                        ) : accountTypes.map((type) => (
                          <TableRow key={type.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-foreground">{type.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{type.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch checked={type.is_enabled} onCheckedChange={() => toggleTypeStatus(type)} />
                                {type.is_enabled ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800/30 gap-1 pr-2"><CheckCircle2 className="w-3 h-3" /> Enabled</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-400 dark:border-slate-800/30 gap-1 pr-2"><XCircle className="w-3 h-3" /> Disabled</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openTypeModal('edit', type)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteConfig({ isOpen: true, type: 'account_types', id: type.id, name: type.name })} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Added Component */}
              <AccountTypeAccessMatrix
                pages={pages}
                accountTypes={accountTypes}
                pageAccesses={pageAccesses}
                loading={isLoading}
              />
            </TabsContent>

            {/* TAB 2: USER ASSIGNMENTS */}
            <TabsContent value="assignments" className="space-y-4 outline-none">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">User Account Assignments</h2>
                  <p className="text-sm text-muted-foreground mt-1">Bind explicit account types to platform users.</p>
                </div>
                <Button onClick={() => openAssignmentModal('create')} size="sm" className="gap-2 rounded-xl shadow-sm">
                  <Plus className="w-4 h-4" /> Assign User
                </Button>
              </div>
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Account Type</TableHead>
                        <TableHead className="font-semibold">Assigned At</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? renderSkeletonRows(4) : assignments.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No assignments found.</TableCell></TableRow>
                      ) : assignments.map((assignment) => (
                        <TableRow key={assignment.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-foreground">{getUserName(assignment.userId)}</TableCell>
                          <TableCell><Badge variant="secondary">{getAccountTypeName(assignment.accountTypeId)}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(assignment.created).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openAssignmentModal('edit', assignment)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfig({ isOpen: true, type: 'user_account_assignments', id: assignment.id, name: 'this assignment' })} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: PAGE ACCESS */}
            <TabsContent value="access" className="space-y-4 outline-none">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">User Page Access Rules</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure individual override rules for specific users.</p>
                </div>
                <Button onClick={() => openAccessModal('create')} size="sm" className="gap-2 rounded-xl shadow-sm">
                  <Plus className="w-4 h-4" /> Create Rule
                </Button>
              </div>
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">Page Route</TableHead>
                        <TableHead className="font-semibold">Target User</TableHead>
                        <TableHead className="font-semibold">Access Level</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? renderSkeletonRows(5) : pageAccesses.filter(a => a.userId).length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No user-specific access rules found.</TableCell></TableRow>
                      ) : pageAccesses.filter(a => a.userId && !accountTypes.some(t => t.id === a.userId)).map((access) => (
                        <TableRow key={access.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-foreground font-mono text-sm">{access.pageRoute}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{getUserName(access.userId)}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{access.accessLevel || 'view'}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={access.isActive} onCheckedChange={() => toggleAccessStatus(access)} />
                              <span className="text-xs text-muted-foreground">{access.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openAccessModal('edit', access)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfig({ isOpen: true, type: 'page_access', id: access.id, name: `rule for ${access.pageRoute}` })} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: GLOBAL PAGES ACCESS */}
            <TabsContent value="global-access" className="space-y-4 outline-none">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Global All Pages Access</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage global default access settings for every registered page.</p>
                </div>
                <Button 
                  onClick={() => openGlobalAccessModal('create')} 
                  size="sm" 
                  className="gap-2 rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4" /> Create Page Access Rule
                </Button>
              </div>
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">Page Name</TableHead>
                        <TableHead className="font-semibold">Page Route</TableHead>
                        <TableHead className="font-semibold">Default Access Level</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? renderSkeletonRows(5) : pages.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No pages found in the system.</TableCell></TableRow>
                      ) : pages.map((page) => {
                        const globalRule = pageAccesses.find(pa => pa.pageRoute === page.route && (!pa.userId || pa.userId === 'all'));
                        const isActive = globalRule ? globalRule.isActive : false;
                        const accessLevel = globalRule ? globalRule.accessLevel : 'view';

                        return (
                          <TableRow key={page.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-foreground">{page.name}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-sm">{page.route}</TableCell>
                            <TableCell>
                              <Select 
                                value={accessLevel} 
                                onValueChange={(val) => handleGlobalAccessLevelChange(page.route, val, globalRule?.id)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="view">View</SelectItem>
                                  <SelectItem value="edit">Edit</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={isActive} 
                                  onCheckedChange={() => toggleGlobalAccessStatus(page.route, isActive, globalRule?.id)} 
                                />
                                {isActive ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800/30 gap-1 pr-2"><CheckCircle2 className="w-3 h-3" /> Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-400 dark:border-slate-800/30 gap-1 pr-2"><XCircle className="w-3 h-3" /> Inactive</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openGlobalAccessModal('edit', globalRule || { pageRoute: page.route, accessLevel: 'view', isActive: false })} 
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {globalRule && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setDeleteConfig({ isOpen: true, type: 'page_access', id: globalRule.id, name: `global rule for ${page.route}` })} 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* --- MODALS --- */}

        {/* Type Modal */}
        <Dialog open={typeModal.isOpen} onOpenChange={(open) => !open && setTypeModal({ ...typeModal, isOpen: false })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{typeModal.mode === 'create' ? 'Create Account Type' : 'Edit Account Type'}</DialogTitle>
              <DialogDescription>Define a membership or role tier.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveType} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="typeName">Name <span className="text-destructive">*</span></Label>
                <Input id="typeName" value={typeForm.name} onChange={(e) => setTypeForm({...typeForm, name: e.target.value})} placeholder="e.g., Premium Plus" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeDesc">Description</Label>
                <Input id="typeDesc" value={typeForm.description} onChange={(e) => setTypeForm({...typeForm, description: e.target.value})} placeholder="Details about this tier" />
              </div>
              <div className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-xs text-muted-foreground">Enable this account type</p>
                </div>
                <Switch checked={typeForm.is_enabled} onCheckedChange={(c) => setTypeForm({...typeForm, is_enabled: c})} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTypeModal({ ...typeModal, isOpen: false })} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assignment Modal */}
        <Dialog open={assignmentModal.isOpen} onOpenChange={(open) => !open && setAssignmentModal({ ...assignmentModal, isOpen: false })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{assignmentModal.mode === 'create' ? 'Assign Account Type' : 'Edit Assignment'}</DialogTitle>
              <DialogDescription>Link a user to a specific account type.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAssignment} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User <span className="text-destructive">*</span></Label>
                <Select value={assignmentForm.userId} onValueChange={(v) => setAssignmentForm({...assignmentForm, userId: v})} required>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Type <span className="text-destructive">*</span></Label>
                <Select value={assignmentForm.accountTypeId} onValueChange={(v) => setAssignmentForm({...assignmentForm, accountTypeId: v})} required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAssignmentModal({ ...assignmentModal, isOpen: false })} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Access Modal */}
        <Dialog open={accessModal.isOpen} onOpenChange={(open) => !open && setAccessModal({ ...accessModal, isOpen: false })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{accessModal.mode === 'create' ? 'Create Access Rule' : 'Edit Access Rule'}</DialogTitle>
              <DialogDescription>Control who can access specific pages.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAccess} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Page Route <span className="text-destructive">*</span></Label>
                <Input value={accessForm.pageRoute} onChange={(e) => setAccessForm({...accessForm, pageRoute: e.target.value})} placeholder="e.g., /admin/dashboard" required />
              </div>
              <div className="space-y-2">
                <Label>Target User</Label>
                <Select value={accessForm.userId} onValueChange={(v) => setAccessForm({...accessForm, userId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="all">All Users (Global)</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={accessForm.accessLevel} onValueChange={(v) => setAccessForm({...accessForm, accessLevel: v})}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-xs text-muted-foreground">Enable this rule</p>
                </div>
                <Switch checked={accessForm.isActive} onCheckedChange={(c) => setAccessForm({...accessForm, isActive: c})} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAccessModal({ ...accessModal, isOpen: false })} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Global Access Modal */}
        <Dialog open={globalAccessModal.isOpen} onOpenChange={(open) => !open && setGlobalAccessModal({ ...globalAccessModal, isOpen: false })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{globalAccessModal.mode === 'create' ? 'Create Global Access Rule' : 'Edit Global Access Rule'}</DialogTitle>
              <DialogDescription>Set default access levels for a specific page route.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveGlobalAccess} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Page Route <span className="text-destructive">*</span></Label>
                <Input 
                  value={globalAccessForm.pageRoute} 
                  onChange={(e) => setGlobalAccessForm({...globalAccessForm, pageRoute: e.target.value})} 
                  placeholder="e.g., /admin/dashboard" 
                  required 
                  disabled={globalAccessModal.mode === 'edit'}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Access Level</Label>
                <Select value={globalAccessForm.accessLevel} onValueChange={(v) => setGlobalAccessForm({...globalAccessForm, accessLevel: v})}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-xs text-muted-foreground">Enable this global rule</p>
                </div>
                <Switch checked={globalAccessForm.isActive} onCheckedChange={(c) => setGlobalAccessForm({...globalAccessForm, isActive: c})} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGlobalAccessModal({ ...globalAccessModal, isOpen: false })} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Rule'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfig.isOpen} onOpenChange={(open) => !open && setDeleteConfig({ ...deleteConfig, isOpen: false })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deleteConfig.name}</strong>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
};

export default AccountTypeSettings;