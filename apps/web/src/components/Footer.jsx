import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess.js';
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Clock, HeartHandshake } from 'lucide-react';

const Footer = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { hasAccess } = useSubscriptionAccess(currentUser);

  return (
    <footer className="bg-[#FDF8F0] text-[#000000] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/fe1754409466f2095ee1c609007711a1.png"
                alt="Sri Siththi Vinayagar Tempel Kultur Verein e.V Logo"
                className="h-14 md:h-20 w-auto object-contain drop-shadow-sm shrink-0"
                loading="lazy"
              />
              <span className="text-lg font-bold text-[#000000] leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('nav.templeName')}
              </span>
            </div>
            <p className="text-[#444444] text-sm leading-relaxed">
              {t('footer.desc')}
            </p>
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#CC2222] mt-1 flex-shrink-0" />
                <div className="text-sm text-[#444444] font-medium space-y-1">
                  <a href="tel:017634629124" className="block hover:text-[#CC2222] py-1">017634629124</a>
                  <a href="tel:091143958608" className="block hover:text-[#CC2222] py-1">0911 43958608</a>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#CC2222] flex-shrink-0" />
                <a href="mailto:info@nssvinayagar.com" className="text-sm text-[#444444] font-medium hover:text-[#CC2222] py-1 block">info@nssvinayagar.com</a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-[#000000] mb-4 relative inline-block">
              {t('footer.services')}
              <span className="absolute -bottom-1.5 left-0 w-1/2 h-0.5 bg-[#CC2222]"></span>
            </h3>
            <div className="flex flex-col space-y-1">
              <Link to="/poojas" className="py-2 text-sm text-[#444444] hover:text-[#CC2222] font-medium transition-colors duration-200">
                {t('nav.poojaSchedule')}
              </Link>
              <Link to="/poojas" className="py-2 text-sm text-[#444444] hover:text-[#CC2222] font-medium transition-colors duration-200">
                {t('nav.bookPooja')}
              </Link>
              <Link to="/donate" className="py-2 flex items-center gap-1.5 text-sm text-[#8B0000] hover:text-[#CC2222] font-bold transition-colors duration-200">
                <HeartHandshake className="w-4 h-4" /> {t('footer.makeDonation')}
              </Link>
              <Link to="/membership" className="py-2 text-sm text-[#444444] hover:text-[#CC2222] font-medium transition-colors duration-200">
                {t('nav.membership')}
              </Link>
              <Link to="/gallery" className="py-2 text-sm text-[#444444] hover:text-[#CC2222] font-medium transition-colors duration-200">
                {t('nav.gallery')}
              </Link>
              <Link to="/about" className="py-2 text-sm text-[#444444] hover:text-[#CC2222] font-medium transition-colors duration-200">
                {t('nav.about')}
              </Link>
              {currentUser && hasAccess && (
                <Link to="/financial-transparency" className="py-2 text-sm text-[#444444] hover:text-[#CC2222] font-medium transition-colors duration-200">
                  {t('footer.financialTransparency')}
                </Link>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-[#000000] mb-4 relative inline-block">
              {t('footer.openingHours')}
              <span className="absolute -bottom-1.5 left-0 w-1/2 h-0.5 bg-[#CC2222]"></span>
            </h3>
            <div className="flex items-start gap-2.5 py-2">
              <Clock className="w-4 h-4 text-[#CC2222] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#444444]">
                <p className="font-bold text-[#000000]">Daily</p>
                <p>17:30 - 20:00</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-[#000000] mb-4 relative inline-block">
              {t('footer.location')}
              <span className="absolute -bottom-1.5 left-0 w-1/2 h-0.5 bg-[#CC2222]"></span>
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-2.5 py-2">
                <MapPin className="w-4 h-4 text-[#CC2222] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#444444] font-medium leading-relaxed">
                  {t('footer.address')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-bold text-[#000000] mb-3">{t('footer.followUs')}</p>
                <div className="flex items-center gap-4">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#444444] hover:text-white hover:bg-[#CC2222] hover:border-[#CC2222] transition-all duration-300 shadow-sm touch-target">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#444444] hover:text-white hover:bg-[#CC2222] hover:border-[#CC2222] transition-all duration-300 shadow-sm touch-target">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#444444] hover:text-white hover:bg-[#CC2222] hover:border-[#CC2222] transition-all duration-300 shadow-sm touch-target">
                    <Youtube className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#444444] font-medium text-center sm:text-left">
            © 2025 GEE EMM Technology. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-[#444444]">
            <Link to="#" className="hover:text-[#CC2222] py-2">Privacy Policy</Link>
            <Link to="#" className="hover:text-[#CC2222] py-2">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default memo(Footer);