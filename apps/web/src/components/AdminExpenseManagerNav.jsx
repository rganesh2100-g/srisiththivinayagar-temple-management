import React from 'react';
import { NavLink } from 'react-router-dom';
import { Receipt, List, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ALLOWED_EMAILS = ['geeemmtechnology@gmail.com', 'apuurnan@gmail.com'];

const AdminExpenseManagerNav = () => {
  const { currentUser } = useAuth();
  
  if (!currentUser || !ALLOWED_EMAILS.includes(currentUser.email)) {
    return null;
  }

  return (
    <div className="space-y-1 mt-6">
      <h3 className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
        <Calculator className="w-3.5 h-3.5" />
        Expense Manager
      </h3>
      <NavLink
        to="/admin/expense-manager"
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`
        }
      >
        <Receipt className="w-4 h-4 shrink-0" />
        Daily Expense Entry
      </NavLink>
      <NavLink
        to="/admin/category-master"
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`
        }
      >
        <List className="w-4 h-4 shrink-0" />
        Category Master
      </NavLink>
    </div>
  );
};

export default AdminExpenseManagerNav;