import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ERROR_MESSAGES, ERROR_TYPES } from '@/constants/ErrorConstants.js';

const ErrorContext = createContext(null);

export const useErrorTracking = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorTracking must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [errorLog, setErrorLog] = useState([]);

  const logError = useCallback((error, context = '') => {
    const errorEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context
    };
    
    setErrorLog(prev => [errorEntry, ...prev].slice(0, 50)); // Keep last 50
    console.error(`[GlobalErrorTracker] ${context}:`, error);
  }, []);

  const handleError = useCallback((error, context = '', showToast = true) => {
    logError(error, context);
    
    if (showToast) {
      let message = ERROR_MESSAGES.DEFAULT;
      
      if (!navigator.onLine) message = ERROR_MESSAGES.NETWORK_OFFLINE;
      else if (error.status === 403) message = ERROR_MESSAGES.UNAUTHORIZED;
      else if (error.status === 404) message = ERROR_MESSAGES.NOT_FOUND;
      else if (error.status >= 500) message = ERROR_MESSAGES.SERVER_ERROR;
      else if (error.message) message = error.message;

      toast.error(message, {
        description: context ? `Context: ${context}` : undefined,
        action: {
          label: 'Dismiss',
          onClick: () => {}
        }
      });
    }
  }, [logError]);

  // Catch unhandled promise rejections globally
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      logError(event.reason, 'Unhandled Promise Rejection');
      // Don't toast every unhandled rejection to avoid spam, just log
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [logError]);

  return (
    <ErrorContext.Provider value={{ errorLog, handleError, logError }}>
      {children}
    </ErrorContext.Provider>
  );
};