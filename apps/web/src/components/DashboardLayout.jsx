import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import UnifiedDashboardSidebar from '@/components/UnifiedDashboardSidebar.jsx';
import LanguageSwitcher from '@/components/LanguageSwitcher.jsx';

const DashboardLayout = ({ children, membership_type }) => {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex flex-1 w-full max-w-[100vw] relative">
        <UnifiedDashboardSidebar />
        
        <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          {/* Slim Header */}
          <div className="sticky top-0 z-30 flex items-center justify-end gap-2 px-4 md:px-6 lg:px-8 py-2 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" asChild>
              <Link to="/notifications">
                <Bell className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto w-full space-y-8">
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-border/50 px-4 md:px-6 lg:px-8 py-4">
            <div className="max-w-6xl mx-auto w-full text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Sri Siththi Vinayagar Tempel Kultur Verein e.V. All rights reserved.
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default memo(DashboardLayout);