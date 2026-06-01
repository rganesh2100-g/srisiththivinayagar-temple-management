import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { isPreviewMode } from '@/lib/envUtils.js';
import { Camera, Play, Image as ImageIcon, Film, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import UnifiedDashboardSidebar from '@/components/UnifiedDashboardSidebar.jsx';
import { Badge } from '@/components/ui/badge';
import { extractVideoThumbnail } from '@/lib/videoUtils.js';
import ImageLightbox from '@/components/ImageLightbox.jsx';
import VideoLightbox from '@/components/VideoLightbox.jsx';

const isVideoFile = (filename) => {
  if (!filename) return false;
  return /\.(mp4|webm|mov|avi)$/i.test(filename);
};

const GalleryMediaItem = ({ photo, onClick }) => {
  const [thumb, setThumb] = useState(null);
  const isVideo = isVideoFile(photo.image);
  
  useEffect(() => {
    let isMounted = true;
    
    if (isVideo && photo.image) {
      const url = pb.files.getUrl(photo, photo.image);
      extractVideoThumbnail(url)
        .then((dataUrl) => {
          if (isMounted) setThumb(dataUrl);
        })
        .catch(() => {
          if (isMounted) setThumb('error');
        });
    }
    
    return () => {
      isMounted = false;
    };
  }, [isVideo, photo]);

  const displayDesc = photo.description?.replace(/^\[Date: .*?\]\s*/, '') || '';

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -4 }} 
      className="group cursor-pointer h-full min-w-0"
      onClick={onClick}
    >
      <div className="bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-border/50 h-full flex flex-col min-w-0">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted flex items-center justify-center shrink-0">
          
          {!isVideo ? (
            <img 
              src={pb.files.getUrl(photo, photo.image, { thumb: '600x450' })} 
              alt={photo.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              loading="lazy"
            />
          ) : thumb && thumb !== 'error' ? (
            <img 
              src={thumb} 
              alt={`${photo.title} thumbnail`} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Film className="w-10 h-10 sm:w-12 sm:h-12 opacity-50 shrink-0" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-background/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-lg shrink-0">
              {isVideo ? (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-primary ml-1" />
              ) : (
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              )}
            </div>
          </div>
          
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            {isVideo ? (
              <Badge variant="secondary" className="bg-black/60 text-white border-none shadow-sm backdrop-blur-sm gap-1 sm:gap-1.5 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" /> Video
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-white/80 text-gray-800 border-none shadow-sm backdrop-blur-sm gap-1 sm:gap-1.5 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Photo
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col justify-between bg-card min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1" title={photo.title}>{photo.title}</h3>
          {displayDesc && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed text-pretty">{displayDesc}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const GalleryPage = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [galleryItems, setGalleryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [imageLightboxData, setImageLightboxData] = useState({ isOpen: false, items: [], index: 0 });
  const [videoLightboxItem, setVideoLightboxItem] = useState(null);

  const fetchGallery = async () => {
    try {
      const cats = await pb.collection('photo_categories').getFullList({
        sort: 'name',
        $autoCancel: false
      });
      setCategories(cats);

      const initialExpandedState = {};
      cats.forEach(cat => {
        initialExpandedState[cat.id] = !!cat.default_expanded;
      });
      initialExpandedState['uncategorized'] = true;
      setExpandedCategories(prev => ({ ...initialExpandedState, ...prev }));

      const records = await pb.collection('gallery').getFullList({
        filter: 'is_published=true && archived=false',
        sort: '-created',
        expand: 'category_id',
        $autoCancel: false
      });

      if (isPreviewMode()) {
        setGalleryItems(records);
      } else {
        const filteredRecords = records.filter(item => {
          const title = (item.title || '').toLowerCase();
          const desc = (item.description || '').toLowerCase();
          const isTestEntry = 
            title.includes('demo') || title.includes('test') || title.includes('admin demo') ||
            desc.includes('demo') || desc.includes('test') || desc.includes('admin demo');
          return !isTestEntry;
        });
        setGalleryItems(filteredRecords);
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();

    const subscribe = async () => {
      try {
        await pb.collection('gallery').subscribe('*', () => fetchGallery());
        await pb.collection('photo_categories').subscribe('*', () => fetchGallery());
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

  const groupedMedia = useMemo(() => {
    const groups = categories.map(cat => ({
      ...cat,
      items: galleryItems.filter(p => p.category_id === cat.id)
    })).filter(cat => cat.items.length > 0);

    const uncategorizedItems = galleryItems.filter(p => !p.category_id);
    if (uncategorizedItems.length > 0) {
      groups.push({
        id: 'uncategorized',
        name: 'Other Media',
        items: uncategorizedItems
      });
    }
    
    return groups;
  }, [categories, galleryItems]);

  const handleMediaClick = (item, groupItems) => {
    if (isVideoFile(item.image)) {
      setVideoLightboxItem(item);
    } else {
      const imagesOnly = groupItems.filter(p => !isVideoFile(p.image));
      const startingIndex = imagesOnly.findIndex(p => p.id === item.id);
      
      setImageLightboxData({
        isOpen: true,
        items: imagesOnly,
        index: startingIndex >= 0 ? startingIndex : 0
      });
    }
  };

  const toggleCategory = (groupId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>{t('gallery.title')} - {t('nav.templeName')}</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
            <UnifiedDashboardSidebar />
            <main className="flex-1 flex items-center justify-center min-w-0">
              <div className="text-center p-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-primary text-base sm:text-lg font-medium">{t('gallery.loading')}</p>
              </div>
            </main>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('gallery.title')} - {t('nav.templeName')}</title>
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
          <UnifiedDashboardSidebar />
          
          <main className="flex-1 min-w-0">
            <section className="relative h-[30vh] sm:h-[40vh] min-h-[250px] sm:min-h-[350px] flex items-center justify-center overflow-hidden md:rounded-3xl md:m-4 shrink-0">
              <div className="absolute inset-0">
                <img src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/img20200802184902-yPZVb.jpg" alt="Temple gallery" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-black/80 mix-blend-multiply"></div>
              </div>
              
              {isAdmin && (
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                  <Link 
                    to="/admin/gallery-management" 
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all font-medium text-xs sm:text-sm shadow-lg whitespace-nowrap"
                  >
                    <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
                    Manage Gallery
                  </Link>
                </div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '-0.02em' }}>
                  {t('gallery.title')}
                </h1>
                <p className="text-sm sm:text-lg md:text-xl text-accent/90 font-medium text-pretty">{t('gallery.subtitle')}</p>
              </motion.div>
            </section>

            <section className="py-8 sm:py-12 md:py-20 p-fluid min-w-0">
              <div className="max-w-5xl mx-auto min-w-0">
                {groupedMedia.length === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center py-16 sm:py-20 bg-card rounded-3xl shadow-sm border border-border/50 max-w-2xl mx-auto">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shrink-0">
                      <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2 sm:mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {t('gallery.noPhotos')}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed px-4 sm:px-6 text-pretty">
                      {t('gallery.noPhotosDesc')}
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-8 sm:space-y-12 min-w-0">
                    {groupedMedia.map((group, groupIndex) => (
                      <motion.div 
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
                        className="bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-border/50 min-w-0"
                      >
                        <div 
                          className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 cursor-pointer group/header min-w-0"
                          onClick={() => toggleCategory(group.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-4 min-w-0">
                              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tracking-tight transition-colors group-hover/header:text-primary/80 truncate" style={{ fontFamily: 'Playfair Display, serif' }} title={group.name}>
                                {group.name}
                              </h2>
                              <button className="p-1.5 sm:p-2 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors md:hidden shrink-0">
                                {expandedCategories[group.id] ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />}
                              </button>
                            </div>
                            {group.description && (
                              <p className="text-muted-foreground mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-pretty line-clamp-2">{group.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <Badge variant="secondary" className="bg-secondary text-secondary-foreground border border-border/50 px-2 sm:px-3 py-0.5 sm:py-1 shadow-sm text-xs sm:text-sm whitespace-nowrap">
                              {group.items.length} Items
                            </Badge>
                            <button className="p-1.5 sm:p-2 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors hidden md:block shrink-0">
                              {expandedCategories[group.id] ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />}
                            </button>
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {expandedCategories[group.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden min-w-0"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 pt-6 sm:pt-8 min-w-0">
                                {group.items.map((item) => (
                                  <GalleryMediaItem 
                                    key={item.id} 
                                    photo={item} 
                                    onClick={() => handleMediaClick(item, group.items)}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>

        <Footer />
      </div>

      {imageLightboxData.isOpen && (
        <ImageLightbox 
          items={imageLightboxData.items} 
          initialIndex={imageLightboxData.index} 
          onClose={() => setImageLightboxData({ ...imageLightboxData, isOpen: false })} 
        />
      )}

      {videoLightboxItem && (
        <VideoLightbox 
          item={videoLightboxItem} 
          onClose={() => setVideoLightboxItem(null)} 
        />
      )}
    </>
  );
};

export default GalleryPage;