import React from 'react';
import { usePWAInstall, INSTALL_STATE } from '../hooks/usePWA';
import './InstallPrompt.css';

// Icons
const Icons = {
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Smartphone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  )
};

export default function InstallPrompt() {
  const { installState, canInstall, install, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      // Track installation
      console.log('PWA installed successfully');
    }
  };

  return (
    <div className="install-prompt">
      <div className="install-content">
        <div className="install-icon">
          <Icons.Smartphone />
        </div>
        <div className="install-text">
          <h3>Install Allied HR</h3>
          <p>Add to your home screen for quick access</p>
        </div>
      </div>
      <div className="install-actions">
        <button 
          className="install-btn primary"
          onClick={handleInstall}
          disabled={installState === INSTALL_STATE.INSTALLING}
        >
          <Icons.Download />
          {installState === INSTALL_STATE.INSTALLING ? 'Installing...' : 'Install'}
        </button>
        <button className="install-btn dismiss" onClick={dismiss}>
          <Icons.X />
        </button>
      </div>
    </div>
  );
}
