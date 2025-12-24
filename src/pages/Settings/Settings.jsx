import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Users,
  Database,
  MessageSquare,
  ChevronRight,
  Key,
  Sparkles
} from 'lucide-react';
import { Card, CardBody, Button, Input } from '../../components/ui';
import Header from '../../components/layout/Header';
import WhatsAppTemplates from './WhatsAppTemplates';
import { storeApiKey, clearApiKey, hasApiKey } from '../../lib/cvParser';
import './Settings.css';

const settingSections = [
  {
    id: 'whatsapp',
    icon: MessageSquare,
    title: 'WhatsApp Templates',
    description: 'Manage message templates for candidate communication'
  },
  {
    id: 'ai-parsing',
    icon: Sparkles,
    title: 'AI CV Parsing',
    description: 'Configure Claude API for intelligent CV parsing'
  },
  {
    id: 'profile',
    icon: User,
    title: 'Profile',
    description: 'Manage your personal information and preferences'
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Configure email and in-app notification settings'
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security',
    description: 'Password, two-factor authentication, and sessions'
  },
  {
    id: 'appearance',
    icon: Palette,
    title: 'Appearance',
    description: 'Customize the look and feel of the portal'
  },
  {
    id: 'entities',
    icon: Building2,
    title: 'Entities & Branches',
    description: 'Manage pharmacy entities and branch locations',
    adminOnly: true
  },
  {
    id: 'users',
    icon: Users,
    title: 'User Management',
    description: 'Invite users and manage roles and permissions',
    adminOnly: true
  },
  {
    id: 'data',
    icon: Database,
    title: 'Data & Export',
    description: 'Export data and manage system backups',
    adminOnly: true
  }
];

export default function Settings() {
  const { toggleMobileMenu } = useOutletContext();
  const [activeSection, setActiveSection] = useState('whatsapp');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(hasApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      storeApiKey(apiKey.trim());
      setApiKeyConfigured(true);
      setApiKeySaved(true);
      setApiKey('');
      setTimeout(() => setApiKeySaved(false), 3000);
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyConfigured(false);
    setApiKey('');
  };

  const renderAIParsingSettings = () => (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2>AI CV Parsing</h2>
        <p>Configure Claude API to intelligently extract candidate information from CVs</p>
      </div>

      <Card>
        <CardBody>
          <div className="api-key-section">
            <div className="api-key-status">
              <div className={`api-key-indicator ${apiKeyConfigured ? 'configured' : ''}`}>
                <Key size={20} />
                <span>{apiKeyConfigured ? 'API Key Configured' : 'API Key Not Set'}</span>
              </div>
              {apiKeySaved && (
                <span className="api-key-saved">✓ Saved successfully</span>
              )}
            </div>

            <div className="api-key-info">
              <h4>What does this do?</h4>
              <p>
                When you upload CVs, Claude AI will automatically extract candidate details including 
                name, email, phone number, address, work experience, skills, and qualifications. 
                Without an API key, the system will use basic text parsing which is less accurate.
              </p>
            </div>

            <div className="api-key-form">
              <label>Claude API Key</label>
              <div className="api-key-input-group">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKeyConfigured ? '••••••••••••••••••••' : 'sk-ant-api...'}
                />
                <Button 
                  variant="outline" 
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              </div>
              <span className="api-key-hint">
                Get your API key from{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                  console.anthropic.com
                </a>
              </span>
            </div>

            <div className="api-key-actions">
              <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                Save API Key
              </Button>
              {apiKeyConfigured && (
                <Button variant="outline" onClick={handleClearApiKey}>
                  Remove API Key
                </Button>
              )}
            </div>

            <div className="api-key-note">
              <strong>Note:</strong> Your API key is stored locally in your browser and is never sent to our servers. 
              It is only used to communicate directly with the Claude API.
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'whatsapp':
        return <WhatsAppTemplates />;
      case 'ai-parsing':
        return renderAIParsingSettings();
      default:
        const section = settingSections.find(s => s.id === activeSection);
        const Icon = section?.icon || User;
        return (
          <div className="settings-placeholder">
            <Icon size={48} />
            <h3>{section?.title || 'Settings'}</h3>
            <p>This section will be available in a future update.</p>
          </div>
        );
    }
  };

  return (
    <>
      <Header 
        title="Settings" 
        subtitle="Manage your account and portal preferences"
        onMenuClick={toggleMobileMenu}
      />
      
      <div className="page">
        <div className="settings-layout">
          {/* Sidebar Navigation */}
          <div className="settings-nav">
            {settingSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className={`settings-nav-icon ${section.adminOnly ? 'admin' : ''}`}>
                    <Icon size={18} />
                  </div>
                  <div className="settings-nav-text">
                    <span className="settings-nav-title">
                      {section.title}
                      {section.adminOnly && (
                        <span className="settings-admin-badge">Admin</span>
                      )}
                    </span>
                    <span className="settings-nav-desc">{section.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="settings-content">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </>
  );
}
