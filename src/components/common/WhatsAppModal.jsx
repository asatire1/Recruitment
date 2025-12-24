import { useState, useEffect } from 'react';
import { Send, Copy, Check, ChevronDown, Edit3, Eye } from 'lucide-react';
import { Button, Modal, Textarea, Select } from '../ui';
import {
  subscribeToTemplates,
  fillTemplate,
  buildPlaceholderValues,
  generateWhatsAppUrl,
  getCategoryLabel,
  TEMPLATE_CATEGORIES,
  AVAILABLE_PLACEHOLDERS
} from '../../lib/whatsapp';
import './WhatsAppModal.css';

/**
 * WhatsAppModal - Send templated WhatsApp messages to candidates
 */
export default function WhatsAppModal({
  isOpen,
  onClose,
  candidate,
  additionalData = {}
}) {
  // State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [message, setMessage] = useState('');
  const [isPreview, setIsPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscribe to templates
  useEffect(() => {
    const unsubscribe = subscribeToTemplates((data) => {
      setTemplates(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Build placeholder values
  const placeholderValues = candidate ? buildPlaceholderValues(candidate, additionalData) : {};

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  // Get selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Update message when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const filled = fillTemplate(selectedTemplate.content, placeholderValues);
      setMessage(filled);
      setIsPreview(true);
    }
  }, [selectedTemplateId, selectedTemplate]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setSelectedCategory('all');
      setMessage('');
      setIsPreview(true);
      setCopied(false);
    }
  }, [isOpen]);

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
  };

  // Handle send via WhatsApp
  const handleSend = () => {
    if (!candidate?.phone || !message.trim()) return;
    
    const url = generateWhatsAppUrl(candidate.phone, message);
    window.open(url, '_blank');
    onClose();
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get preview message (with placeholders highlighted)
  const getPreviewMessage = () => {
    if (!selectedTemplate) return message;
    
    let preview = selectedTemplate.content;
    
    // Replace placeholders with styled spans (for display only)
    AVAILABLE_PLACEHOLDERS.forEach(({ key }) => {
      const value = placeholderValues[key];
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      if (value) {
        preview = preview.replace(regex, `<span class="placeholder-filled">${value}</span>`);
      } else {
        preview = preview.replace(regex, `<span class="placeholder-empty">{{${key}}}</span>`);
      }
    });
    
    return preview;
  };

  if (!candidate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send WhatsApp Message"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="outline"
            leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
            onClick={handleCopy}
            disabled={!message.trim()}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button 
            leftIcon={<Send size={16} />}
            onClick={handleSend}
            disabled={!message.trim()}
            className="whatsapp-send-btn"
          >
            Send via WhatsApp
          </Button>
        </>
      }
    >
      <div className="whatsapp-modal-content">
        {/* Recipient Info */}
        <div className="whatsapp-recipient">
          <div className="whatsapp-recipient-avatar">
            {candidate.firstName?.[0]}{candidate.lastName?.[0]}
          </div>
          <div className="whatsapp-recipient-info">
            <span className="whatsapp-recipient-name">
              {candidate.firstName} {candidate.lastName}
            </span>
            <span className="whatsapp-recipient-phone">{candidate.phone}</span>
          </div>
        </div>

        {/* Template Selection */}
        <div className="whatsapp-templates-section">
          <div className="whatsapp-templates-header">
            <label className="whatsapp-label">Choose a template</label>
            <select
              className="whatsapp-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {TEMPLATE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="whatsapp-templates-loading">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="whatsapp-templates-empty">
              No templates found. Create templates in Settings.
            </div>
          ) : (
            <div className="whatsapp-templates-grid">
              {filteredTemplates.map(template => (
                <button
                  key={template.id}
                  className={`whatsapp-template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <span className="whatsapp-template-name">{template.name}</span>
                  <span className="whatsapp-template-category">
                    {getCategoryLabel(template.category)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Editor/Preview */}
        <div className="whatsapp-message-section">
          <div className="whatsapp-message-header">
            <label className="whatsapp-label">Message</label>
            <div className="whatsapp-message-toggle">
              <button
                className={`whatsapp-toggle-btn ${isPreview ? 'active' : ''}`}
                onClick={() => setIsPreview(true)}
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                className={`whatsapp-toggle-btn ${!isPreview ? 'active' : ''}`}
                onClick={() => setIsPreview(false)}
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>
          </div>

          {isPreview ? (
            <div 
              className="whatsapp-message-preview"
              dangerouslySetInnerHTML={{ __html: getPreviewMessage().replace(/\n/g, '<br>') }}
            />
          ) : (
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Type your message..."
            />
          )}
        </div>

        {/* Placeholders Help */}
        {!isPreview && (
          <div className="whatsapp-placeholders-help">
            <span className="whatsapp-placeholders-label">Available placeholders:</span>
            <div className="whatsapp-placeholders-list">
              {AVAILABLE_PLACEHOLDERS.slice(0, 6).map(p => (
                <code 
                  key={p.key} 
                  className="whatsapp-placeholder-tag"
                  onClick={() => setMessage(prev => prev + `{{${p.key}}}`)}
                  title={`Insert {{${p.key}}}`}
                >
                  {`{{${p.key}}}`}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
