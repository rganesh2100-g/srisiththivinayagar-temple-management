import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, List, Tags, AlertTriangle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateGerman } from '@/lib/germanTimeUtils.js';

const CategoryMasterPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState('categories');

  // Categories State
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [isCatDeleteDialogOpen, setIsCatDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isCatDeleting, setIsCatDeleting] = useState(false);
  const [isCheckingCatDelete, setIsCheckingCatDelete] = useState(false);

  const [catFormData, setCatFormData] = useState({
    name: '',
    description: ''
  });

  // Classifications State
  const [classifications, setClassifications] = useState([]);
  const [isLoadingClassifications, setIsLoadingClassifications] = useState(true);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isClassSubmitting, setIsClassSubmitting] = useState(false);
  const [editingClassification, setEditingClassification] = useState(null);

  const [isClassDeleteDialogOpen, setIsClassDeleteDialogOpen] = useState(false);
  const [classificationToDelete, setClassificationToDelete] = useState(null);
  const [isClassDeleting, setIsClassDeleting] = useState(false);

  const [classFormData, setClassFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (currentUser) {
      if (isAdmin || currentUser?.role === 'admin') {
        setIsAuthorized(true);
        setChecking(false);
      } else {
        toast.error('Access Denied: Insufficient permissions.');
        setTimeout(() => navigate('/admin-dashboard'), 3000);
      }
    } else {
      navigate('/login');
    }
  }, [currentUser, isAdmin, navigate]);

  useEffect(() => {
    if (isAuthorized) {
      fetchCategories();
      fetchClassifications();
    }
  }, [isAuthorized]);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await pb.collection('expense_categories').getFullList({ sort: '-created', $autoCancel: false });
      setCategories(result);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleOpenCatModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCatFormData({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setCatFormData({ name: '', description: '' });
    }
    setIsCatModalOpen(true);
  };

  const handleCloseCatModal = () => {
    setIsCatModalOpen(false);
    setTimeout(() => {
      setEditingCategory(null);
      setCatFormData({ name: '', description: '' });
    }, 200);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      toast.error(t('categoryMaster.messages.catNameReq', 'Category name is required'));
      return;
    }

    setIsCatSubmitting(true);
    try {
      const data = {
        name: catFormData.name.trim(),
        description: catFormData.description.trim(),
        created_by: currentUser.email
      };

      if (editingCategory) {
        await pb.collection('expense_categories').update(editingCategory.id, data, { $autoCancel: false });
        toast.success(t('categoryMaster.messages.catUpdated', 'Category updated successfully'));
      } else {
        await pb.collection('expense_categories').create(data, { $autoCancel: false });
        toast.success(t('categoryMaster.messages.catCreated', 'Category created successfully'));
      }
      
      handleCloseCatModal();
      fetchCategories();
    } catch (error) {
      console.error('Save category error:', error);
      toast.error(t('categoryMaster.messages.catSaveFailed', 'Failed to save category'));
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleCatDeleteRequest = async (category) => {
    setIsCheckingCatDelete(true);
    try {
      const expenseCount = await pb.collection('expenses').getList(1, 1, {
        filter: `category_id="${category.id}"`,
        $autoCancel: false
      });

      if (expenseCount.totalItems > 0) {
        toast.error(`Cannot delete: ${expenseCount.totalItems} expense(s) recorded in this category.`);
        return;
      }

      setCategoryToDelete(category);
      setIsCatDeleteDialogOpen(true);
    } catch (error) {
      console.error('Check category error:', error);
      toast.error(t('categoryMaster.messages.catDeleteCheckFailed', 'Failed to verify category usage'));
    } finally {
      setIsCheckingCatDelete(false);
    }
  };

  const executeCatDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsCatDeleting(true);
    try {
      await pb.collection('expense_categories').delete(categoryToDelete.id, { $autoCancel: false });
      toast.success(t('categoryMaster.messages.catDeleted', 'Category deleted successfully'));
      fetchCategories();
      setIsCatDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error(t('common.error', 'An error occurred'));
    } finally {
      setIsCatDeleting(false);
    }
  };

  const fetchClassifications = async () => {
    setIsLoadingClassifications(true);
    try {
      const result = await pb.collection('classifications').getFullList({ sort: '-created', $autoCancel: false });
      setClassifications(result);
    } catch (error) {
      console.error('Failed to fetch classifications:', error);
    } finally {
      setIsLoadingClassifications(false);
    }
  };

  const handleOpenClassModal = (classification = null) => {
    if (classification) {
      setEditingClassification(classification);
      setClassFormData({
        name: classification.name,
        description: classification.description || ''
      });
    } else {
      setEditingClassification(null);
      setClassFormData({ name: '', description: '' });
    }
    setIsClassModalOpen(true);
  };

  const handleCloseClassModal = () => {
    setIsClassModalOpen(false);
    setTimeout(() => {
      setEditingClassification(null);
      setClassFormData({ name: '', description: '' });
    }, 200);
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    if (!classFormData.name.trim()) {
      toast.error(t('categoryMaster.messages.classNameReq', 'Classification name is required'));
      return;
    }

    setIsClassSubmitting(true);
    try {
      const data = {
        name: classFormData.name.trim(),
        description: classFormData.description.trim()
      };

      if (editingClassification) {
        await pb.collection('classifications').update(editingClassification.id, data, { $autoCancel: false });
        toast.success(t('categoryMaster.messages.classUpdated', 'Classification updated successfully'));
      } else {
        await pb.collection('classifications').create(data, { $autoCancel: false });
        toast.success(t('categoryMaster.messages.classCreated', 'Classification created successfully'));
      }
      
      handleCloseClassModal();
      fetchClassifications();
    } catch (error) {
      console.error('Save classification error:', error);
      toast.error(t('categoryMaster.messages.classSaveFailed', 'Failed to save classification'));
    } finally {
      setIsClassSubmitting(false);
    }
  };

  const handleClassDeleteRequest = (classification) => {
    setClassificationToDelete(classification);
    setIsClassDeleteDialogOpen(true);
  };

  const executeClassDelete = async () => {
    if (!classificationToDelete) return;
    
    setIsClassDeleting(true);
    try {
      await pb.collection('classifications').delete(classificationToDelete.id, { $autoCancel: false });
      toast.success(t('categoryMaster.messages.classDeleted', 'Classification deleted successfully'));
      fetchClassifications();
      setIsClassDeleteDialogOpen(false);
      setClassificationToDelete(null);
    } catch (error) {
      console.error('Delete classification error:', error);
      toast.error(t('categoryMaster.messages.classDeleteFailed', 'Failed to delete classification'));
    } finally {
      setIsClassDeleting(false);
    }
  };

  if (checking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('categoryMaster.title', 'Category Master')} | {t('admin.dashboard', 'Admin Dashboard')}</title>
      </Helmet>

      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-playfair">{t('categoryMaster.title', 'Category Master')}</h1>
          <p className="text-sm text-muted-foreground">{t('categoryMaster.description', 'Manage expense categories and ledger classifications')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 max-w-[400px]">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <List className="w-4 h-4" /> {t('categoryMaster.tabs.categories', 'Categories')}
          </TabsTrigger>
          <TabsTrigger value="classifications" className="flex items-center gap-2">
            <Tags className="w-4 h-4" /> {t('categoryMaster.tabs.classifications', 'Classifications')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4 outline-none">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">{t('categoryMaster.expenseCategories', 'Expense Categories')}</h2>
              <p className="text-sm text-muted-foreground">{t('categoryMaster.expenseCategoriesDesc', 'Manage categories used when recording temple expenses')}</p>
            </div>
            <Button onClick={() => handleOpenCatModal()}>
              <Plus className="w-4 h-4 mr-2" /> {t('categoryMaster.buttons.addCategory', 'Add Category')}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingCategories ? (
                <div className="p-8 space-y-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />)}
                </div>
              ) : categories.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground bg-card">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>{t('categoryMaster.emptyCat', 'No categories found. Create one to get started.')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 uppercase text-xs tracking-wider">
                      <TableRow>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.name', 'Name')}</TableHead>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.description', 'Description')}</TableHead>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.createdBy', 'Created By')}</TableHead>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.createdAt', 'Created At')}</TableHead>
                        <TableHead className="py-3 px-4 text-right">{t('categoryMaster.table.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 px-4 font-medium text-foreground">
                            {category.name}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm text-muted-foreground max-w-[300px] truncate">
                            {category.description || <span className="italic opacity-50">None</span>}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm">
                            {category.created_by || 'Admin'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm whitespace-nowrap text-muted-foreground">
                            {formatDateGerman(category.created)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={() => handleOpenCatModal(category)}
                                title={t('common.edit', 'Edit')}
                                disabled={isCheckingCatDelete}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => handleCatDeleteRequest(category)}
                                title={t('common.delete', 'Delete')}
                                disabled={isCheckingCatDelete}
                              >
                                {isCheckingCatDelete && categoryToDelete?.id === category.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classifications" className="space-y-4 outline-none">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">{t('categoryMaster.ledgerClassifications', 'Ledger Classifications')}</h2>
              <p className="text-sm text-muted-foreground">{t('categoryMaster.ledgerClassificationsDesc', 'Manage subclassifications for temple account entries')}</p>
            </div>
            <Button onClick={() => handleOpenClassModal()}>
              <Plus className="w-4 h-4 mr-2" /> {t('categoryMaster.buttons.addClassification', 'Add Classification')}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingClassifications ? (
                <div className="p-8 space-y-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />)}
                </div>
              ) : classifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground bg-card">
                  <Tags className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>{t('categoryMaster.emptyClass', 'No classifications found. Create one to get started.')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 uppercase text-xs tracking-wider">
                      <TableRow>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.name', 'Name')}</TableHead>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.description', 'Description')}</TableHead>
                        <TableHead className="py-3 px-4">{t('categoryMaster.table.createdAt', 'Created At')}</TableHead>
                        <TableHead className="py-3 px-4 text-right">{t('categoryMaster.table.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classifications.map((classification) => (
                        <TableRow key={classification.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 px-4 font-medium text-foreground">
                            {classification.name}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm text-muted-foreground max-w-[400px] truncate">
                            {classification.description || <span className="italic opacity-50">None</span>}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-sm whitespace-nowrap text-muted-foreground">
                            {formatDateGerman(classification.created)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={() => handleOpenClassModal(classification)}
                                title={t('common.edit', 'Edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => handleClassDeleteRequest(classification)}
                                title={t('common.delete', 'Delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCatModalOpen} onOpenChange={(open) => !isCatSubmitting && !open && handleCloseCatModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? t('categoryMaster.modals.editCatTitle', 'Edit Category') : t('categoryMaster.modals.addCatTitle', 'Add New Category')}</DialogTitle>
            <DialogDescription>
              {t('categoryMaster.modals.catDesc', 'Enter the details for the expense category.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCatSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t('categoryMaster.form.catName', 'Category Name')} <span className="text-destructive">*</span></Label>
              <Input 
                id="cat-name" 
                value={catFormData.name}
                onChange={(e) => setCatFormData({...catFormData, name: e.target.value})}
                placeholder={t('categoryMaster.form.catPlaceholder', 'e.g., Temple Maintenance')}
                required
                disabled={isCatSubmitting}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">{t('categoryMaster.form.description', 'Description')}</Label>
              <Textarea 
                id="cat-desc" 
                value={catFormData.description}
                onChange={(e) => setCatFormData({...catFormData, description: e.target.value})}
                placeholder={t('categoryMaster.form.descPlaceholder', 'Optional description of this category')}
                className="resize-none min-h-[100px]"
                disabled={isCatSubmitting}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseCatModal} disabled={isCatSubmitting}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isCatSubmitting || !catFormData.name.trim()}>
                {isCatSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? t('categoryMaster.buttons.saveChanges', 'Save Changes') : t('categoryMaster.buttons.createCategory', 'Create Category')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCatDeleteDialogOpen} onOpenChange={(open) => !isCatDeleting && !open && setIsCatDeleteDialogOpen(false)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-destructive/20 shadow-lg shadow-destructive/10">
          <div className="p-8 text-center bg-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6 ring-8 ring-destructive/5">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogHeader className="mb-3">
              <DialogTitle className="text-2xl font-bold text-center text-foreground font-playfair">
                {t('categoryMaster.modals.deleteCatTitle', 'Delete Category')}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-center text-base text-muted-foreground mb-8">
              {t('categoryMaster.modals.deleteCatDesc', 'Are you sure you want to delete this category? This action cannot be undone.')}
            </DialogDescription>
            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full justify-center mt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCatDeleteDialogOpen(false)} 
                disabled={isCatDeleting}
                className="sm:flex-1 h-11"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={executeCatDelete} 
                disabled={isCatDeleting}
                className="sm:flex-1 h-11 font-medium"
              >
                {isCatDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {t('categoryMaster.buttons.deleteCategory', 'Delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isClassModalOpen} onOpenChange={(open) => !isClassSubmitting && !open && handleCloseClassModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingClassification ? t('categoryMaster.modals.editClassTitle', 'Edit Classification') : t('categoryMaster.modals.addClassTitle', 'Add Classification')}</DialogTitle>
            <DialogDescription>
              {t('categoryMaster.modals.classDesc', 'Enter the details for this ledger sub-classification.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClassSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">{t('categoryMaster.form.className', 'Classification Name')} <span className="text-destructive">*</span></Label>
              <Input 
                id="class-name" 
                value={classFormData.name}
                onChange={(e) => setClassFormData({...classFormData, name: e.target.value})}
                placeholder={t('categoryMaster.form.classPlaceholder', 'e.g., Priest Services')}
                required
                disabled={isClassSubmitting}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-desc">{t('categoryMaster.form.description', 'Description')}</Label>
              <Textarea 
                id="class-desc" 
                value={classFormData.description}
                onChange={(e) => setClassFormData({...classFormData, description: e.target.value})}
                placeholder={t('categoryMaster.form.classDescPlaceholder', 'Optional description')}
                className="resize-none min-h-[100px]"
                disabled={isClassSubmitting}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseClassModal} disabled={isClassSubmitting}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isClassSubmitting || !classFormData.name.trim()}>
                {isClassSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingClassification ? t('categoryMaster.buttons.saveChanges', 'Save Changes') : t('categoryMaster.buttons.createClassification', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isClassDeleteDialogOpen} onOpenChange={(open) => !isClassDeleting && !open && setIsClassDeleteDialogOpen(false)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-destructive/20 shadow-lg shadow-destructive/10">
          <div className="p-8 text-center bg-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6 ring-8 ring-destructive/5">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogHeader className="mb-3">
              <DialogTitle className="text-2xl font-bold text-center text-foreground font-playfair">
                {t('categoryMaster.modals.deleteClassTitle', 'Delete Classification')}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-center text-base text-muted-foreground mb-8">
              {t('categoryMaster.modals.deleteClassDesc', 'Are you sure you want to delete this classification? This action cannot be undone.')}
            </DialogDescription>
            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full justify-center mt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsClassDeleteDialogOpen(false)} 
                disabled={isClassDeleting}
                className="sm:flex-1 h-11"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={executeClassDelete} 
                disabled={isClassDeleting}
                className="sm:flex-1 h-11 font-medium"
              >
                {isClassDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {t('categoryMaster.buttons.deleteClassification', 'Delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default CategoryMasterPage;