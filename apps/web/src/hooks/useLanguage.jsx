import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n, t: i18nT } = useTranslation();
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('fontSize') || '16px';
  });

  const currentLanguage = i18n.language || 'en';

  // Only sync FROM PocketBase on initial load or when the user logs in/out.
  // Removing `currentLanguage` from dependencies prevents the 2-click bug where 
  // the effect would revert the language before the async PB update finished.
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model?.preferred_language) {
      const pbLang = pb.authStore.model.preferred_language.toLowerCase();
      let mappedLang = 'ta';
      if (pbLang.includes('english') || pbLang === 'en') mappedLang = 'en';
      if (pbLang.includes('deutsch') || pbLang === 'de') mappedLang = 'de';
      
      if (i18n.language !== mappedLang) {
        i18n.changeLanguage(mappedLang);
        localStorage.setItem('language', mappedLang);
      }
    }
  }, [pb.authStore.isValid, pb.authStore.model?.id]);

  const setLanguage = async (lang) => {
    // 1. Update local state synchronously for immediate UI response
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);

    // 2. Update backend asynchronously without blocking the UI
    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        let pbLangValue = 'Tamil';
        if (lang === 'en') pbLangValue = 'English';
        if (lang === 'de') pbLangValue = 'Deutsch';

        // Optimistically update the local auth store model to prevent sync issues
        pb.authStore.model.preferred_language = pbLangValue;

        await pb.collection('users').update(pb.authStore.model.id, {
          preferred_language: pbLangValue
        }, { $autoCancel: false });
      } catch (error) {
        console.error('Failed to update preferred language in PocketBase:', error);
      }
    }
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.style.fontSize = size;
  };

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize;
  }, [fontSize]);

  // Bridge for older components not yet using useTranslation directly
  const t = (key) => {
    return i18nT(key);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, fontSize, changeFontSize }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};