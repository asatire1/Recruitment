import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { OfflineIndicator } from '../common';
import './Layout.css';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'layout-sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="layout-mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
      />
      
      <main className="layout-main">
        <Outlet context={{ toggleMobileMenu }} />
      </main>
      
      {/* Offline indicator - shows when disconnected */}
      <OfflineIndicator />
    </div>
  );
}
