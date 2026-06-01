import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, X, Image as ImageIcon, Loader2, FolderPlus, 
  Folder, Trash2, Edit, CheckCircle, XCircle, Archive, 
  FolderInput, AlertCircle, Film, Eye, EyeOff, Search
} from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import imageCompression from 'browser-image-compression';
import AdminLayout from '@/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import SoftDeleteConfirmationDialog from '@/components/SoftDeleteConfirmationDialog.jsx';
import EditCategoryModal from '@/components/EditCategoryModal.jsx';

const MAX_STORAGE_BYTES = 1000 * 1024 * 1024; // 1000 MB

// Helper to encode/decode date into description
const buildDescription = (date, text) => {
  if (date) return `[Date: ${date}] ${text || ''}`;
  return text || '';
};

const parseDescription = (fullDesc) => {
  if (!fullDesc) return { date: '', text: '' };
  const match = fullDesc.match(/^\[Date: (.*?)\]\s*(.*)$/s);
  if (match) return { date: match[1], text: match[2] };
  return { date: '', text: fullDesc };
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isVideoFile = (filename) => {
  if (!filename) return false;
  return !!filename.match(/\.(mp4|webm|mov|avi)$/i);
};

const AdminGalleryManagement = () => {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const fileInputRef = useRef(null);

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Modals State
  const [imageToDelete, setImageToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [movingImage, setMovingImage] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [isCategoryActionLoading, setIsCategoryActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [catsRes, imgsRes] = await Promise.all([
        pb.collection('photo_categories').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('gallery').getFullList({ sort: '-created', expand: 'category_id', $autoCancel: false })
      ]);

      setCategories(catsRes);
      setImages(imgsRes);

      // Calculate storage
      const totalSize = imgsRes.reduce((acc, img) => acc + (img.storage_size || 0), 0);
      setStorageUsed(totalSize);

    } catch (error) {
      console.error('Failed to fetch gallery data:', error);
      toast.error('Failed to load gallery data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription
    const subscribe = async () => {
      try {
        await pb.collection('gallery').subscribe('*', () => {
          fetchData();
        });
        await pb.collection('photo_categories').subscribe('*', () => {
          fetchData();
        });
      } catch (err) {
        console.error('Subscription error:', err);
      }
    };
    subscribe();

    return () => {
      pb.collection('gallery').unsubscribe('*').catch(console.error);
      pb.collection('photo_categories').unsubscribe('*').catch(console.error);
    };
  }, []);

  // --- Category Management ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return toast.error('Category name is required');

    try {
      await pb.collection('photo_categories').create({
        name: newCategoryName,
        description: newCategoryDesc,
        created_by: pb.authStore.model?.id,
        default_expanded: false,
        is_published: true
      }, { $autoCancel: false });
      
      toast.success('Category created successfully');
      setNewCategoryName('');
      setNewCategoryDesc('');
    } catch (error) {
      console.error('Create category error:', error);
      toast.error('Failed to create category');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    setIsCategoryActionLoading(true);
    try {
      const photosInCat = await pb.collection('gallery').getFullList({
        filter: `category_id="${categoryToDelete.id}"`,
        $autoCancel: false
      });

      for (const photo of photosInCat) {
        await pb.collection('gallery').delete(photo.id, { $autoCancel: false });
      }

      await pb.collection('photo_categories').delete(categoryToDelete.id, { $autoCancel: false });
      
      toast.success('Folder and all contents deleted successfully');
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error('Failed to delete folder and its contents');
    } finally {
      setCategoryToDelete(null);
      setIsCategoryActionLoading(false);
    }
  };

  const toggleCategoryPublish = async (category) => {
    const newStatus = !category.is_published;
    try {
      await pb.collection('photo_categories').update(category.id, {
        is_published: newStatus
      }, { $autoCancel: false });
      toast.success(`Category ${newStatus ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Toggle category publish error:', error);
      toast.error('Failed to update category visibility');
    }
  };

  const toggleCategoryExpanded = async (category) => {
    try {
      const newValue = !category.default_expanded;
      await pb.collection('photo_categories').update(category.id, {
        default_expanded: newValue
      }, { $autoCancel: false });
      toast.success(`Category set to ${newValue ? 'Expanded' : 'Collapsed'} by default`);
    } catch (error) {
      console.error('Toggle category expanded error:', error);
      toast.error('Failed to update category preference');
    }
  };

  // --- Photo/Video Management ---
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const invalidFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
    if (invalidFiles.length > 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadFiles([]);
      return toast.error('Please select only image or video files');
    }

    setUploadFiles(files);
    if (!uploadTitle) {
      if (files.length === 1) {
        setUploadTitle(files[0].name.split('.')[0]);
      } else {
        setUploadTitle('Gallery Upload');
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return toast.error('Please select at least one file');
    if (!uploadTitle.trim()) return toast.error('Title is required');
    if (!uploadCategory) return toast.error('Category is required');

    const totalRawSize = uploadFiles.reduce((acc, file) => acc + file.size, 0);

    if (storageUsed + totalRawSize > MAX_STORAGE_BYTES) {
      toast.error(`Storage limit reached. The selected files exceed available space.`);
      return;
    }

    const finalDesc = buildDescription(uploadDate, uploadDescription);
    const catName = categories.find(c => c.id === uploadCategory)?.name || 'Unknown Category';

    setPendingUpload({
      files: uploadFiles,
      title: uploadTitle.trim(),
      categoryId: uploadCategory,
      categoryName: catName,
      description: finalDesc,
      totalSize: totalRawSize
    });
  };

  const confirmUpload = async () => {
    if (!pendingUpload || pendingUpload.files.length === 0) return;
    
    setIsUploading(true);
    let successPhotos = 0;
    let successVideos = 0;
    const totalFiles = pendingUpload.files.length;
    
    try {
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      for (let i = 0; i < totalFiles; i++) {
        setUploadProgress({ current: i + 1, total: totalFiles });
        const file = pendingUpload.files[i];
        const isImage = file.type.startsWith('image/');

        let processedFile = file;
        if (isImage) {
          try {
            processedFile = await imageCompression(file, options);
          } catch (compressionError) {
            console.warn('Image compression failed for', file.name, compressionError);
          }
        }

        const formData = new FormData();
        formData.append('image', processedFile);
        formData.append('title', pendingUpload.title);
        formData.append('category_id', pendingUpload.categoryId);
        formData.append('storage_size', processedFile.size);
        formData.append('is_published', true);
        formData.append('archived', false);
        formData.append('uploadedBy', pb.authStore.model?.id);
        formData.append('description', pendingUpload.description);

        await pb.collection('gallery').create(formData, { expand: 'category_id', $autoCancel: false });
        
        if (isImage) successPhotos++;
        else successVideos++;
      }
      
      const parts = [];
      if (successPhotos > 0) parts.push(`${successPhotos} photo${successPhotos > 1 ? 's' : ''}`);
      if (successVideos > 0) parts.push(`${successVideos} video${successVideos > 1 ? 's' : ''}`);
      toast.success(`Successfully uploaded ${parts.join(' and ')}`);
      
      setUploadFiles([]);
      setUploadTitle('');
      setUploadDescription('');
      setUploadDate('');
      setUploadCategory('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setPendingUpload(null);
    } catch (error) {
      console.error('Upload error:', error);
      const totalSuccess = successPhotos + successVideos;
      toast.error(`Failed during upload. Uploaded ${totalSuccess} out of ${totalFiles} files.`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const togglePublish = async (image) => {
    try {
      await pb.collection('gallery').update(image.id, {
        is_published: !image.is_published
      }, { $autoCancel: false });
      toast.success(image.is_published ? 'Item unpublished' : 'Item published');
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  const toggleArchive = async (image) => {
    try {
      await pb.collection('gallery').update(image.id, {
        archived: !image.archived,
        is_published: false
      }, { $autoCancel: false });
      toast.success(image.archived ? 'Item unarchived' : 'Item archived');
    } catch (error) {
      toast.error('Failed to update archive status');
    }
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;
    try {
      await pb.collection('gallery').delete(imageToDelete, { $autoCancel: false });
      toast.success('Item deleted permanently');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    } finally {
      setImageToDelete(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingImage) return;

    try {
      const finalDesc = buildDescription(editingImage.parsedDate, editingImage.parsedText);
      await pb.collection('gallery').update(editingImage.id, {
        title: editingImage.title,
        description: finalDesc,
      }, { $autoCancel: false });
      
      toast.success('Details updated');
      setEditingImage(null);
    } catch (error) {
      toast.error('Failed to update details');
    }
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (!movingImage || !movingImage.newCategoryId) return;

    try {
      await pb.collection('gallery').update(movingImage.id, {
        category_id: movingImage.newCategoryId
      }, { $autoCancel: false });
      
      toast.success('Item moved successfully');
      setMovingImage(null);
    } catch (error) {
      toast.error('Failed to move item');
    }
  };

  const storagePercentage = Math.min((storageUsed / MAX_STORAGE_BYTES) * 100, 100);
  const storageFormattedMB = (storageUsed / (1024 * 1024)).toFixed(2);
  const limitFormattedMB = (MAX_STORAGE_BYTES / (1024 * 1024)).toFixed(0);

  // Filter images based on search query
  const filteredImages = images.filter(img => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (img.title && img.title.toLowerCase().includes(query)) ||
      (img.description && img.description.toLowerCase().includes(query))
    );
  });

  // Group photos for display
  const groupedPhotos = categories.map(cat => ({
    ...cat,
    photos: filteredImages.filter(img => img.category_id === cat.id)
  }));
  const uncategorizedPhotos = filteredImages.filter(img => !img.category_id);
  if (uncategorizedPhotos.length > 0) {
    groupedPhotos.push({ id: 'uncategorized', name: 'Uncategorized', photos: uncategorizedPhotos });
  }

  return (
    <AdminLayout title="Gallery Management">
      <Helmet>
        <title>Gallery Management - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Storage Tracker */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Storage Management
                  {storagePercentage >= 95 && <AlertCircle className="w-4 h-4 text-destructive" />}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Used: {storageFormattedMB} MB / {limitFormattedMB} MB
                </p>
              </div>
              <Badge variant={storagePercentage > 90 ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                {storagePercentage.toFixed(1)}% Used
              </Badge>
            </div>
            <Progress value={storagePercentage} className={`h-3 ${storagePercentage > 90 ? '[&>div]:bg-destructive' : ''}`} />
            {storagePercentage >= 100 && (
              <p className="text-sm text-destructive mt-3 font-medium bg-destructive/10 p-3 rounded-md border border-destructive/20">
                Storage limit reached. Please delete some items to free up space before uploading new ones.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="photos">Manage Media</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* PHOTOS TAB */}
          <TabsContent value="photos" className="space-y-8">
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search media by title or description..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0 px-0"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                ))}
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
                <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No media found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "No items match your search." : "Upload some photos or videos to start building your gallery."}
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {groupedPhotos.filter(g => g.photos.length > 0 || (g.id !== 'uncategorized' && !searchQuery)).map((group) => (
                  <div key={group.id} className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <Folder className={`w-5 h-5 ${group.is_published ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h2 className="text-xl font-bold tracking-tight text-foreground">{group.name}</h2>
                        
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant="secondary">{group.photos.length} Items</Badge>
                          {group.id !== 'uncategorized' && (
                            <Badge 
                              variant={group.is_published ? "default" : "outline"} 
                              className={group.is_published ? "bg-green-500 hover:bg-green-600 border-transparent shadow-sm" : "text-muted-foreground border-dashed"}
                            >
                              {group.is_published ? 'Published' : 'Hidden'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Category Action Buttons */}
                      {group.id !== 'uncategorized' && (
                        <div className="flex items-center gap-1.5 sm:ml-auto">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleCategoryPublish(group)}
                            title={group.is_published ? "Unpublish Category" : "Publish Category"}
                          >
                            {group.is_published ? <EyeOff className="w-4 h-4 mr-1.5 text-orange-500" /> : <Eye className="w-4 h-4 mr-1.5 text-green-500" />}
                            <span className="hidden sm:inline text-xs">{group.is_published ? 'Unpublish' : 'Publish'}</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingCategory(group)}
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline text-xs">Edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setCategoryToDelete(group)}
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline text-xs">Delete</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {group.photos.length === 0 ? (
                       <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border/50">
                         <p className="text-sm text-muted-foreground">This folder is empty.</p>
                       </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <AnimatePresence>
                          {group.photos.map((image) => {
                            const { date, text } = parseDescription(image.description);
                            const isVideo = isVideoFile(image.image);
                            
                            return (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={image.id}
                                className={`group relative rounded-xl overflow-hidden border shadow-sm transition-all hover:shadow-md flex flex-col bg-card ${
                                  image.archived ? 'opacity-75 grayscale-[0.5]' : ''
                                }`}
                              >
                                <div className="aspect-[4/3] relative overflow-hidden bg-muted flex items-center justify-center">
                                  {isVideo ? (
                                    <video
                                      src={pb.files.getUrl(image, image.image)}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      controls
                                      preload="metadata"
                                    />
                                  ) : (
                                    <img
                                      src={pb.files.getUrl(image, image.image, { thumb: '400x300' })}
                                      alt={image.title}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  )}
                                  <div className="absolute top-2 left-2 flex flex-col gap-2">
                                    {image.is_published ? (
                                      <Badge className="bg-green-500 hover:bg-green-600 shadow-sm border-transparent">Published</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600 shadow-sm border-transparent">Draft</Badge>
                                    )}
                                    {image.archived && (
                                      <Badge variant="destructive" className="shadow-sm">Archived</Badge>
                                    )}
                                  </div>
                                  {isVideo && (
                                    <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-md backdrop-blur-sm">
                                      <Film className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="p-4 flex-1 flex flex-col">
                                  <h4 className="font-semibold text-foreground truncate" title={image.title}>{image.title}</h4>
                                  {date && <p className="text-xs text-muted-foreground mt-1 font-medium">{date}</p>}
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">
                                    {text || <span className="italic opacity-50">No description</span>}
                                  </p>
                                  
                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                      {formatBytes(image.storage_size)}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={image.is_published ? "Unpublish" : "Publish"} onClick={() => togglePublish(image)} disabled={image.archived}>
                                        {image.is_published ? <XCircle className="h-4 w-4 text-orange-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => {
                                        const parsed = parseDescription(image.description);
                                        setEditingImage({...image, parsedDate: parsed.date, parsedText: parsed.text});
                                      }}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Move to Folder" onClick={() => setMovingImage({...image, newCategoryId: image.category_id})}>
                                        <FolderInput className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={image.archived ? "Unarchive" : "Archive"} onClick={() => toggleArchive(image)}>
                                        <Archive className={`h-4 w-4 ${image.archived ? 'text-primary' : ''}`} />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete" onClick={() => setImageToDelete(image.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* UPLOAD TAB */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Photos & Videos</CardTitle>
                <CardDescription>Select one or more photos or videos, add common metadata, and upload. Images are automatically compressed.</CardDescription>
              </CardHeader>
              <CardContent>
                {storagePercentage >= 100 ? (
                  <div className="p-8 text-center bg-destructive/5 rounded-xl border border-destructive/20">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4 opacity-80" />
                    <h3 className="text-xl font-semibold text-destructive mb-2">Storage Limit Reached</h3>
                    <p className="text-destructive/80 max-w-md mx-auto">
                      You have used all your available storage ({limitFormattedMB} MB). 
                      Please navigate to the "Manage Media" tab and delete or archive existing items to free up space.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUploadSubmit} className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="photo-file">Select Media *</Label>
                          <Input 
                            id="photo-file" 
                            type="file" 
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                            onChange={handleFileSelect}
                            ref={fileInputRef}
                            className="cursor-pointer file:text-foreground file:bg-muted file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded-md hover:file:bg-muted/80"
                          />
                          {uploadFiles.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Selected {uploadFiles.length} file{uploadFiles.length !== 1 && 's'}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="photo-title">Name of Media *</Label>
                          <Input 
                            id="photo-title" 
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            placeholder="e.g., Annual Festival 2025"
                            required
                          />
                          <p className="text-xs text-muted-foreground">All selected files will share this name.</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="photo-date">Select Date</Label>
                          <Input 
                            id="photo-date" 
                            type="date"
                            value={uploadDate}
                            onChange={(e) => setUploadDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="photo-category">Category *</Label>
                          <Select value={uploadCategory} onValueChange={setUploadCategory} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {categories.length === 0 && (
                            <p className="text-xs text-destructive mt-1">Please create a category first.</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="photo-desc">Description (Optional)</Label>
                          <Textarea 
                            id="photo-desc" 
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            placeholder="Add some context about these files..."
                            className="h-32 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full md:w-auto min-w-[200px]" 
                      disabled={uploadFiles.length === 0 || !uploadTitle || !uploadCategory}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Review & Upload
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Create Category Form */}
              <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle>Create Category</CardTitle>
                  <CardDescription>Categories act as folders to organize your media.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Category Name *</Label>
                      <Input 
                        id="cat-name" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Festivals, Temple Events"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-desc">Description (Optional)</Label>
                      <Textarea 
                        id="cat-desc" 
                        value={newCategoryDesc}
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        placeholder="Brief description..."
                        className="resize-none"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!newCategoryName.trim()}>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create Category
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Category List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Existing Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                      <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No categories created yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map(cat => {
                        const photoCount = images.filter(img => img.category_id === cat.id).length;
                        return (
                          <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4">
                            <div className="flex items-start sm:items-center gap-4">
                              <div className={`p-2 rounded-md shrink-0 ${cat.is_published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                <Folder className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-foreground">{cat.name}</h4>
                                  {!cat.is_published && <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground border-dashed">Hidden</Badge>}
                                </div>
                                {cat.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{cat.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                              <div className="flex items-center gap-2 mr-2">
                                <Switch 
                                  id={`expand-${cat.id}`}
                                  checked={!!cat.default_expanded}
                                  onCheckedChange={() => toggleCategoryExpanded(cat)}
                                />
                                <Label htmlFor={`expand-${cat.id}`} className="text-xs text-muted-foreground cursor-pointer w-28">
                                  {cat.default_expanded ? 'Expanded by default' : 'Collapsed by default'}
                                </Label>
                              </div>
                              <Badge variant="secondary" className="shrink-0">{photoCount} items</Badge>
                              
                              <div className="flex items-center border-l pl-2 ml-2 gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                  onClick={() => toggleCategoryPublish(cat)}
                                  title={cat.is_published ? "Unpublish Category" : "Publish Category"}
                                >
                                  {cat.is_published ? <EyeOff className="w-4 h-4 text-orange-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                  onClick={() => setEditingCategory(cat)}
                                  title="Edit Category"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() => setCategoryToDelete(cat)}
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Confirmation Dialog */}
      <Dialog open={!!pendingUpload} onOpenChange={(open) => !open && !isUploading && setPendingUpload(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Upload</DialogTitle>
            <DialogDescription>
              Please review the details before saving the media to the gallery.
            </DialogDescription>
          </DialogHeader>
          {pendingUpload && (
            <div className="bg-muted p-4 rounded-lg mt-2 space-y-3 text-sm">
              
              <div className="flex justify-between items-start gap-4">
                <span className="text-muted-foreground shrink-0">
                  Files ({pendingUpload.files.filter(f => f.type.startsWith('image/')).length} photos, {pendingUpload.files.filter(f => f.type.startsWith('video/')).length} videos):
                </span>
                <ScrollArea className="h-20 w-full rounded-md border bg-card p-2 shadow-inner">
                  {pendingUpload.files.map((file, index) => (
                    <div key={index} className="font-medium text-foreground truncate text-xs mb-1 flex items-center gap-1.5" title={file.name}>
                      {file.type.startsWith('video/') ? <Film className="w-3 h-3 text-muted-foreground" /> : <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                      {file.name}
                    </div>
                  ))}
                </ScrollArea>
              </div>

              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Title:</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{pendingUpload.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Folder:</span>
                <span className="font-medium text-foreground">{pendingUpload.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Raw Size:</span>
                <span className="font-medium text-foreground">{formatBytes(pendingUpload.totalSize)}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-green-500 hover:bg-green-600 border-transparent">Will be Published</Badge>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6 flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingUpload(null)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={confirmUpload} disabled={isUploading} className="min-w-[140px]">
              {isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploadProgress ? `Saving ${uploadProgress.current}/${uploadProgress.total}...` : 'Saving...'}</>
              ) : (
                `Upload ${pendingUpload ? pendingUpload.files.length : ''} Items`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Photo Dialog */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Details</DialogTitle>
            <DialogDescription>Update the metadata for this item.</DialogDescription>
          </DialogHeader>
          {editingImage && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Name</Label>
                <Input 
                  id="edit-title" 
                  value={editingImage.title}
                  onChange={(e) => setEditingImage({...editingImage, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input 
                  id="edit-date" 
                  type="date"
                  value={editingImage.parsedDate || ''}
                  onChange={(e) => setEditingImage({...editingImage, parsedDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea 
                  id="edit-desc" 
                  value={editingImage.parsedText || ''}
                  onChange={(e) => setEditingImage({...editingImage, parsedText: e.target.value})}
                  className="resize-none"
                />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingImage(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <EditCategoryModal 
        isOpen={!!editingCategory} 
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
        onSuccess={fetchData}
      />

      {/* Move Folder Dialog */}
      <Dialog open={!!movingImage} onOpenChange={(open) => !open && setMovingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
            <DialogDescription>Select a new category folder for this item.</DialogDescription>
          </DialogHeader>
          {movingImage && (
            <form onSubmit={handleMoveSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Destination Category</Label>
                <Select 
                  value={movingImage.newCategoryId || ''} 
                  onValueChange={(val) => setMovingImage({...movingImage, newCategoryId: val})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setMovingImage(null)}>Cancel</Button>
                <Button type="submit">Move Item</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Image Confirmation */}
      <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone and it will be permanently removed from the gallery and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteImage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation using SoftDeleteConfirmationDialog (configured for Hard Delete) */}
      <SoftDeleteConfirmationDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        description={`Are you sure you want to permanently delete the "${categoryToDelete?.name}" category? This will delete the folder and ALL files inside. This action cannot be undone.`}
        actionType="hard_delete"
        loading={isCategoryActionLoading}
      />

    </AdminLayout>
  );
};

export default AdminGalleryManagement;