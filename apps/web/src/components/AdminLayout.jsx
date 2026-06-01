import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import LanguageSwitcher from '@/components/LanguageSwitcher.jsx';
import SideMenu from './SideMenu.jsx';

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full relative">
        <SideMenu />
        <main className="flex-1 flex flex-col min-w-0 print-container">
          {/* Slim Header */}
          <div className="sticky top-0 z-30 flex items-center justify-end gap-2 px-4 sm:px-6 md:px-8 py-2 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" asChild>
              <Link to="/notifications">
                <Bell className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full">
            {children}
          </div>

          {/* Footer */}
          <footer className="border-t border-border/50 px-4 sm:px-6 md:px-8 py-4">
            <div className="max-w-6xl mx-auto w-full text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Sri Siththi Vinayagar Tempel Kultur Verein e.V. All rights reserved.
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;