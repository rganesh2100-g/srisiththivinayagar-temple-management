import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { 
  LayoutDashboard, 
  User, 
  Calendar, 
  BookOpen, 
  CalendarHeart, 
  Image as ImageIcon, 
  HeartHandshake, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Shield, 
  Users, 
  PlusCircle, 
  CheckSquare, 
  Archive, 
  CreditCard, 
  Landmark, 
  Banknote, 
  WrapText as ReceiptText, 
  Tags, 
  CalendarRange, 
  Image as Images, 
  MessageSquare, 
  FileBarChart, 
  Settings2,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils.js';

const UnifiedDashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAuthenticated, accountType, isAdmin, currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isUserAdmin = isAdmin || currentUser?.role === 'admin' || accountType === 'Admin';
  const dashboardPath = isUserAdmin ? '/admin/dashboard' : (accountType === 'Premium Member' ? '/dashboard/premium-member' : '/dashboard/free-member');

  const menuItems = [
    { name: 'Dashboard', path: dashboardPath, icon: LayoutDashboard },
    { name: 'Profile Settings', path: '/my-profile', icon: User },
    { name: 'My Bookings', path: '/my-bookings', icon: Calendar },
    { name: 'Santha History', path: '/dashboard/santha-history', icon: History },
    { name: 'Book Pooja', path: '/poojas', icon: BookOpen },
    { name: 'Festivals', path: '/festivals', icon: CalendarHeart },
    { name: 'Gallery', path: '/gallery', icon: ImageIcon },
    { name: 'Make Donation', path: '/donate', icon: HeartHandshake },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const adminMenuItems = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: Shield },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Pooja Create', path: '/admin/poojas/create', icon: PlusCircle },
    { name: 'Pooja Approvals', path: '/admin/pooja-approvals', icon: CheckSquare },
    { name: 'Pooja Archive', path: '/admin/pooja-archive', icon: Archive },
    { name: 'Donation Approvals', path: '/admin/donation-approvals', icon: HeartHandshake },
    { name: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
    { name: 'Temple Accounts', path: '/admin/temple-accounts', icon: Landmark },
    { name: 'Payment Accounts', path: '/admin/temple-payment-accounts', icon: Banknote },
    { name: 'Expense Manager', path: '/admin/expenses', icon: ReceiptText },
    { name: 'Category Master', path: '/admin/categories', icon: Tags },
    { name: 'Festival Manager', path: '/admin/festivals', icon: CalendarRange },
    { name: 'Gallery Management', path: '/admin/gallery-management', icon: Images },
    { name: 'Admin Messages', path: '/admin/messages', icon: MessageSquare },
    { name: 'Monthly Reports', path: '/admin/reports', icon: FileBarChart },
    { name: 'Account Types', path: '/admin/account-types', icon: Settings2 },
  ];

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="md:hidden w-full bg-card border-b border-border/50 p-3 flex items-center justify-between sticky top-16 z-30 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
          <LayoutDashboard className="w-4 h-4 text-primary" /> Dashboard Navigation
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-[280px] md:w-64 bg-card border-r border-border/50 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 md:hidden shrink-0">
          <span className="font-bold text-primary">Menu</span>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Brand Logo & Name */}
        <div className="shrink-0">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
          >
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

        {/* User Info Card */}
        <div className="shrink-0 px-4 py-3 border-b border-border/50">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <span className="font-semibold text-sm text-foreground truncate">
                {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {currentUser?.email}
              </span>
              <span className="inline-block w-fit text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-0.5">
                {isUserAdmin ? 'Admin' : accountType || 'Free Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 custom-scrollbar min-h-0">
          <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operations
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === dashboardPath 
              ? location.pathname === item.path 
              : location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110 group-hover:text-primary"
                )} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          {isUserAdmin && (
            <>
              <div className="mt-8 mb-2 px-3 text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Admin Panel
              </div>
              <div className="space-y-1">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.path === '/admin/dashboard'
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                        isActive 
                          ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 shrink-0 transition-transform duration-200",
                        !isActive && "group-hover:scale-110 group-hover:text-primary",
                        isActive && "text-primary"
                      )} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-border/50 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UnifiedDashboardSidebar;
