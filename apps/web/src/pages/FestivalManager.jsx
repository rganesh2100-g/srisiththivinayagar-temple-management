import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import AdminLayout from '@/components/AdminLayout.jsx';
import SoftDeleteConfirmationDialog from '@/components/SoftDeleteConfirmationDialog.jsx';
import ExcelExportButton from '@/components/ExcelExportButton.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, Edit2, Image as ImageIcon, Calendar, PartyPopper, AlertCircle, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

const FestivalManager = () => {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('active');

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    festival: null,
    type: 'soft_delete',
    loading: false
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    status: 'active'
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const fetchFestivals = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await pb.collection('festivals').getFullList({
        filter: `is_deleted=${activeTab === 'deleted'}`,
        sort: '-date',
        $autoCancel: false
      });
      setFestivals(records);
    } catch (err) {
      console.error('Error fetching festivals:', err);
      setError('Failed to load festivals. Please try again.');
      toast.error('Failed to load festivals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFestivals();
  }, [activeTab]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20971520) {
      toast.error('File size must be less than 20MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', date: '', status: 'active' });
    setImageFile(null);
    setPreviewUrl('');
    setIsEditing(false);
    setCurrentId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date) {
      toast.error('Name and Date are required');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('date', new Date(formData.date).toISOString());
      submitData.append('status', formData.status);
      
      if (imageFile) {
        submitData.append('image', imageFile);
      } else if (!previewUrl && isEditing) {
        // If editing and preview is empty, it means the user removed the existing image
        submitData.append('image', ''); 
      }

      if (isEditing && currentId) {
        await pb.collection('festivals').update(currentId, submitData, { $autoCancel: false });
        toast.success('Festival updated successfully');
      } else {
        await pb.collection('festivals').create(submitData, { $autoCancel: false });
        toast.success('Festival created successfully');
      }
      
      resetForm();
      fetchFestivals();
    } catch (err) {
      console.error('Error saving festival:', err);
      toast.error('Failed to save festival. Ensure all fields are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (festival) => {
    setFormData({
      name: festival.name,
      description: festival.description || '',
      date: festival.date ? festival.date.split('T')[0] : '',
      status: festival.status || 'active'
    });
    setCurrentId(festival.id);
    setIsEditing(true);
    setActiveTab('active');
    
    // Set preview URL for existing image
    if (festival.image) {
      setPreviewUrl(pb.files.getUrl(festival, festival.image));
    } else {
      setPreviewUrl('');
    }
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDeleteDialog = (festival, type) => {
    setDeleteDialog({
      isOpen: true,
      festival,
      type,
      loading: false
    });
  };

  const confirmDeleteAction = async () => {
    const { festival, type } = deleteDialog;
    if (!festival) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));
    
    try {
      if (type === 'soft_delete') {
        await pb.collection('festivals').update(festival.id, { is_deleted: true }, { $autoCancel: false });
        toast.success('Festival moved to trash');
      } else if (type === 'restore') {
        await pb.collection('festivals').update(festival.id, { is_deleted: false }, { $autoCancel: false });
        toast.success('Festival restored successfully');
      } else if (type === 'hard_delete') {
        await pb.collection('festivals').delete(festival.id, { $autoCancel: false });
        toast.success('Festival permanently deleted');
      }
      
      setDeleteDialog({ isOpen: false, festival: null, type: 'soft_delete', loading: false });
      fetchFestivals();
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      toast.error(`Failed to ${type.replace('_', ' ')} festival`);
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active';
    try {
      await pb.collection('festivals').update(id, { status: newStatus }, { $autoCancel: false });
      toast.success(`Festival marked as ${newStatus}`);
      fetchFestivals();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getImageUrl = (festival) => {
    if (!festival.image) return null;
    try {
      return pb.files.getUrl(festival, festival.image, { thumb: '100x100' });
    } catch (e) {
      return null;
    }
  };

  const exportColumns = [
    { header: 'Festival Name', key: 'name' },
    { header: 'Date', accessor: (row) => formatDate(row.date) },
    { header: 'Status', key: 'status' },
    { header: 'Description', key: 'description' },
    { header: 'Created At', accessor: (row) => new Date(row.created).toLocaleString() }
  ];

  return (
    <AdminLayout>
      <Helmet>
        <title>Festival Manager | Admin | Sri Siththi Vinayagar Tempel Kultur Verein e.V</title>
      </Helmet>
      
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#8B0000] mb-2">Festival Manager</h1>
          <p className="text-gray-600">Create and manage temple festivals and events.</p>
        </div>
        {activeTab === 'active' && (
          <ExcelExportButton 
            data={festivals} 
            filename="festivals" 
            columns={exportColumns} 
            className="bg-white"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-none shadow-md lg:col-span-1 h-fit sticky top-24">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">{isEditing ? 'Edit Festival' : 'Create New Festival'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Festival Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-white text-black"
                  placeholder="e.g., Diwali Celebration"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date" className="font-semibold">Date *</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  value={formData.date} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-white text-black"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  rows={4}
                  className="bg-white text-black resize-none"
                  placeholder="Details about the festival..."
                />
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Cover Image</Label>
                
                <Input 
                  id="image_file" 
                  type="file" 
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="bg-white text-black cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#CC2222] hover:file:bg-red-100"
                />
                <p className="text-xs text-gray-500">Max size: 20MB. Formats: JPEG, PNG, GIF, WebP.</p>

                {previewUrl && (
                  <div className="mt-4 relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        className="gap-2"
                        onClick={handleRemoveImage}
                      >
                        <Trash2 className="w-4 h-4" /> Remove Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" disabled={submitting} className="flex-1 bg-[#CC2222] hover:bg-[#8B0000] text-white">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (isEditing ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                  {isEditing ? 'Update Festival' : 'Create Festival'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md lg:col-span-2">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-0">
            <div className="flex flex-row items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-[#CC2222]" /> Festivals
              </CardTitle>
              <span className="text-sm text-gray-500 font-medium">{festivals.length} total</span>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-[-1px] rounded-b-none border-b border-gray-200 bg-transparent p-0">
                <TabsTrigger 
                  value="active" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#CC2222] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Active Festivals
                </TabsTrigger>
                <TabsTrigger 
                  value="deleted" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#CC2222] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Trash / Deleted
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-xl">
                    <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load festivals</h3>
                <p className="text-gray-500 mb-6 max-w-md">{error}</p>
                <Button onClick={fetchFestivals} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Retry
                </Button>
              </div>
            ) : festivals.length === 0 ? (
              <div className="text-center py-16 px-4 text-gray-500">
                {activeTab === 'active' ? (
                  <>
                    <PartyPopper className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No festivals created yet</h3>
                    <p>Use the form to add your first festival.</p>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Trash is empty</h3>
                    <p>No deleted festivals found.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {festivals.map((festival) => {
                  const imageUrl = getImageUrl(festival);
                  return (
                    <div key={festival.id} className={`p-6 transition-all hover:bg-gray-50 ${festival.status === 'archived' || activeTab === 'deleted' ? 'opacity-75 bg-gray-50/50' : 'bg-white'}`}>
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="w-full sm:w-24 h-48 sm:h-24 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200 relative">
                          {imageUrl ? (
                            <img src={imageUrl} alt={festival.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2 flex-wrap">
                                {festival.name}
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${festival.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                  {festival.status || 'active'}
                                </span>
                              </h3>
                              <p className="text-sm text-[#CC2222] font-semibold mt-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(festival.date)}
                              </p>
                              {activeTab === 'deleted' && (
                                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> Deleted: {new Date(festival.updated).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0 mt-2 sm:mt-0 flex-wrap">
                              {activeTab === 'active' ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(festival)} className="h-8 px-3">
                                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => toggleStatus(festival.id, festival.status || 'active')} className="h-8 px-3">
                                    {festival.status === 'active' ? 'Archive' : 'Activate'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openDeleteDialog(festival, 'soft_delete')} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100" aria-label="Move to Trash">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => openDeleteDialog(festival, 'restore')} className="h-8 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Restore
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(festival, 'hard_delete')} className="h-8 px-3">
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Permanently
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                            {festival.description || <span className="italic text-gray-400">No description provided.</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SoftDeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, festival: null, type: 'soft_delete', loading: false })}
        onConfirm={confirmDeleteAction}
        title={
          deleteDialog.type === 'soft_delete' ? 'Move Festival to Trash?' :
          deleteDialog.type === 'restore' ? 'Restore Festival?' : 'Permanently Delete Festival?'
        }
        description={
          deleteDialog.type === 'soft_delete' ? `Are you sure you want to move "${deleteDialog.festival?.name}" to trash?` :
          deleteDialog.type === 'restore' ? `This will restore "${deleteDialog.festival?.name}" back to the active list.` :
          `Are you sure you want to permanently delete "${deleteDialog.festival?.name}"? This action cannot be undone.`
        }
        actionType={deleteDialog.type}
        loading={deleteDialog.loading}
      />
    </AdminLayout>
  );
};

export default FestivalManager;