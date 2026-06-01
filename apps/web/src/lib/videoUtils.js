/**
 * Extracts a thumbnail (first frame at ~1s) from a given video URL using a Canvas.
 * @param {string} videoUrl - The URL of the video file.
 * @returns {Promise<string>} - A promise that resolves with the data URL (base64) of the thumbnail image.
 */
export const extractVideoThumbnail = (videoUrl) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.style.display = 'none';
    // Essential for cross-origin requests, though PocketBase usually serves on same domain/allowed CORS
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    let timeoutId = setTimeout(() => {
      reject(new Error('Video thumbnail extraction timeout'));
      video.remove();
    }, 8000); // 8 second timeout

    video.addEventListener('loadeddata', () => {
      // Seek to 1 second, or 0 if the video is very short
      if (video.duration >= 1) {
        video.currentTime = 1;
      } else {
        video.currentTime = 0;
      }
    });

    video.addEventListener('seeked', () => {
      try {
        clearTimeout(timeoutId);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        video.remove();
      }
    });

    video.addEventListener('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
      video.remove();
    });
  });
};