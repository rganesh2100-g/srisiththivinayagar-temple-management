import React, { useEffect } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import SideMenu from './SideMenu.jsx';

const AdminLayout = ({ children }) => {
  useEffect(() => {
    // Debug log to ensure the layout is mounting properly
    console.log('AdminLayout rendered with SideMenu component in the layout tree.');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full relative">
        <SideMenu />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto print-container w-full min-w-0">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLayout;