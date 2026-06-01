import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { createRecord, updateRecord, getFullList, logAdminAction } from '@/lib/pbHelper.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import AdminLayout from '@/components/AdminLayout.jsx';
import PoojaEntriesList from '@/components/PoojaEntriesList.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { 
  Loader2, Plus, X, Calendar as CalendarIcon, Edit, Trash2, UploadCloud, AlertCircle, 
  Type, Euro, Clock, Search, Eye, EyeOff, History, Archive, MoreVertical, ArchiveRestore
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile.jsx';

const GODS = ['LORD SHIVA', 'LORD GANESHA', 'LORD MURUGAN', 'LORD BHAIRAVA', 'LORD RAJA RAJESWARI AMMAN', 'OTHER'];
const CATEGORIES = ['Daily', 'Special', 'Regular', 'Festival'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AdminPoojaCreate = () => {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [refreshListTrigger, setRefreshListTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('create');
  const listRef = useRef(null);

  // Drafts State
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  
  // Archive State
  const [archivedPoojas, setArchivedPoojas] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [searchArchive, setSearchArchive] = useState('');

  // Manage Poojas State
  const [allPoojas, setAllPoojas] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchManage, setSearchManage] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [poojaToToggle, setPoojaToToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  // Delete/Archive Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poojaToDelete, setPoojaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [poojaToArchive, setPoojaToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    god: '',
    price: '',
    donation_amount: '',
    duration: 60,
    availabilityType: 'allDays',
    days: [],
    time_slots: []
  });

  // Calendar State
  const [selectedDates, setSelectedDates] = useState([]);
  const [timeInput, setTimeInput] = useState('');

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const records = await getFullList('poojas', {
        filter: '(status="draft" || published=false) && is_deleted=false && is_archived=false',
        sort: '-created'
      });
      setDrafts(records);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast.error('Failed to load draft poojas.');
    } finally {
      setLoadingDrafts(false);
    }
  };

  const fetchArchived = async () => {
    setLoadingArchived(true);
    try {
      const records = await getFullList('poojas', {
        filter: 'is_archived=true && is_deleted=false',
        sort: '-updated'
      });
      setArchivedPoojas(records);
    } catch (error) {
      console.error('Error fetching archived poojas:', error);
      toast.error('Failed to load archived poojas.');
    } finally {
      setLoadingArchived(false);
    }
  };

  const fetchAllPoojas = async () => {
    setLoadingAll(true);
    try {
      const filterStr = showArchived 
        ? 'is_deleted=false' 
        : 'is_deleted=false && is_archived=false';
        
      const records = await getFullList('poojas', {
        filter: filterStr,
        sort: '-created'
      });
      setAllPoojas(records);
    } catch (error) {
      console.error('Error fetching all poojas:', error);
      toast.error('Failed to load poojas.');
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
    fetchArchived();
    if (activeTab === 'manage') {
      fetchAllPoojas();
    }
  }, [refreshListTrigger, activeTab, showArchived]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => {
      const days = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day];
      return { ...prev, days };
    });
  };

  const addTimeSlot = () => {
    if (timeInput && !formData.time_slots.includes(timeInput)) {
      setFormData(prev => ({ ...prev, time_slots: [...prev.time_slots, timeInput] }));
      setTimeInput('');
    }
  };

  const removeTimeSlot = (time) => {
    setFormData(prev => ({ ...prev, time_slots: prev.time_slots.filter(t => t !== time) }));
  };

  const removeDate = (dateToRemove) => {
    setSelectedDates(prev => prev.filter(d => d.getTime() !== dateToRemove.getTime()));
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', category: '', god: '',
      price: '', donation_amount: '', duration: 60, availabilityType: 'allDays', days: [], time_slots: []
    });
    setSelectedDates([]);
    setEditingId(null);
  };

  const handleEdit = (pooja) => {
    let parsedDays = [];
    try { parsedDays = pooja.specificDays ? JSON.parse(pooja.specificDays) : (pooja.days ? JSON.parse(pooja.days) : []); } catch(e) {}

    let parsedTimeSlots = [];
    try { parsedTimeSlots = pooja.timeSlots ? JSON.parse(pooja.timeSlots) : (pooja.time_slots ? JSON.parse(pooja.time_slots) : []); } catch(e) {}

    let parsedDates = [];
    try {
      const datesStrArr = pooja.specificDates ? JSON.parse(pooja.specificDates) : (pooja.dates ? JSON.parse(pooja.dates) : []);
      parsedDates = datesStrArr.map(d => parseISO(d)).filter(isValid);
    } catch(e) {}

    setFormData({
      name: pooja.name || '',
      description: pooja.description || '',
      category: pooja.category || '',
      god: pooja.deity || pooja.god || '',
      price: pooja.price || pooja.donation_amount || '',
      donation_amount: pooja.donation_amount || pooja.price || '',
      duration: pooja.duration || 60,
      availabilityType: pooja.availabilityType || 'allDays',
      days: parsedDays,
      time_slots: parsedTimeSlots
    });
    
    setSelectedDates(parsedDates);
    setEditingId(pooja.id);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete Handlers
  const handleDeleteClick = (pooja) => {
    setPoojaToDelete(pooja);
    setDeleteDialogOpen(true);
  };

  const executeDeletePooja = async () => {
    if (!poojaToDelete) return;
    setIsDeleting(true);
    try {
      await pb.collection('poojas').delete(poojaToDelete.id, { $autoCancel: false });
      await logAdminAction(currentUser?.id, currentUser?.name, 'deleted', `Permanently deleted pooja: ${poojaToDelete.name}`);
      toast.success('Pooja deleted successfully');
      setRefreshListTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete pooja: ${error.message || 'Network error'}`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPoojaToDelete(null);
    }
  };

  // Archive Handlers
  const handleArchiveClick = (pooja) => {
    setPoojaToArchive(pooja);
    setArchiveDialogOpen(true);
  };

  const executeArchivePooja = async () => {
    if (!poojaToArchive) return;
    setIsArchiving(true);
    const newArchiveStatus = !poojaToArchive.is_archived;
    try {
      await updateRecord('poojas', poojaToArchive.id, { is_archived: newArchiveStatus });
      await logAdminAction(currentUser?.id, currentUser?.name, newArchiveStatus ? 'archived' : 'unarchived', `${newArchiveStatus ? 'Archived' : 'Unarchived'} pooja: ${poojaToArchive.name}`);
      toast.success(`Pooja ${newArchiveStatus ? 'archived' : 'unarchived'} successfully`);
      setRefreshListTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Archive error:', error);
      toast.error(`Failed to update archive status: ${error.message || 'Network error'}`);
    } finally {
      setIsArchiving(false);
      setArchiveDialogOpen(false);
      setPoojaToArchive(null);
    }
  };

  const handleTogglePublishClick = (pooja) => {
    setPoojaToToggle(pooja);
    setPublishDialogOpen(true);
  };

  const executeTogglePublish = async () => {
    if (!poojaToToggle) return;
    setIsToggling(true);
    const newPublishedState = !poojaToToggle.published;
    const newStatus = newPublishedState ? 'published' : 'draft';
    try {
      await updateRecord('poojas', poojaToToggle.id, { published: newPublishedState, status: newStatus });
      await logAdminAction(currentUser?.id, currentUser?.name, newPublishedState ? 'published' : 'unpublished', `${newPublishedState ? 'Published' : 'Unpublished'} pooja: ${poojaToToggle.name}`);
      toast.success(`Pooja ${newPublishedState ? 'published' : 'unpublished'} successfully`);
      setRefreshListTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
      toast.error('Failed to update pooja status');
    } finally {
      setIsToggling(false);
      setPublishDialogOpen(false);
      setPoojaToToggle(null);
    }
  };

  const handlePublishDraft = async (id, name) => {
    try {
      if (id) {
        // Publish specific draft
        await updateRecord('poojas', id, { status: 'published', published: true });
        await logAdminAction(currentUser?.id, currentUser?.name, 'published', `Published draft pooja: ${name}`);
        toast.success(`Pooja "${name}" published successfully`);
      } else {
        // Bulk publish all drafts
        const draftPoojas = drafts.filter(p => p.status === 'draft');
        for (const p of draftPoojas) {
          await updateRecord('poojas', p.id, { status: 'published', published: true });
        }
        toast.success('Draft poojas published successfully');
      }
      setRefreshListTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error publishing draft:', error);
      toast.error(`Failed to publish pooja: ${error.message || 'Network error'}`);
    }
  };

  const handleSubmit = async (status) => {
    const validationErrors = [];

    if (!formData.name?.trim()) validationErrors.push("Pooja name is required.");
    if (!formData.category) validationErrors.push("Category is required.");
    if (!formData.god) validationErrors.push("Deity / God is required.");
    if (!formData.description?.trim()) validationErrors.push("Description is required (min 1 character).");

    const priceVal = Number(formData.price);
    if (formData.price === '' || isNaN(priceVal) || priceVal < 0) {
      validationErrors.push("Please enter a valid numeric price amount.");
    }

    const durationVal = Number(formData.duration);
    if (!formData.duration || isNaN(durationVal) || durationVal < 1) {
      validationErrors.push("Duration must be at least 1 minute.");
    }

    if (validationErrors.length > 0) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }

    setLoading(true);
    try {
      const datesArray = selectedDates.map(d => format(d, 'yyyy-MM-dd'));
      const isPublished = status === 'published';

      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('god', formData.god);
      data.append('deity', formData.god);
      data.append('price', priceVal);
      data.append('donation_amount', priceVal);
      data.append('duration', Number(formData.duration));
      data.append('availabilityType', formData.availabilityType);
      data.append('specificDates', JSON.stringify(datesArray));
      data.append('dates', JSON.stringify(datesArray));
      data.append('specificDays', JSON.stringify(formData.days));
      data.append('days', JSON.stringify(formData.days));
      data.append('timeSlots', JSON.stringify(formData.time_slots));
      data.append('time_slots', JSON.stringify(formData.time_slots));
      data.append('status', status);
      data.append('published', isPublished);

      if (editingId) {
        await updateRecord('poojas', editingId, data);
        await logAdminAction(currentUser?.id, currentUser?.name, 'updated', `Updated pooja: ${formData.name}`);
        toast.success(isPublished ? 'Pooja updated and published successfully!' : 'Draft updated successfully!');
      } else {
        await createRecord('poojas', data);
        await logAdminAction(currentUser?.id, currentUser?.name, 'created', `Created pooja: ${formData.name}`);
        toast.success(isPublished ? 'Pooja created and published successfully!' : 'Pooja saved as draft successfully!');
      }
      
      resetForm();
      setRefreshListTrigger(prev => prev + 1);
      
      if (isPublished) {
        setTimeout(() => {
          listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        setActiveTab('drafts');
      }
      
    } catch (error) {
      console.error('Detailed Submission Error:', error);
      const pbErrorData = error.response?.data || error.data?.data || error.originalError?.data?.data;
      
      if (pbErrorData && typeof pbErrorData === 'object' && Object.keys(pbErrorData).length > 0) {
        Object.entries(pbErrorData).forEach(([field, errDetails]) => {
          toast.error(`Validation failed for ${field}: ${errDetails.message}`);
        });
      } else {
        toast.error(error.message || 'Failed to save pooja. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredManagePoojas = allPoojas.filter(p => 
    p.name.toLowerCase().includes(searchManage.toLowerCase()) || 
    p.category.toLowerCase().includes(searchManage.toLowerCase())
  );

  const filteredArchivedPoojas = archivedPoojas.filter(p => 
    p.name.toLowerCase().includes(searchArchive.toLowerCase()) || 
    p.category.toLowerCase().includes(searchArchive.toLowerCase())
  );

  return (
    <AdminLayout>
      <Helmet><title>Manage Poojas | Admin Portal</title></Helmet>
      <TooltipProvider>
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">Manage Pooja Catalog</h1>
            <p className="text-muted-foreground text-lg mt-1">Create, edit, and control visibility of temple pooja offerings.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-4xl grid-cols-4 mb-8 bg-muted">
              <TabsTrigger value="create">Create / Edit</TabsTrigger>
              <TabsTrigger value="manage">Manage Poojas</TabsTrigger>
              <TabsTrigger value="drafts" className="relative">
                Hidden / Drafts
                {drafts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20">
                    {drafts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archive" className="relative">
                Archive
                {archivedPoojas.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20">
                    {archivedPoojas.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-12">
              <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/20 border-b border-border/50">
                  <CardTitle className="text-2xl">{editingId ? 'Edit Pooja Offering' : 'Create New Pooja Offering'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Pooja Name <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Special Abhishekam" className="pl-9 bg-background" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Deity / God <span className="text-destructive">*</span></Label>
                      <Select value={formData.god} onValueChange={(v) => handleSelectChange('god', v)}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select Deity" /></SelectTrigger>
                        <SelectContent>
                          {GODS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Category <span className="text-destructive">*</span></Label>
                      <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Price / Donation Amount (€) <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" className="pl-9 bg-background" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (Minutes) <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="number" name="duration" value={formData.duration} onChange={handleInputChange} min="1" className="pl-9 bg-background" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Description <span className="text-destructive">*</span></Label>
                      <span className={`text-xs ${formData.description.length > 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {formData.description.length} characters (min 1)
                      </span>
                    </div>
                    <Textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} className="bg-background resize-none" placeholder="Provide details about the pooja and what devotees can expect..." />
                  </div>

                  {/* Scheduling */}
                  <div className="border-t border-border/50 pt-8 space-y-6">
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" /> Scheduling Details
                    </h3>

                    <div className="space-y-2 max-w-sm">
                      <Label>Availability Type <span className="text-destructive">*</span></Label>
                      <Select value={formData.availabilityType} onValueChange={(v) => handleSelectChange('availabilityType', v)}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allDays">Available Every Day</SelectItem>
                          <SelectItem value="specificDaysRegularly">Specific Days (Weekly)</SelectItem>
                          <SelectItem value="specificDate">Specific Dates Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-muted/10 p-4 rounded-xl border border-border/50">
                      
                      {formData.availabilityType === 'specificDate' && (
                        <div className="space-y-3">
                          <Label>Specific Dates</Label>
                          <div className="p-3 bg-card border border-border rounded-xl inline-block shadow-sm">
                            <Calendar
                              mode="multiple"
                              selected={selectedDates}
                              onSelect={setSelectedDates}
                              locale={de}
                              className="rounded-md"
                            />
                          </div>
                          {selectedDates.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-card rounded-lg border border-border/50">
                              {selectedDates.map((date, i) => (
                                <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-background border-border">
                                  {format(date, 'dd.MM.yyyy', { locale: de })}
                                  <X className="w-3.5 h-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeDate(date)} />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {formData.availabilityType === 'specificDaysRegularly' && (
                        <div className="space-y-3">
                          <Label>Available Days (Recurring)</Label>
                          <div className="flex flex-wrap gap-4 p-5 bg-card rounded-xl border border-border/50 shadow-sm">
                            {DAYS_OF_WEEK.map(day => (
                              <div key={day} className="flex items-center space-x-2">
                                <Checkbox id={`day-${day}`} checked={formData.days.includes(day)} onCheckedChange={() => handleDayToggle(day)} />
                                <label htmlFor={`day-${day}`} className="text-sm font-medium leading-none cursor-pointer">{day}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Label>Time Slots <span className="text-destructive">*</span></Label>
                        <div className="flex gap-2">
                          <div className="relative w-full max-w-xs">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="e.g. 10:00" className="pl-9 bg-background" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTimeSlot())} />
                          </div>
                          <Button type="button" onClick={addTimeSlot} variant="secondary" className="shadow-sm"><Plus className="w-4 h-4 mr-2"/> Add</Button>
                        </div>
                        {formData.time_slots.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3 p-4 bg-card rounded-xl border border-border/50 min-h-[3.5rem] shadow-sm">
                            {formData.time_slots.map(time => (
                              <Badge key={time} variant="secondary" className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-background border-border shadow-sm">
                                {time}
                                <X className="w-3.5 h-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeTimeSlot(time)} />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                    {editingId && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
                    <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={loading} className="bg-background">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save as Hidden Draft
                    </Button>
                    <Button onClick={() => handleSubmit('published')} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {editingId ? 'Update & Publish' : 'Create & Publish Pooja'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div ref={listRef} className="pt-4 scroll-mt-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Published Poojas Catalog</h2>
                <PoojaEntriesList onEditPooja={handleEdit} refreshTrigger={refreshListTrigger} />
              </div>
            </TabsContent>

            <TabsContent value="manage">
              <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Manage All Poojas</CardTitle>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-archived" 
                          checked={showArchived} 
                          onCheckedChange={(checked) => setShowArchived(checked)} 
                        />
                        <label htmlFor="show-archived" className="text-sm font-medium leading-none cursor-pointer">
                          Show Archived
                        </label>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search poojas..." 
                          value={searchManage}
                          onChange={(e) => setSearchManage(e.target.value)}
                          className="pl-9 bg-background h-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingAll ? (
                    <div className="p-6 space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="w-full h-12 rounded-lg" />
                      ))}
                    </div>
                  ) : filteredManagePoojas.length === 0 ? (
                    <div className="text-center py-16 px-4 flex flex-col items-center justify-center">
                      <History className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-1">No poojas found</h3>
                      <p className="text-muted-foreground text-sm">Try adjusting your search query or filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Pooja Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredManagePoojas.map(pooja => (
                            <TableRow key={pooja.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{pooja.name}</span>
                                  {pooja.is_archived && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Archived</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{pooja.god || pooja.deity}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-background">{pooja.category}</Badge>
                              </TableCell>
                              <TableCell>
                                {pooja.published ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shadow-none border-emerald-200">Published</Badge>
                                ) : (
                                  <Badge variant="secondary" className="shadow-none">Unpublished</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleTogglePublishClick(pooja)}
                                    className={`mr-1 ${pooja.published ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"}`}
                                  >
                                    {pooja.published ? <><EyeOff className="w-4 h-4 mr-1" /> Unpublish</> : <><Eye className="w-4 h-4 mr-1" /> Publish</>}
                                  </Button>
                                  
                                  {isMobile ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(pooja)}>
                                          <Edit className="w-4 h-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleArchiveClick(pooja)}>
                                          {pooja.is_archived ? (
                                            <><ArchiveRestore className="w-4 h-4 mr-2" /> Unarchive</>
                                          ) : (
                                            <><Archive className="w-4 h-4 mr-2" /> Archive</>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteClick(pooja)} className="text-destructive focus:text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(pooja)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit Pooja</TooltipContent>
                                      </Tooltip>
                                      
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleArchiveClick(pooja)}>
                                            {pooja.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{pooja.is_archived ? 'Unarchive Pooja' : 'Archive Pooja'}</TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(pooja)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete Pooja</TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
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

            <TabsContent value="drafts">
              <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/20 border-b border-border/50">
                  <CardTitle>Hidden / Draft Poojas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingDrafts ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : drafts.length === 0 ? (
                    <div className="text-center py-20 px-4 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No hidden poojas found</h3>
                      <p className="text-muted-foreground text-sm max-w-md">
                        Drafts or unpublished poojas will appear here.
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab('create')}>
                        Create a New Pooja
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Pooja Details</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drafts.map(draft => (
                          <TableRow key={draft.id}>
                            <TableCell>
                              <div className="font-medium text-foreground">{draft.name}</div>
                              <div className="text-xs text-muted-foreground">{draft.god || draft.deity}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-background">{draft.category}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              €{draft.price || draft.donation_amount}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(draft.created).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(draft)}>
                                  <Edit className="w-4 h-4 mr-1" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => handlePublishDraft(draft.id, draft.name)}>
                                  <UploadCloud className="w-4 h-4 mr-1" /> Publish
                                </Button>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => handleDeleteClick(draft)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="archive">
              <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Archived Poojas</CardTitle>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search archives..." 
                        value={searchArchive}
                        onChange={(e) => setSearchArchive(e.target.value)}
                        className="pl-9 bg-background h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingArchived ? (
                    <div className="p-6 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="w-full h-12 rounded-lg" />
                      ))}
                    </div>
                  ) : filteredArchivedPoojas.length === 0 ? (
                    <div className="text-center py-20 px-4 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Archive className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">No archived poojas</h3>
                      <p className="text-muted-foreground text-sm max-w-md">
                        {searchArchive ? 'No archived poojas match your search.' : 'Poojas that are no longer active can be archived. They will appear here.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Pooja Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredArchivedPoojas.map(pooja => (
                            <TableRow key={pooja.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div className="font-medium text-foreground">{pooja.name}</div>
                                <div className="text-xs text-muted-foreground">{pooja.god || pooja.deity}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-background">{pooja.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-muted text-muted-foreground border-border shadow-none">Archived</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1">
                                  {isMobile ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(pooja)}>
                                          <Edit className="w-4 h-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleArchiveClick(pooja)}>
                                          <ArchiveRestore className="w-4 h-4 mr-2" /> Unarchive
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteClick(pooja)} className="text-destructive focus:text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(pooja)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit Pooja</TooltipContent>
                                      </Tooltip>
                                      
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleArchiveClick(pooja)}>
                                            <ArchiveRestore className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Unarchive Pooja</TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(pooja)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete Pooja</TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
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
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pooja</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this pooja? This action cannot be undone.
                {poojaToDelete && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border/50">
                    <span className="font-medium text-foreground block">{poojaToDelete.name}</span>
                    <span className="text-sm text-muted-foreground">{poojaToDelete.category}</span>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); executeDeletePooja(); }} 
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Archive Confirmation Dialog */}
        <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{poojaToArchive?.is_archived ? 'Unarchive Pooja' : 'Archive Pooja'}</AlertDialogTitle>
              <AlertDialogDescription>
                {poojaToArchive?.is_archived 
                  ? 'Unarchive this pooja? It will become visible in the public catalog again if published.' 
                  : 'Archive this pooja? It will be hidden from the public catalog and can be unarchived later.'}
                {poojaToArchive && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border/50">
                    <span className="font-medium text-foreground block">{poojaToArchive.name}</span>
                    <span className="text-sm text-muted-foreground">{poojaToArchive.category}</span>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); executeArchivePooja(); }} 
                disabled={isArchiving}
              >
                {isArchiving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (poojaToArchive?.is_archived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />)}
                {poojaToArchive?.is_archived ? 'Unarchive' : 'Archive'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Publish Toggle Dialog */}
        <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {poojaToToggle?.published ? <EyeOff className="w-5 h-5 text-amber-600" /> : <Eye className="w-5 h-5 text-emerald-600" />}
                {poojaToToggle?.published ? 'Unpublish Pooja?' : 'Publish Pooja?'}
              </DialogTitle>
              <DialogDescription className="pt-3 text-base">
                Are you sure you want to {poojaToToggle?.published ? 'unpublish' : 'publish'} this pooja?
                {poojaToToggle && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50 flex flex-col gap-1">
                    <span className="font-semibold text-foreground">{poojaToToggle.name}</span>
                    <span className="text-sm text-muted-foreground">{poojaToToggle.god || poojaToToggle.deity} • {poojaToToggle.category}</span>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-6">
              <Button variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={isToggling}>
                Cancel
              </Button>
              <Button 
                variant={poojaToToggle?.published ? "destructive" : "default"} 
                onClick={executeTogglePublish} 
                disabled={isToggling}
                className={!poojaToToggle?.published ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              >
                {isToggling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AdminLayout>
  );
};

export default AdminPoojaCreate;