/**
 * Environment utility functions
 */

/**
 * Detects if the application is running in a preview/development environment
 * Checks hostname for 'horizons' or 'preview', or uses VITE_PREVIEW_MODE env var.
 * 
 * @returns {boolean} True if in preview mode, false if on live production site
 */
export const isPreviewMode = () => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname.toLowerCase();
  const isPreviewHost = hostname.includes('horizons') || hostname.includes('preview') || hostname.includes('localhost');
  const isEnvPreview = import.meta.env.VITE_PREVIEW_MODE === 'true';
  
  return isPreviewHost || isEnvPreview;
};