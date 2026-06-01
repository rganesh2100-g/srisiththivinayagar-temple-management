import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const ImageLightbox = ({ items, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Zoom and Pan State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const resetZoomAndPan = useCallback(() => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
    setIsDragging(false);
  }, []);

  const nextPhoto = useCallback(() => {
    if (items.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      resetZoomAndPan();
    }
  }, [items.length, resetZoomAndPan]);

  const prevPhoto = useCallback(() => {
    if (items.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      resetZoomAndPan();
    }
  }, [items.length, resetZoomAndPan]);

  const togglePlay = (e) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation();
    setIsFullscreen(!isFullscreen);
  };

  // Zoom Handlers (100% to 300%, increment by 50%)
  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.min(3, prev + 0.5));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomLevel(prev => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) {
        setPanX(0);
        setPanY(0);
      }
      return next;
    });
  };

  // Drag and Pan Handlers
  const handlePointerDown = (e) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    setPanX(e.clientX - dragStart.current.x);
    setPanY(e.clientY - dragStart.current.y);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // Auto-play effect
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        nextPhoto();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, nextPhoto]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, nextPhoto, prevPhoto]);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex];
  const imageUrl = pb.files.getUrl(currentItem, currentItem.image);
  const description = currentItem.description?.replace(/^\[Date: .*?\]\s*/, '') || '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col touch-none"
      >
        {/* TOP BAR: Explicit Flex container to prevent overlapping the image */}
        <div className="flex-none w-full bg-zinc-950 border-b border-white/10 z-[110] shadow-md relative">
          <div className="flex items-center justify-between p-3 sm:p-4 max-w-[100vw] mx-auto">
            
            {/* Left: Counter */}
            <div className="flex-1 flex justify-start">
              <div className="text-white/90 text-sm font-medium tracking-wide bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                {currentIndex + 1} / {items.length}
              </div>
            </div>

            {/* Center: Zoom Controls */}
            <div className="flex-none flex items-center justify-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-lg">
              <button 
                onClick={handleZoomOut} 
                disabled={zoomLevel <= 1}
                className="p-1.5 sm:p-2 rounded-full text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <span className="text-white font-medium text-xs sm:text-sm min-w-[3.5rem] text-center font-mono tracking-wide select-none">
                {Math.round(zoomLevel * 100)}%
              </span>
              
              <button 
                onClick={handleZoomIn} 
                disabled={zoomLevel >= 3}
                className="p-1.5 sm:p-2 rounded-full text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex-1 flex justify-end gap-1 sm:gap-2">
              <button 
                onClick={togglePlay}
                className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/20 border border-white/10 rounded-full transition-all text-white active:scale-95 hidden sm:block"
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button 
                onClick={toggleFullscreen}
                className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/20 border border-white/10 rounded-full transition-all text-white active:scale-95 hidden sm:block"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button 
                onClick={onClose}
                className="p-2 sm:p-2.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-full transition-all text-white active:scale-95 ml-1"
                title="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
          </div>
        </div>

        {/* MAIN IMAGE AREA */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/95">
          
          {items.length > 1 && !isFullscreen && (
            <button 
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-2 md:left-6 p-3 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors z-20 focus-visible:ring-2 ring-white hidden sm:block"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden" 
            onClick={isFullscreen ? toggleFullscreen : undefined}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <img
                  src={imageUrl}
                  alt={currentItem.title || "Gallery Image"}
                  draggable={false}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    pointerEvents: 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    willChange: 'transform'
                  }}
                  className="shadow-2xl rounded-md origin-center"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {items.length > 1 && !isFullscreen && (
            <button 
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-2 md:right-6 p-3 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors z-20 focus-visible:ring-2 ring-white hidden sm:block"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}
        </div>

        {/* BOTTOM INFO AREA */}
        <AnimatePresence>
          {!isFullscreen && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.2 }}
              className="flex-none bg-zinc-950 border-t border-white/10 p-4 sm:p-6 z-[110] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
            >
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {currentItem.title}
                </h2>
                {description && (
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageLightbox;