import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { LayoutDashboard, User, Activity, Bell, Settings, LogOut, PieChart, Calendar, Ticket, MessageSquare } from 'lucide-react';

const DashboardNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser, isAuthenticated } = useAuth();

  const isPremium = currentUser?.membershipTier === 'premium' || currentUser?.membership_type === 'premium';

  // All requested menu items are explicitly defined here
  const navItems = [
    { path: '/home', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/poojas', label: 'Book Pooja', icon: Calendar },
    { path: '/my-bookings', label: 'My Bookings', icon: Ticket },
    { path: '/activity', label: 'My Activity', icon: Activity },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    ...(isPremium ? [{ path: '/financial-transparency', label: 'Financial Transparency', icon: PieChart }] : []),
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="side-menu-container w-full md:w-64 border-b md:border-b-0 md:border-r border-amber-200 md:min-h-[calc(100vh-8rem)] shrink-0">
      {/* Header is always visible now */}
      <div className="side-menu-header">
        <h2 className="side-menu-title">My Account</h2>
        <p className="side-menu-subtitle">Member Portal</p>
      </div>
      
      {/* Navigation is always a vertical flex column to ensure all items are visible without horizontal scrolling */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`side-menu-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-base truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Footer with Logout is always visible now */}
      <div className="side-menu-footer">
        <button
          onClick={handleLogout}
          className="side-menu-logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardNav;