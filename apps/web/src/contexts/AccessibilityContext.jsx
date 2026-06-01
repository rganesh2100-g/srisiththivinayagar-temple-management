import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';

const AccessibilityContext = createContext(null);

export const AccessibilityProvider = ({ children }) => {
  const [currentFontSize, setCurrentFontSize] = useState(() => {
    return localStorage.getItem('fontSizeScale') || '1.0';
  });

  useEffect(() => {
    // Sync with PocketBase if user is logged in
    if (pb.authStore.isValid && pb.authStore.model?.fontSizePreference) {
      const pref = pb.authStore.model.fontSizePreference;
      if (pref !== currentFontSize) {
        setCurrentFontSize(pref);
        localStorage.setItem('fontSizeScale', pref);
      }
    }
  }, [pb.authStore.isValid, pb.authStore.model?.fontSizePreference]);

  useEffect(() => {
    // Apply the font scale to the document root
    document.documentElement.style.setProperty('--font-scale', currentFontSize);
  }, [currentFontSize]);

  const setFontSize = async (size) => {
    setCurrentFontSize(size);
    localStorage.setItem('fontSizeScale', size);
    document.documentElement.style.setProperty('--font-scale', size);

    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        await pb.collection('users').update(pb.authStore.model.id, {
          fontSizePreference: size
        }, { $autoCancel: false });
      } catch (error) {
        console.error('Failed to update font size preference in PocketBase:', error);
      }
    }
  };

  return (
    <AccessibilityContext.Provider value={{ currentFontSize, setFontSize }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};