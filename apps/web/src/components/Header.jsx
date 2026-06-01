import React, { useState, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess.js';
import { Button } from '@/components/ui/button.jsx';
import { Menu, X, User, LogOut, Bell, Shield } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import pb from '@/lib/pocketbaseClient.js';

const Header = ({ onSidebarToggle }) => {
  const { t } = useTranslation();
  const { currentUser, logout, accountType } = useAuth();
  const { subscription } = useSubscriptionAccess(currentUser?.id);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const getDashboardPath = () => {
    if (currentUser?.role === 'admin' || accountType === 'Admin' || accountType === 'admin') return '/admin/dashboard';
    if (accountType === 'Premium Member' || accountType === 'premium') return '/dashboard/premium-member';
    return '/dashboard/free-member';
  };

  const navLinks = [
    { name: t('header.home', 'Home'), path: '/' },
    { name: t('header.about', 'About'), path: '/about' },
    { name: t('header.poojas', 'Poojas'), path: '/poojas' },
    { name: t('header.festivals', 'Festivals'), path: '/festivals' },
    { name: t('header.gallery', 'Gallery'), path: '/gallery' },
  ];

  if (currentUser) {
    navLinks.push({ name: t('header.dashboard', 'Dashboard'), path: getDashboardPath() });
  }

  const hasAccess = !!subscription || accountType === 'Admin' || currentUser?.role === 'admin';
  if (currentUser && hasAccess) {
    navLinks.push({ name: t('header.financialTransparency', 'Financial Transparency'), path: '/financial-transparency' });
  }

  const adminLinks = [
    { name: t('header.dashboard', 'Dashboard'), path: '/admin/dashboard' },
    { name: t('admin.poojaCreate', 'Create Pooja'), path: '/admin/poojas/create' },
    { name: t('admin.poojaApprovals', 'Pooja Approvals'), path: '/admin/pooja-approvals' },
    { name: t('admin.poojaArchive', 'Pooja Archive'), path: '/admin/pooja-archive' },
  ];

  return (
    <header className="sticky top-0 z-[60] w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm min-h-[var(--header-height)] flex flex-col justify-center">
      <div className="flex flex-col w-full">
        
        <div className="flex flex-col items-center justify-center pt-2 pb-1 px-4 text-center">
          <Link to="/" className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 hover:opacity-90 transition-opacity">
            <img 
              src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/08e7c3c2747f27a1a96cf9390265a4cf.png" 
              alt="Sri Siththi Vinayagar Tempel Kultur Verein e.V Logo"
              className="h-12 sm:h-16 md:h-20 w-auto object-contain shrink-0"
              loading="lazy"
            />
            <span className="font-serif font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl text-primary leading-tight">
              {t('header.templeName', 'Sri Siththi Vinayagar Tempel Kultur Verein e.V')}
            </span>
          </Link>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 border-t border-border/40">
          <div className="flex h-14 items-center justify-between">
            
            {onSidebarToggle && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onSidebarToggle} 
                className="md:hidden mr-2 text-primary hover:bg-primary/10 touch-target"
                aria-label="Toggle Dashboard Menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}

            <nav className="hidden md:flex items-center gap-4 lg:gap-6 flex-wrap">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap min-h-[44px] flex items-center ${
                    isActive(link.path) ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              {currentUser?.role === 'admin' && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1 outline-none whitespace-nowrap min-h-[44px]">
                    <Shield className="w-4 h-4" /> {t('header.admin', 'Admin')}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {adminLinks.map(link => (
                      <DropdownMenuItem key={link.path} asChild className="min-h-[44px]">
                        <Link to={link.path}>{link.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            <div className="md:hidden flex-1"></div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden md:flex items-center gap-2">
                <LanguageSwitcher />
                
                {currentUser ? (
                  <div className="flex items-center gap-2 ml-2">
                    <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary touch-target">
                      <Link to="/notifications"><Bell className="w-5 h-5" /></Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full touch-target">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={currentUser.avatar ? pb.files.getUrl(currentUser, currentUser.avatar) : ''} alt={currentUser.name} />
                            <AvatarFallback className="bg-primary/10 text-primary">{currentUser.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{currentUser.email}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="min-h-[44px]">
                          <Link to="/my-profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" /> {t('header.myProfile', 'My Profile')}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer min-h-[44px]">
                          <LogOut className="mr-2 h-4 w-4" /> {t('header.logout', 'Logout')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 ml-2">
                    <Button variant="ghost" asChild className="text-foreground hover:text-primary whitespace-nowrap px-4 min-h-[44px]">
                      <Link to="/login">{t('header.login', 'Login')}</Link>
                    </Button>
                    <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap px-4 min-h-[44px]">
                      <Link to="/signup">{t('header.signup', 'Sign Up')}</Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="md:hidden flex items-center gap-1">
                <LanguageSwitcher />
                {!onSidebarToggle && (
                  <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="touch-target">
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {isMobileMenuOpen && !onSidebarToggle && (
        <div className="md:hidden bg-background border-b border-border shadow-lg absolute top-full left-0 w-full z-[55] max-h-[calc(100vh-var(--header-height))] overflow-y-auto">
          <div className="space-y-1 px-4 pb-6 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block rounded-md px-3 py-3 text-base font-medium min-h-[44px] flex items-center ${
                  isActive(link.path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            {currentUser?.role === 'admin' && (
              <div className="pt-2 pb-1">
                <div className="px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wider">Admin</div>
                {adminLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="block rounded-md px-3 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px] flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
            
            <div className="border-t border-border mt-4 pt-4">
              {currentUser ? (
                <div className="space-y-1">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground truncate">{currentUser.email}</p>
                  </div>
                  <Link to="/my-profile" className="block rounded-md px-3 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px] flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                    {t('header.myProfile', 'My Profile')}
                  </Link>
                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="block w-full text-left rounded-md px-3 py-3 text-base font-medium text-destructive hover:bg-destructive/10 min-h-[44px] flex items-center">
                    {t('header.logout', 'Logout')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 px-3 mt-2">
                  <Button variant="outline" asChild className="w-full justify-center min-h-[44px]" onClick={() => setIsMobileMenuOpen(false)}>
                    <Link to="/login">{t('header.login', 'Login')}</Link>
                  </Button>
                  <Button asChild className="w-full justify-center bg-primary text-primary-foreground min-h-[44px]" onClick={() => setIsMobileMenuOpen(false)}>
                    <Link to="/signup">{t('header.signup', 'Sign Up')}</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default memo(Header);