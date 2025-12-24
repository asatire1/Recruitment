import { Search, Bell, Menu } from 'lucide-react';
import './Header.css';

export default function Header({ title, subtitle, onMenuClick, actions }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={18} className="header-search-icon" />
          <input
            type="search"
            placeholder="Search..."
            className="header-search-input"
          />
          <kbd className="header-search-kbd">⌘K</kbd>
        </div>

        <button className="header-notification-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="header-notification-badge">3</span>
        </button>

        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </header>
  );
}
