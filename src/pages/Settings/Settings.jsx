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
  Sparkles,
  Calendar,
  CheckCircle,
  Cloud
} from 'lucide-react';
import { Card, CardBody, Button, Input } from '../../components/ui';
import Header from '../../components/layout/Header';
import WhatsAppTemplates from './WhatsAppTemplates';
import BookingAvailability from './BookingAvailability';
import './Settings.css';
import './BookingAvailability.css';

const settingSections = [
  {
    id: 'whatsapp',
    icon: MessageSquare,
    title: 'WhatsApp Templates',
    description: 'Manage message templates for candidate communication'
  },
  {
    id: 'booking',
    icon: Calendar,
    title: 'Booking Availability',
    description: 'Set available times for interviews and trial shifts'
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

  const renderAIParsingSettings = () => (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2>AI CV Parsing</h2>
        <p>Intelligent candidate information extraction powered by Claude AI</p>
      </div>

      <Card>
        <CardBody>
          <div className="api-key-section">
            <div className="api-key-status">
              <div className="api-key-indicator configured">
                <CheckCircle size={20} />
                <span>AI Parsing Enabled</span>
              </div>
            </div>

            <div className="api-key-info">
              <div className="secure-badge">
                <Cloud size={16} />
                <span>Secure Server-Side Processing</span>
              </div>
              
              <h4>How it works</h4>
              <p>
                When you upload CVs, Claude AI automatically extracts candidate details including 
                name, email, phone number, address, work experience, skills, and qualifications.
              </p>
              
              <h4>Security</h4>
              <p>
                AI parsing is handled securely on our servers. No API keys are stored in your browser,
                and all CV data is processed through encrypted connections.
              </p>
            </div>

            <div className="ai-features">
              <h4>Extracted Information</h4>
              <ul>
                <li>✓ Name and contact details</li>
                <li>✓ Email and phone number</li>
                <li>✓ Address and postcode</li>
                <li>✓ Work experience summary</li>
                <li>✓ Skills and qualifications</li>
                <li>✓ Pharmacy/healthcare experience detection</li>
                <li>✓ Right to work status (if mentioned)</li>
              </ul>
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
      case 'booking':
        return <BookingAvailability />;
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
