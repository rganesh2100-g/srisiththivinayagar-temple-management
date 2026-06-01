import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage.jsx';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const languages = [
  { code: 'ta', name: 'தமிழ்', short: 'TA' },
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'de', name: 'Deutsch', short: 'DE' }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { setLanguage } = useLanguage();
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[1];

  const handleLanguageChange = (langCode) => {
    if (i18n.language === langCode) return;
    setLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 px-2 text-muted-foreground hover:text-primary">
          <motion.div whileHover={{ rotate: 15 }} transition={{ duration: 0.2 }}>
            <Globe className="w-4 h-4" />
          </motion.div>
          <span className="hidden md:inline-block font-medium">{currentLang.name}</span>
          <span className="hidden sm:inline-block md:hidden font-medium">{currentLang.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code} 
            onSelect={() => handleLanguageChange(lang.code)}
            className={`cursor-pointer flex items-center justify-between ${i18n.language === lang.code ? 'bg-primary/10 text-primary font-medium' : ''}`}
          >
            <span>{lang.name}</span>
            <span className="text-xs text-muted-foreground">{lang.short}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;