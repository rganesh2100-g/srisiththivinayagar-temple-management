import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut, Image as ImageIcon } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { cn } from '@/lib/utils';

const FestivalModal = ({ festival, isOpen, onClose }) => {
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

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      resetZoomAndPan();
    }
  }, [isOpen, resetZoomAndPan]);

  if (!festival) return null;

  const imageUrl = festival.image ? pb.files.getUrl(festival, festival.image) : null;

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
        // Reset pan when zoomed fully out
        setPanX(0);
        setPanY(0);
      }
      return next;
    });
  };

  // Wheel Zoom Support
  const handleWheel = (e) => {
    // Only handle zoom if we are interacting with the modal content
    if (e.deltaY < 0) {
      handleZoomIn(e);
    } else if (e.deltaY > 0) {
      handleZoomOut(e);
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-none w-screen h-[100dvh] flex flex-col p-0 !bg-black/95 !border-none !shadow-none [&>button]:hidden outline-none overflow-hidden"
        onWheel={handleWheel}
      >
        <DialogTitle className="sr-only">{festival.name}</DialogTitle>
        <DialogDescription className="sr-only">Festival Image View</DialogDescription>
        
        {/* TOP BAR: Explicit Flex container to prevent overlapping the image */}
        <div className="flex-none w-full bg-zinc-950/90 backdrop-blur-md border-b border-white/10 z-[110] relative shadow-md">
          <div className="flex items-center justify-between p-3 sm:p-4 max-w-[100vw] mx-auto">
            
            {/* Left: Title */}
            <div className="flex-1 flex justify-start">
              <h2 className="text-white/90 text-sm md:text-base font-medium tracking-wide truncate pr-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                {festival.name}
              </h2>
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
            <div className="flex-1 flex justify-end">
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
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-transparent touch-none">
          <AnimatePresence mode="wait">
            {imageUrl ? (
              <motion.div
                key="image-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <img
                  src={imageUrl}
                  alt={festival.name}
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
                  className="shadow-2xl rounded-none origin-center"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="fallback-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-slate-400"
              >
                <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-40" />
                <span className="text-xs sm:text-sm font-medium tracking-wider uppercase opacity-70">
                  No Image Available
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FestivalModal;