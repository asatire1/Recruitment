import React from 'react';
import { Outlet } from 'react-router-dom';
import { useServiceWorker } from '../hooks/usePWA';
import InstallPrompt from '../components/InstallPrompt';
import './ManagerLayout.css';

export default function ManagerLayout() {
  const { updateAvailable, update } = useServiceWorker();

  return (
    <div className="manager-layout">
      {updateAvailable && (
        <div className="update-banner">
          <span>New version available</span>
          <button onClick={update}>Update now</button>
        </div>
      )}
      <main className="manager-content">
        <Outlet />
      </main>
      <InstallPrompt />
    </div>
  );
}
