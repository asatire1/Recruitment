import { useState, useEffect } from 'react';
import { Send, Copy, Check, ChevronDown, Edit3, Eye, Calendar, Link2, Loader2 } from 'lucide-react';
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
import { createBookingLink, generateBookingMessage } from '../../lib/bookingLinks';
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
  
  // Booking link state
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [bookingType, setBookingType] = useState('interview');
  const [bookingLocation, setBookingLocation] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [bookingLink, setBookingLink] = useState(null);

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
      setShowBookingOptions(false);
      setBookingLink(null);
      setBookingType('interview');
      setBookingLocation('');
    }
  }, [isOpen]);

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    setShowBookingOptions(false);
    setBookingLink(null);
  };

  // Handle booking invite
  const handleGenerateBookingLink = async () => {
    if (!candidate) return;
    
    setGeneratingLink(true);
    try {
      const link = await createBookingLink({
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        type: bookingType,
        jobId: additionalData.jobId || null,
        jobTitle: additionalData.jobTitle || null,
        location: bookingLocation || null,
      });
      
      setBookingLink(link);
      
      // Generate message with booking link
      const bookingMessage = generateBookingMessage({
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        type: bookingType,
        jobTitle: additionalData.jobTitle || null,
        location: bookingLocation || null,
        bookingUrl: link.url
      });
      
      setMessage(bookingMessage);
      setSelectedTemplateId('');
    } catch (err) {
      console.error('Error generating booking link:', err);
      alert('Failed to generate booking link. Please try again.');
    } finally {
      setGeneratingLink(false);
    }
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

  // Copy just the booking link
  const handleCopyLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink.url);
      alert('Booking link copied!');
    } catch (err) {
      console.error('Failed to copy link:', err);
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

        {/* Quick Actions - Booking Invites */}
        <div className="whatsapp-quick-actions">
          <label className="whatsapp-label">Quick Actions</label>
          <div className="whatsapp-quick-btns">
            <button 
              className={`whatsapp-quick-btn ${showBookingOptions && bookingType === 'interview' ? 'active' : ''}`}
              onClick={() => {
                setShowBookingOptions(true);
                setBookingType('interview');
                setSelectedTemplateId('');
              }}
            >
              <Calendar size={16} />
              Invite to Interview
            </button>
            <button 
              className={`whatsapp-quick-btn ${showBookingOptions && bookingType === 'trial' ? 'active' : ''}`}
              onClick={() => {
                setShowBookingOptions(true);
                setBookingType('trial');
                setSelectedTemplateId('');
              }}
            >
              <Calendar size={16} />
              Invite to Trial
            </button>
          </div>
        </div>

        {/* Booking Options */}
        {showBookingOptions && (
          <div className="whatsapp-booking-options">
            <div className="booking-option-row">
              <div className="booking-option-field">
                <label>Type</label>
                <select 
                  value={bookingType} 
                  onChange={(e) => setBookingType(e.target.value)}
                >
                  <option value="interview">Interview</option>
                  <option value="trial">Trial Shift</option>
                </select>
              </div>
              <div className="booking-option-field">
                <label>Location (optional)</label>
                <input 
                  type="text"
                  value={bookingLocation}
                  onChange={(e) => setBookingLocation(e.target.value)}
                  placeholder="e.g., Manchester Branch"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleGenerateBookingLink}
              disabled={generatingLink}
              leftIcon={generatingLink ? <Loader2 size={16} className="spinning" /> : <Link2 size={16} />}
            >
              {generatingLink ? 'Generating...' : 'Generate Booking Link'}
            </Button>

            {bookingLink && (
              <div className="booking-link-generated">
                <div className="booking-link-success">
                  <Check size={16} />
                  Booking link created!
                </div>
                <div className="booking-link-url">
                  <code>{bookingLink.url}</code>
                  <button onClick={handleCopyLink}>
                    <Copy size={14} />
                  </button>
                </div>
                <p className="booking-link-expiry">
                  Expires: {bookingLink.expiresAt.toLocaleDateString('en-GB')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {showBookingOptions && (
          <div className="whatsapp-divider">
            <span>or choose a template</span>
          </div>
        )}

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
              dangerouslySetInnerHTML={{ __html: (bookingLink ? message : getPreviewMessage()).replace(/\n/g, '<br>') }}
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
        {!isPreview && !bookingLink && (
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
