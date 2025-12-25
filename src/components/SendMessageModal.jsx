import React, { useState, useEffect, useMemo } from 'react';
import {
  useWhatsAppTemplates,
  useWhatsAppTemplateActions,
  TEMPLATE_CATEGORIES,
  PLACEHOLDERS,
  replacePlaceholders,
  openWhatsApp
} from '../hooks/useWhatsAppTemplates';
import './SendMessageModal.css';

// Icons
const Icons = {
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
};

// Template Card for Selection
function TemplateSelectCard({ template, selected, onSelect }) {
  const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.value === template.category);
  
  return (
    <div 
      className={`template-select-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(template)}
    >
      <div className="template-select-header">
        <span className="template-category-icon">{categoryInfo?.icon || '📝'}</span>
        <span className="template-select-name">{template.name}</span>
        {selected && (
          <span className="selected-badge">
            <Icons.Check />
          </span>
        )}
      </div>
      <div className="template-select-preview">
        {template.content.length > 100 
          ? template.content.substring(0, 100) + '...' 
          : template.content}
      </div>
    </div>
  );
}

// Main SendMessageModal Component
export default function SendMessageModal({ 
  isOpen, 
  onClose, 
  candidate,
  defaultTemplate = null
}) {
  const { templates, loading: templatesLoading } = useWhatsAppTemplates({});
  const { incrementUsage } = useWhatsAppTemplateActions();
  
  const [step, setStep] = useState(defaultTemplate ? 2 : 1);
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Build candidate data for placeholder replacement
  const candidateData = useMemo(() => {
    if (!candidate) return {};
    
    const nameParts = (candidate.name || '').split(' ');
    
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      fullName: candidate.name || '',
      jobTitle: candidate.jobTitle || '',
      branchName: candidate.branchName || '',
      branchAddress: candidate.branchAddress || '',
      interviewDate: candidate.interviewDate || '',
      interviewTime: candidate.interviewTime || '',
      trialDate: candidate.trialDate || '',
      trialTime: candidate.trialTime || '',
      recruiterName: candidate.recruiterName || 'Allied Recruitment Team',
      companyName: candidate.entityName || 'Allied Pharmacies'
    };
  }, [candidate]);

  // Process content with placeholders
  const processedContent = useMemo(() => {
    const content = isEditing ? editedContent : (selectedTemplate?.content || '');
    return replacePlaceholders(content, candidateData);
  }, [selectedTemplate, editedContent, isEditing, candidateData]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const search = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.content.toLowerCase().includes(search)
    );
  }, [templates, searchQuery]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
        setEditedContent(defaultTemplate.content);
        setStep(2);
      } else {
        setStep(1);
        setSelectedTemplate(null);
        setEditedContent('');
      }
      setIsEditing(false);
    }
  }, [isOpen, defaultTemplate]);

  // Handle template selection
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
    setStep(2);
  };

  // Handle sending message
  const handleSend = async () => {
    if (!candidate?.phone) {
      alert('No phone number available for this candidate');
      return;
    }

    // Track usage
    if (selectedTemplate?.id) {
      await incrementUsage(selectedTemplate.id);
    }

    // Open WhatsApp
    openWhatsApp(candidate.phone, processedContent);
    
    onClose();
  };

  // Check for missing placeholders
  const missingPlaceholders = useMemo(() => {
    const missing = [];
    const content = isEditing ? editedContent : (selectedTemplate?.content || '');
    
    PLACEHOLDERS.forEach(p => {
      const regex = new RegExp(`\\{\\{${p.key}\\}\\}`, 'gi');
      if (regex.test(content) && !candidateData[p.key]) {
        missing.push(p);
      }
    });
    
    return missing;
  }, [selectedTemplate, editedContent, isEditing, candidateData]);

  if (!isOpen) return null;

  return (
    <div className="send-overlay" onClick={onClose}>
      <div className="send-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="send-header">
          <div className="send-header-left">
            <div className="send-icon whatsapp">
              <Icons.MessageCircle />
            </div>
            <div>
              <h2 className="send-title">Send WhatsApp Message</h2>
              <p className="send-subtitle">
                {candidate?.name ? `To ${candidate.name}` : 'Select a template to send'}
              </p>
            </div>
          </div>
          <button className="send-close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        {/* Body */}
        <div className="send-body">
          {/* Step 1: Select Template */}
          {step === 1 && (
            <div className="template-select-step">
              <div className="step-header">
                <h3>Choose a Template</h3>
                <div className="template-search">
                  <Icons.Search />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {templatesLoading ? (
                <div className="templates-loading">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="templates-empty">
                  <Icons.MessageCircle />
                  <p>No templates found</p>
                </div>
              ) : (
                <div className="template-select-grid">
                  {filteredTemplates.map(template => (
                    <TemplateSelectCard
                      key={template.id}
                      template={template}
                      selected={selectedTemplate?.id === template.id}
                      onSelect={handleSelectTemplate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview & Edit */}
          {step === 2 && (
            <div className="message-preview-step">
              <div className="preview-columns">
                {/* Left: Edit Area */}
                <div className="edit-column">
                  <div className="edit-header">
                    <h3>{selectedTemplate?.name || 'Custom Message'}</h3>
                    <button 
                      className={`edit-toggle ${isEditing ? 'active' : ''}`}
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Icons.Edit />
                      {isEditing ? 'Preview' : 'Edit'}
                    </button>
                  </div>

                  {isEditing ? (
                    <textarea
                      className="message-editor"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Type your message..."
                    />
                  ) : (
                    <div className="message-preview-text">
                      {processedContent}
                    </div>
                  )}

                  {missingPlaceholders.length > 0 && (
                    <div className="missing-placeholders-warning">
                      <Icons.AlertCircle />
                      <div>
                        <strong>Missing information:</strong>
                        <span>
                          {missingPlaceholders.map(p => p.label).join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: WhatsApp Preview */}
                <div className="preview-column">
                  <h4>WhatsApp Preview</h4>
                  <div className="whatsapp-preview-mini">
                    <div className="whatsapp-preview-header">
                      <div className="avatar">{candidate?.name?.charAt(0) || '?'}</div>
                      <div className="contact-info">
                        <span className="contact-name">{candidate?.name || 'Candidate'}</span>
                        <span className="contact-phone">
                          <Icons.Phone />
                          {candidate?.phone || 'No phone'}
                        </span>
                      </div>
                    </div>
                    <div className="whatsapp-preview-body">
                      <div className="message-bubble">
                        {processedContent || 'Your message will appear here...'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="send-footer">
          {step === 2 && (
            <button 
              className="btn btn-secondary"
              onClick={() => setStep(1)}
            >
              Back to Templates
            </button>
          )}
          
          <div className="send-footer-right">
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            
            {step === 2 && (
              <button 
                className="btn btn-whatsapp"
                onClick={handleSend}
                disabled={!candidate?.phone || !processedContent}
              >
                <Icons.Send />
                Open in WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
