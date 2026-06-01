import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { LayoutDashboard, CheckCircle, Plus, Archive, FileText, Calendar, MessageSquare, CreditCard, Building, DollarSign, Layers, Wallet, BookOpen, Gift, Bell, Image as Images, User, TrendingUp, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const SideMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, accountType, isAdmin, logout } = useAuth();

  const effectiveRole = isAdmin ? 'admin' : (accountType || 'free');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allMenuItems = [
    // Admin Links
    { name: 'Admin Portal', path: '/admin/dashboard', icon: LayoutDashboard, access: ['admin'] },
    { name: 'Pooja Approvals', path: '/admin/pooja-approvals', icon: CheckCircle, access: ['admin'] },
    { name: 'Create Pooja', path: '/admin/poojas/create', icon: Plus, access: ['admin'] },
    { name: 'Pooja Archive', path: '/admin/pooja-archive', icon: Archive, access: ['admin'] },
    { name: 'Donation Approvals', path: '/admin/donation-approvals', icon: FileText, access: ['admin'] },
    { name: 'Festivals', path: '/admin/festivals', icon: Calendar, access: ['admin'] },
    { name: 'Messages', path: '/admin/messages', icon: MessageSquare, access: ['admin'] },
    { name: 'Santha Management', path: '/admin/payments', icon: CreditCard, access: ['admin'] },
    { name: 'Temple Accounts', path: '/admin/temple-accounts', icon: Building, access: ['admin'] },
    { name: 'Account Types', path: '/admin/account-types', icon: Settings, access: ['admin'] },
    { name: 'Expense Manager', path: '/admin/expenses', icon: DollarSign, access: ['admin'] },
    { name: 'Category Master', path: '/admin/categories', icon: Layers, access: ['admin'] },
    { name: 'Payment Account', path: '/admin/payment-accounts', icon: Wallet, access: ['admin'] },
    { name: 'Book Pooja', path: '/poojas', icon: BookOpen, access: ['admin'] },
    { name: 'Make Donation', path: '/donate', icon: Gift, access: ['admin'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, access: ['admin'] },
    { name: 'Gallery', path: '/admin/gallery-management', icon: Images, access: ['admin'] },
    { name: 'My Profile', path: '/my-profile', icon: User, access: ['admin'] },
    { name: 'Temple Transparency', path: '/admin/financial-transparency', icon: TrendingUp, access: ['admin'] },
    
    // User Links
    { name: 'Dashboard', path: '/dashboard/free-member', icon: LayoutDashboard, access: ['free'] },
    { name: 'Dashboard', path: '/dashboard/premium-member', icon: LayoutDashboard, access: ['premium'] },
    { name: 'My Profile', path: '/my-profile', icon: User, access: ['free', 'premium'] },
    { name: 'My Bookings', path: '/my-bookings', icon: BookOpen, access: ['free', 'premium'] },
    { name: 'Messages', path: '/user-messages', icon: MessageSquare, access: ['premium'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, access: ['free', 'premium'] },
    { name: 'Temple Transparency', path: '/financial-transparency', icon: TrendingUp, access: ['premium'] },
  ];

  const visibleItems = allMenuItems.filter(item => item.access.includes(effectiveRole));

  return (
    <aside className="sidebar w-full md:w-64 shrink-0 flex flex-col bg-card border-b md:border-b-0 md:border-r border-border/50 md:h-[100vh] md:sticky md:top-0 z-20 transition-all duration-200">
      {/* Brand Logo & Name - desktop only */}
      <div className="hidden md:block shrink-0">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors">
          <img 
            src="https://horizons-cdn.hostinger.com/5e34f49c-00e8-4e55-9306-3c6d20c04e0a/08e7c3c2747f27a1a96cf9390265a4cf.png" 
            alt="Temple Logo"
            className="h-9 w-9 object-contain shrink-0 rounded-full"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground leading-tight">Sri Siththi Vinayagar</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Tempel Kultur Verein</span>
          </div>
        </Link>
      </div>

      {/* User Info Card - desktop only */}
      <div className="hidden md:block shrink-0 px-4 py-3 border-b border-border/50">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
          <div className="flex flex-col min-w-0 flex-1 gap-1">
            <span className="font-semibold text-sm text-foreground truncate">
              {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              {currentUser?.email}
            </span>
            <span className="inline-block w-fit text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-0.5">
              {isAdmin ? 'Admin' : accountType || 'Free Member'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto p-2 md:p-4 gap-2 md:gap-0 md:space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-[18px] h-[18px] shrink-0 transition-transform duration-200",
                !isActive && "group-hover:scale-110 group-hover:text-primary"
              )} />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button - desktop only */}
      <div className="hidden md:block p-4 border-t border-border/50 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default SideMenu;