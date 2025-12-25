import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </header>

      <section className="settings-section">
        <h2>Account</h2>
        <div className="setting-item">
          <label>Name</label>
          <span>{user?.displayName || 'Not set'}</span>
        </div>
        <div className="setting-item">
          <label>Email</label>
          <span>{user?.email}</span>
        </div>
        <div className="setting-item">
          <label>Role</label>
          <span className="role-badge">{user?.role?.replace('_', ' ')}</span>
        </div>
      </section>

      <section className="settings-section">
        <h2>Organization</h2>
        <div className="setting-item">
          <label>Entity</label>
          <span>{user?.entityName || 'All Entities'}</span>
        </div>
        <div className="setting-item">
          <label>Branch</label>
          <span>{user?.branchName || 'All Branches'}</span>
        </div>
      </section>

      <section className="settings-section">
        <h2>App Version</h2>
        <p className="version-info">Allied Recruitment Portal v1.0.0</p>
        <p className="version-info">© 2024 Allied Pharmacies</p>
      </section>
    </div>
  );
}
