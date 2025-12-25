import React, { useState, useEffect, useRef } from 'react';
import {
  useWhatsAppTemplateActions,
  TEMPLATE_CATEGORIES,
  PLACEHOLDERS,
  replaceWithExamples,
  extractPlaceholders
} from '../hooks/useWhatsAppTemplates';
import './TemplateEditor.css';

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
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  )
};

// Placeholder Chip Component
function PlaceholderChip({ placeholder, onClick }) {
  return (
    <button
      type="button"
      className="placeholder-chip"
      onClick={() => onClick(placeholder)}
      title={placeholder.description}
    >
      <span className="placeholder-key">{`{{${placeholder.key}}}`}</span>
      <span className="placeholder-example">{placeholder.example}</span>
    </button>
  );
}

// Preview Panel Component
function PreviewPanel({ content }) {
  const previewContent = replaceWithExamples(content);
  const usedPlaceholders = extractPlaceholders(content);
  
  return (
    <div className="preview-panel">
      <div className="preview-header">
        <Icons.Eye />
        <h3>Preview</h3>
      </div>
      
      <div className="whatsapp-preview">
        <div className="whatsapp-header">
          <div className="whatsapp-avatar">A</div>
          <div className="whatsapp-contact">
            <span className="whatsapp-name">Allied Recruitment</span>
            <span className="whatsapp-status">online</span>
          </div>
        </div>
        <div className="whatsapp-body">
          <div className="whatsapp-message">
            <div className="message-content">
              {previewContent || 'Your message preview will appear here...'}
            </div>
            <div className="message-time">10:30</div>
          </div>
        </div>
      </div>

      {usedPlaceholders.length > 0 && (
        <div className="used-placeholders">
          <h4>Placeholders used ({usedPlaceholders.length})</h4>
          <div className="placeholder-list">
            {usedPlaceholders.map(p => (
              <div key={p.key} className="placeholder-item">
                <span className="placeholder-key">{`{{${p.key}}}`}</span>
                <span className="placeholder-desc">{p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main TemplateEditor Component
export default function TemplateEditor({ isOpen, onClose, template = null, defaultCategory }) {
  const textareaRef = useRef(null);
  const { createTemplate, updateTemplate, loading, error: actionError } = useWhatsAppTemplateActions();
  
  const [formData, setFormData] = useState({
    name: '',
    category: defaultCategory || 'initial_contact',
    content: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [activeTab, setActiveTab] = useState('edit');

  // Populate form if editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        category: template.category || 'initial_contact',
        content: template.content || ''
      });
    } else {
      setFormData({
        name: '',
        category: defaultCategory || 'initial_contact',
        content: ''
      });
    }
  }, [template, defaultCategory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const insertPlaceholder = (placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const placeholderText = `{{${placeholder.key}}}`;
    
    const newText = text.substring(0, start) + placeholderText + text.substring(end);
    
    setFormData(prev => ({ ...prev, content: newText }));
    
    // Set cursor position after placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + placeholderText.length,
        start + placeholderText.length
      );
    }, 0);
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Message content is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      if (template) {
        await updateTemplate(template.id, formData);
      } else {
        await createTemplate(formData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="editor-header">
          <div className="editor-header-left">
            <div className="editor-icon whatsapp">
              <Icons.MessageCircle />
            </div>
            <div>
              <h2 className="editor-title">
                {template ? 'Edit Template' : 'Create Template'}
              </h2>
              <p className="editor-subtitle">
                {template 
                  ? 'Update your WhatsApp message template' 
                  : 'Create a reusable WhatsApp message template'}
              </p>
            </div>
          </div>
          <button className="editor-close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="editor-body">
            {actionError && (
              <div className="form-error-banner">
                {actionError}
              </div>
            )}

            {/* Left Column - Form */}
            <div className="editor-form">
              {/* Template Name */}
              <div className="form-group">
                <label className="form-label">Template Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Interview Invitation"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-select"
                >
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Placeholders Toggle */}
              <div className="placeholders-section">
                <button
                  type="button"
                  className="placeholders-toggle"
                  onClick={() => setShowPlaceholders(!showPlaceholders)}
                >
                  <Icons.Code />
                  Insert Placeholder
                  <span className={`toggle-arrow ${showPlaceholders ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showPlaceholders && (
                  <div className="placeholders-grid">
                    {PLACEHOLDERS.map(placeholder => (
                      <PlaceholderChip
                        key={placeholder.key}
                        placeholder={placeholder}
                        onClick={insertPlaceholder}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="form-group">
                <label className="form-label">Message Content *</label>
                <textarea
                  ref={textareaRef}
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Type your message here. Use placeholders like {{firstName}} to personalize..."
                  className={`form-textarea ${errors.content ? 'error' : ''}`}
                  rows={10}
                />
                {errors.content && <span className="form-error">{errors.content}</span>}
                <div className="textarea-hint">
                  <Icons.Info />
                  Tip: Click placeholders above to insert them at cursor position
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <PreviewPanel content={formData.content} />
          </div>

          {/* Footer */}
          <div className="editor-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (
                <>
                  <Icons.Check />
                  {template ? 'Save Changes' : 'Create Template'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
