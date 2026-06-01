import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { LayoutDashboard, CheckCircle, Plus, Archive, FileText, Calendar, MessageSquare, CreditCard, Building, DollarSign, Layers, Wallet, BookOpen, Gift, Bell, Image as Images, User, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const SideMenu = () => {
  const location = useLocation();
  const { currentUser, accountType, isAdmin } = useAuth();

  const effectiveRole = isAdmin ? 'admin' : (accountType || 'free');

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
    <aside className="sidebar w-full md:w-64 shrink-0 flex flex-col bg-card border-b md:border-b-0 md:border-r border-border/50 md:h-[calc(100vh-4rem)] md:sticky md:top-16 z-20 transition-all duration-200">
      <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto p-2 md:p-4 gap-2 md:gap-0 md:space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
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
    </aside>
  );
};

export default SideMenu;