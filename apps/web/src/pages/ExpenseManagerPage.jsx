import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import { toast } from 'sonner';
import { Loader2, Plus, Receipt, Trash2, Calendar, FileText, User, Hash, Eye, ListFilter, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { formatDateGerman } from '@/lib/germanTimeUtils.js';
import imageCompression from 'browser-image-compression';
import SoftDeleteConfirmationDialog from '@/components/SoftDeleteConfirmationDialog.jsx';
import ExpenseDetailModal from '@/components/ExpenseDetailModal.jsx';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Card', 'Other'];

const ExpenseManagerPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [categories, setCategories] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClassifications, setIsLoadingClassifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [formData, setFormData] = useState({
    category_id: '', 
    classification_id: 'none',
    description: '',
    quantity: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paid_to: '',
    payment_method: 'Bank Transfer'
  });
  const [billFile, setBillFile] = useState(null);

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
      fetchExpenses(1);
    }
  }, [isAuthorized]);

  const fetchCategories = async () => {
    try {
      const catsRes = await pb.collection('expense_categories').getFullList({ sort: 'name', $autoCancel: false });
      setCategories(catsRes);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchClassifications = async () => {
    setIsLoadingClassifications(true);
    try {
      const classRes = await pb.collection('classifications').getFullList({ sort: 'name', $autoCancel: false });
      setClassifications(classRes);
    } catch (error) {
      console.error('Failed to fetch classifications:', error);
      toast.error('Failed to load classifications.');
    } finally {
      setIsLoadingClassifications(false);
    }
  };

  const fetchExpenses = async (pageNumber = 1) => {
    setIsLoading(true);
    try {
      const expRes = await pb.collection('expenses').getList(pageNumber, 20, { 
        sort: '-date,-created', 
        expand: 'category_id',
        $autoCancel: false 
      });
      setExpenses(expRes.items);
      setTotalPages(expRes.totalPages);
      setPage(pageNumber);
    } catch (error) {
      console.error('Failed to fetch expense data:', error);
      toast.error('Failed to load expense data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setBillFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.amount || !formData.date) {
      toast.error(t('expenseManager.messages.fillRequired', 'Please fill all required fields'));
      return;
    }

    setIsSubmitting(true);
    try {
      let fileToUpload = billFile;

      // Handle automatic file compression
      if (billFile) {
        if (billFile.type.startsWith('image/')) {
          setIsCompressing(true);
          try {
            fileToUpload = await imageCompression(billFile, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.8,
            });
            toast.success(t('expenseManager.messages.imageCompressed', 'Image compressed successfully'));
          } catch (err) {
            console.error('Compression error:', err);
            toast.error(t('expenseManager.messages.compressFailed', 'Image compression failed'));
          } finally {
            setIsCompressing(false);
          }
        } else if (billFile.type === 'application/pdf') {
          if (billFile.size > 20971520) {
            toast.warning(t('expenseManager.messages.pdfLarge', 'PDF is larger than 20MB. Upload might fail.'));
          } else {
            toast.success(t('expenseManager.messages.pdfSuccess', 'PDF selected for upload'));
          }
        }
      }

      const submissionData = new FormData();
      
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      const categoryName = selectedCategory ? selectedCategory.name : 'General';
      const legacyCategoryFallback = ['Staff Salaries', 'General'].includes(categoryName) ? categoryName : 'General';

      const finalClassificationId = formData.classification_id === 'none' ? '' : formData.classification_id;

      submissionData.append('category_id', formData.category_id);
      submissionData.append('category', legacyCategoryFallback); 
      submissionData.append('amount', formData.amount);
      submissionData.append('date', formData.date);
      
      if (finalClassificationId) {
        submissionData.append('classification', finalClassificationId);
      }
      
      if (formData.quantity !== '') {
        submissionData.append('quantity', formData.quantity);
      }

      if (formData.description) {
        submissionData.append('description', formData.description.trim());
      }
      if (formData.paid_to) {
        submissionData.append('paid_to', formData.paid_to.trim());
      }
      if (formData.payment_method) {
        submissionData.append('payment_method', formData.payment_method);
      }
      submissionData.append('created_by', currentUser.email);

      if (fileToUpload) {
        submissionData.append('bill_file', fileToUpload);
      }

      const expenseRecord = await pb.collection('expenses').create(submissionData, { $autoCancel: false });

      const dateObj = new Date(formData.date);
      const monthStr = dateObj.toLocaleString('en-US', { month: 'long' });
      const yearNum = dateObj.getFullYear();
      const exactNegativeAmount = -Number(formData.amount);

      const paidToLabel = formData.paid_to ? `Paid to: ${formData.paid_to}` : 'Expense Entry';

      await pb.collection('temple_accounts').create({
        member_name: formData.paid_to || 'Temple Expense',
        amount: exactNegativeAmount,
        category: categoryName,
        date: formData.date,
        month: monthStr,
        year: yearNum,
        classification: finalClassificationId || 'Expense',
        description: `${paidToLabel} | ${categoryName}${formData.quantity ? ` (Qty: ${formData.quantity})` : ''}`,
        transaction_id: `EXP-${expenseRecord.id}`,
        status: 'completed'
      }, { $autoCancel: false });

      toast.success(t('expenseManager.messages.success', 'Expense recorded successfully'));
      
      setFormData({
        category_id: '',
        classification_id: 'none',
        description: '',
        quantity: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paid_to: '',
        payment_method: 'Bank Transfer'
      });
      setBillFile(null);
      const fileInput = document.getElementById('bill_file_input');
      if (fileInput) fileInput.value = '';
      
      fetchExpenses(1);
    } catch (error) {
      console.error('Submit expense error:', error);
      
      const errData = error.data?.data;
      if (errData && Object.keys(errData).length > 0) {
        const errorMessages = Object.entries(errData)
          .map(([field, err]) => `${field}: ${err.message}`)
          .join(' | ');
        toast.error(`${t('expenseManager.messages.validationError', 'Validation Error:')} ${errorMessages}`);
      } else {
        toast.error(t('expenseManager.messages.saveFailed', 'Failed to save expense'));
      }
    } finally {
      setIsSubmitting(false);
      setIsCompressing(false);
    }
  };

  const confirmDelete = (expense) => {
    setExpenseToDelete(expense);
    setDeleteModalOpen(true);
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    
    try {
      try {
        await pb.collection('expenses').getOne(expenseToDelete.id, { $autoCancel: false });
      } catch (err) {
        if (err.status === 404) {
          toast.error(t('expenseManager.messages.deleteFailed', 'Failed to delete expense'));
          fetchExpenses(page);
          setDeleteModalOpen(false);
          setExpenseToDelete(null);
          setIsDeleting(false);
          return;
        }
        throw err;
      }

      let ledgerWarning = false;
      try {
        const ledgerRecs = await pb.collection('temple_accounts').getFullList({ 
          filter: `transaction_id="EXP-${expenseToDelete.id}"`, 
          $autoCancel: false 
        });
        
        for (const rec of ledgerRecs) {
          try {
            await pb.collection('temple_accounts').delete(rec.id, { $autoCancel: false });
          } catch (delErr) {
            if (delErr.status === 404) {
              ledgerWarning = true;
            } else {
              console.error(`Failed to delete temple account ${rec.id}:`, delErr);
              ledgerWarning = true;
            }
          }
        }
      } catch (findErr) {
        console.error('Error finding related temple_accounts:', findErr);
        ledgerWarning = true;
      }

      await pb.collection('expenses').delete(expenseToDelete.id, { $autoCancel: false });
      
      if (ledgerWarning) {
        toast.warning(t('expenseManager.messages.deleteWarning', 'Expense deleted, but associated ledger entry could not be completely removed.'));
      } else {
        toast.success(t('expenseManager.messages.deleteSuccess', 'Expense deleted successfully'));
      }
      
      fetchExpenses(page);
    } catch (error) {
      console.error('Delete expense error:', error);
      toast.error(t('expenseManager.messages.deleteFailed', 'Failed to delete expense'));
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  };

  const openDetailModal = (expense) => {
    setSelectedExpense(expense);
    setDetailModalOpen(true);
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
        <title>{t('expenseManager.title', 'Expense Manager')} | {t('admin.dashboard', 'Admin Dashboard')}</title>
      </Helmet>

      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
          <Receipt className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-playfair tracking-tight text-foreground">{t('expenseManager.title', 'Expense Manager')}</h1>
          <p className="text-base text-muted-foreground">{t('expenseManager.description', 'Track and manage temple expenses and outgoing payments')}</p>
        </div>
      </div>

      <div className="space-y-8">
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-5">
            <CardTitle className="text-xl flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> {t('expenseManager.recordNew', 'Record New Expense')}
            </CardTitle>
            <CardDescription>{t('expenseManager.recordDesc', 'Enter details for a new expense to automatically log it into temple accounts')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('expenseManager.form.category', 'Category')} <span className="text-destructive">*</span></Label>
                  <Select value={formData.category_id} onValueChange={(v) => handleInputChange('category_id', v)} required>
                    <SelectTrigger id="category" className="h-11">
                      <SelectValue placeholder={categories.length === 0 && !isLoading ? t('expenseManager.placeholders.noCategories', 'No categories found') : t('expenseManager.placeholders.selectCategory', 'Select a category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('expenseManager.form.description', 'Description')}</Label>
                  <div className="input-icon-wrapper relative flex items-center">
                    <FileText className="absolute left-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="description" 
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder={t('expenseManager.placeholders.enterDesc', 'Brief description of the expense')}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classification">{t('expenseManager.form.classification', 'Classification')}</Label>
                  <div className="input-icon-wrapper relative flex items-center">
                    <Tags className="absolute left-3 w-5 h-5 text-muted-foreground z-10" />
                    <Select value={formData.classification_id} onValueChange={(v) => handleInputChange('classification_id', v)}>
                      <SelectTrigger id="classification" className="pl-10 h-11">
                        <SelectValue placeholder={isLoadingClassifications ? t('common.loading', 'Loading...') : t('expenseManager.placeholders.selectClassification', 'Select sub-classification')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('expenseManager.placeholders.selectClassification', 'None / General')}</SelectItem>
                        {classifications.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">{t('expenseManager.form.date', 'Date')} <span className="text-destructive">*</span></Label>
                  <div className="input-icon-wrapper relative flex items-center">
                    <Calendar className="absolute left-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="date" 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid_to">{t('expenseManager.form.paidTo', 'Paid To')}</Label>
                  <div className="input-icon-wrapper relative flex items-center">
                    <User className="absolute left-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="paid_to" 
                      value={formData.paid_to}
                      onChange={(e) => handleInputChange('paid_to', e.target.value)}
                      placeholder={t('expenseManager.placeholders.enterRecipient', 'Vendor or person name')}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">{t('expenseManager.form.quantity', 'Quantity')}</Label>
                    <div className="input-icon-wrapper relative flex items-center">
                      <Hash className="absolute left-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="quantity" 
                        type="number" 
                        step="any"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                        placeholder="e.g., 1"
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">{t('expenseManager.form.amount', 'Amount (€)')} <span className="text-destructive">*</span></Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      step="any" 
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0.00"
                      className="h-11 font-medium text-lg"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">{t('expenseManager.form.paymentMethod', 'Payment Method')}</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => handleInputChange('payment_method', v)}>
                    <SelectTrigger id="payment_method" className="h-11">
                      <SelectValue placeholder={t('expenseManager.placeholders.selectMethod', 'Select method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bill_file_input">{t('expenseManager.form.uploadBill', 'Upload Bill/Receipt')}</Label>
                  <div className="input-icon-wrapper relative flex items-center">
                    <FileText className="absolute left-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="bill_file_input" 
                      type="file" 
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="pl-10 h-11 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:mt-0.5"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('expenseManager.form.imagesCompressed', 'Images will be compressed automatically.')}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full md:w-auto px-8" 
                  disabled={isSubmitting || isCompressing || categories.length === 0}
                >
                  {isCompressing ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('expenseManager.buttons.compressing', 'Compressing...')}</>
                  ) : isSubmitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('expenseManager.buttons.saving', 'Saving...')}</>
                  ) : (
                    <><Plus className="w-5 h-5 mr-2" /> {t('expenseManager.buttons.record', 'Record Expense')}</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-primary" /> {t('expenseManager.allEntries', 'Recent Expenses')}
              </CardTitle>
              <CardDescription className="mt-1">{t('expenseManager.allEntriesDesc', 'History of all recorded expenses')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-16 text-center bg-card flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Receipt className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{t('expenseManager.empty', 'No expenses recorded yet')}</h3>
                <p className="text-muted-foreground max-w-sm mt-1">
                  {t('expenseManager.emptyDesc', 'Use the form above to record your first expense.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="py-4 px-6 font-semibold">{t('expenseManager.table.date', 'Date')}</TableHead>
                      <TableHead className="py-4 px-6 font-semibold">{t('expenseManager.table.category', 'Category')}</TableHead>
                      <TableHead className="py-4 px-6 font-semibold">{t('expenseManager.table.qty', 'Qty')}</TableHead>
                      <TableHead className="py-4 px-6 font-semibold">{t('expenseManager.table.details', 'Details')}</TableHead>
                      <TableHead className="py-4 px-6 font-semibold text-right">{t('expenseManager.table.amount', 'Amount')}</TableHead>
                      <TableHead className="py-4 px-6 font-semibold text-right">{t('expenseManager.table.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => {
                      const categoryDisplayName = expense.expand?.category_id?.name || expense.category || 'Unknown';
                      
                      return (
                        <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 px-6 text-sm font-medium whitespace-nowrap">
                            {formatDateGerman(expense.date)}
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <Badge variant="secondary" className="font-medium">
                              {categoryDisplayName}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                            {expense.quantity || '-'}
                          </TableCell>
                          <TableCell className="py-4 px-6 max-w-[250px]">
                            <div className="font-medium text-foreground truncate" title={`Paid to: ${expense.paid_to || 'Not specified'}`}>
                              {expense.paid_to || 'Not specified'}
                            </div>
                            <div className="text-muted-foreground text-xs truncate" title={expense.description || 'No description'}>
                              {expense.description || 'No description'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right font-bold text-red-600 whitespace-nowrap">
                            -€{Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={() => openDetailModal(expense)}
                                title={t('expenseManager.buttons.viewDetails', 'View Details')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => confirmDelete(expense)}
                                title={t('expenseManager.buttons.deleteExpense', 'Delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchExpenses(page - 1)} 
                    disabled={page === 1}
                  >
                    {t('expenseManager.buttons.previous', 'Previous')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchExpenses(page + 1)} 
                    disabled={page === totalPages}
                  >
                    {t('expenseManager.buttons.next', 'Next')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SoftDeleteConfirmationDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteExpense}
        title={t('expenseManager.buttons.deleteExpense', 'Delete Expense')}
        description={`Are you sure you want to delete this expense? The entry for €${expenseToDelete?.amount} will be permanently removed from the temple accounts ledger.`}
        actionType="hard_delete"
        loading={isDeleting}
        isFinancial={true}
        amount={expenseToDelete?.amount}
      />

      <ExpenseDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        expense={selectedExpense}
      />
    </AdminLayout>
  );
};

export default ExpenseManagerPage;