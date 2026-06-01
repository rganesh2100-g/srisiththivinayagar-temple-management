import React, { useState, memo } from 'react';
import Header from '@/components/Header.jsx';
import UnifiedDashboardSidebar from '@/components/UnifiedDashboardSidebar.jsx';
import Footer from '@/components/Footer.jsx';

const DashboardLayout = ({ children, membership_type }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Header onSidebarToggle={toggleSidebar} />
      
      <div className="flex flex-1 w-full max-w-[100vw] relative">
        <UnifiedDashboardSidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
        />
        
        <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 lg:p-8 transition-all duration-300">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {children}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default memo(DashboardLayout);