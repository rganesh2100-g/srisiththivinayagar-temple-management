import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  FileText, 
  Image as ImageIcon,
  MessageSquare,
  Banknote,
  Calendar,
  LockKeyhole
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'User Directory', icon: Users },
  { path: '/admin/user-account-assignment', label: 'Account Assignment', icon: LockKeyhole },
  { path: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/admin/donation-approvals', label: 'Donations', icon: Banknote },
  { path: '/admin/pooja-approvals', label: 'Pooja Approvals', icon: FileText },
  { path: '/admin/festivals', label: 'Festivals', icon: Calendar },
  { path: '/admin/gallery-management', label: 'Gallery', icon: ImageIcon },
  { path: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { path: '/admin/page-management', label: 'Page Access Rules', icon: Settings },
];

const AdminNav = () => {
  return (
    <nav className="space-y-1 p-4">
      <div className="mb-6 px-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Admin Portal
        </h2>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default AdminNav;