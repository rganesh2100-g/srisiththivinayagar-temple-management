import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext.jsx';
import UpgradePromptModal from './UpgradePromptModal.jsx';
import { Button } from '@/components/ui/button.jsx';
import { 
  Home, 
  CalendarHeart, 
  Image as ImageIcon, 
  HeartHandshake, 
  MessageSquare, 
  User, 
  Bell, 
  BarChart3,
  Settings,
  Lock,
  X
} from 'lucide-react';

const DynamicSidebar = ({ isOpen, setIsOpen, userType }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { accountType } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const activeType = userType || accountType || 'free';

  const menuItems = {
    free: [
      { name: 'Dashboard', path: '/dashboard/free-member', icon: Home },
      { name: 'Book Pooja', path: '/poojas', icon: CalendarHeart },
      { name: 'Festivals', path: '/festivals', icon: CalendarHeart },
      { name: 'Gallery', path: '/gallery', icon: ImageIcon },
      { name: 'Make Donation', path: '/donate', icon: HeartHandshake },
      { name: 'My Profile', path: '/my-profile', icon: User },
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Temple Transparency', path: '#', icon: BarChart3, locked: true },
    ],
    premium: [
      { name: 'Dashboard', path: '/dashboard/premium-member', icon: Home },
      { name: 'Book Pooja', path: '/poojas', icon: CalendarHeart },
      { name: 'Festivals', path: '/festivals', icon: CalendarHeart },
      { name: 'Gallery', path: '/gallery', icon: ImageIcon },
      { name: 'Make Donation', path: '/donate', icon: HeartHandshake },
      { name: 'Temple Transparency', path: '/financial-transparency', icon: BarChart3 },
      { name: 'Messages', path: '/user-messages', icon: MessageSquare },
      { name: 'My Profile', path: '/my-profile', icon: User },
      { name: 'Notifications', path: '/notifications', icon: Bell },
    ],
    admin: [
      { name: 'Admin Dashboard', path: '/admin/dashboard', icon: Home },
      { name: 'Pooja Approvals', path: '/admin/pooja-approvals', icon: CalendarHeart },
      { name: 'Temple Accounts', path: '/admin/temple-accounts', icon: BarChart3 },
      { name: 'User Management', path: '/admin/users', icon: User },
      { name: 'Settings', path: '/admin/page-management', icon: Settings },
    ]
  };

  const items = menuItems[activeType] || menuItems.free;

  const handleLinkClick = (e, item) => {
    if (item.locked) {
      e.preventDefault();
      setShowUpgradeModal(true);
    } else {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
  };

  return (
    <>
      <UpgradePromptModal 
        isOpen={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />

      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-[100dvh] w-[280px] md:w-64 bg-card border-r border-border/50 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col shadow-xl md:shadow-none shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-primary/5 shrink-0">
          <h2 className="text-xl font-bold font-heading text-primary truncate">
            {activeType === 'admin' ? 'Admin Portal' : 
             activeType === 'premium' ? 'Premium Access' : 'Community Portal'}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="md:hidden text-muted-foreground hover:bg-muted shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar min-h-0">
          {items.map((item, idx) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={idx}
                to={item.path}
                onClick={(e) => handleLinkClick(e, item)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                  item.locked && "opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary-foreground" : "text-primary/70")} />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.locked && <Lock className="w-4 h-4 text-accent shrink-0 ml-2" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 shrink-0">
          <div className="bg-primary/5 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Membership Status</p>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                activeType === 'premium' ? "bg-accent" : 
                activeType === 'admin' ? "bg-emerald-500" : "bg-muted-foreground"
              )} />
              <span className="text-sm font-semibold capitalize text-foreground truncate">{activeType}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DynamicSidebar;