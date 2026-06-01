import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const VideoLightbox = ({ item, onClose }) => {
  // Handle keyboard events (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  if (!item) return null;

  const videoUrl = pb.files.getUrl(item, item.image);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col"
        onClick={onClose}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 text-white/80 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex-1 flex flex-col">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              {item.title}
            </h2>
            {item.description && (
              <p className="text-sm text-gray-300 mt-1 max-w-2xl line-clamp-1">
                {item.description.replace(/^\[Date: .*?\]\s*/, '')}
              </p>
            )}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 ml-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0"
            title="Close (Esc)"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4 md:px-12 pt-24 pb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()} // Prevent clicks on video from closing modal
          >
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[80vh] object-contain"
            >
              Your browser does not support the video tag.
            </video>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoLightbox;