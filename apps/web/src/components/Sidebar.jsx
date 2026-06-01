import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { 
  CalendarHeart, 
  Image as ImageIcon, 
  HeartHandshake, 
  MessageSquare, 
  User, 
  Bell, 
  BarChart3,
  Crown,
  LogOut,
  X,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';

const Sidebar = ({ membership_type, isOpen, setIsOpen }) => {
  const { currentUser, logout, isAuthenticated, accountType } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPremium = membership_type === 'premium' || accountType === 'Premium Member';
  const isAdmin = currentUser?.role === 'admin' || accountType === 'Admin';

  const avatarUrl = currentUser?.avatar 
    ? pb.files.getUrl(currentUser, currentUser.avatar) 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || currentUser?.email || 'User')}&background=8B0000&color=fff`;

  const dashboardPath = isAdmin ? '/admin/dashboard' : (isPremium ? '/dashboard/premium-member' : '/dashboard/free-member');

  const menuItems = [
    { path: dashboardPath, label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/poojas', label: 'Book Pooja', icon: CalendarHeart, show: true },
    { path: '/festivals', label: 'Festivals', icon: CalendarHeart, show: true },
    { path: '/gallery', label: 'Gallery', icon: ImageIcon, show: true },
    { path: '/donate', label: 'Make Donation', icon: HeartHandshake, show: true },
    { path: '/user-messages', label: 'Messages', icon: MessageSquare, show: isPremium || isAdmin },
    { path: '/my-profile', label: 'My Profile', icon: User, show: true },
    { path: '/notifications', label: 'Notifications', icon: Bell, show: true },
    { path: '/financial-transparency', label: 'Temple Transparency', icon: BarChart3, show: isPremium || isAdmin },
  ];

  const visibleLinks = menuItems.filter(item => item.show);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "fixed md:sticky top-0 md:top-20 left-0 z-50 h-[100dvh] md:h-[calc(100dvh-5rem)] bg-card text-card-foreground border-r border-border shrink-0 transform transition-transform duration-300 ease-in-out flex flex-col w-[280px] shadow-xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        
        <div className="flex justify-between items-center p-4 md:hidden border-b border-border shrink-0">
          <span className="font-bold text-lg text-primary">Menu</span>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 border-b border-border bg-muted/10 shrink-0">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-background shadow-sm bg-white">
                <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              </div>
              {isPremium && !isAdmin && (
                <div className="absolute -bottom-2 -right-2 bg-accent text-accent-foreground p-1.5 rounded-full shadow-sm border-2 border-background">
                  <Crown className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <h3 className="font-bold text-lg mb-1 truncate w-full px-2 text-foreground">
              {currentUser?.name || currentUser?.email?.split('@')[0]}
            </h3>
            
            <span className={cn(
              "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm truncate max-w-full",
              isAdmin
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : isPremium 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "bg-muted text-muted-foreground border border-border"
            )}>
              {isAdmin ? 'Admin' : (isPremium ? 'Premium Member' : 'Free Member')}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar min-h-0">
          {visibleLinks.map((link) => {
            const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
            const Icon = link.icon;
            
            return (
              <Link
                key={link.path}
                to={link.path}
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
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
                )} />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border bg-muted/10 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;