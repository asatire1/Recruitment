// ============================================================================
// Message Templates Tab - Supports WhatsApp and Email
// Renamed from WhatsAppTemplatesTab to support both channels
// ============================================================================

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb, PLACEHOLDER_DEFINITIONS } from '@allied/shared-lib'
import { Card, Button, Input, Spinner, Modal, Select, Textarea } from '@allied/shared-ui'

// ============================================================================
// TYPES
// ============================================================================

type TemplateCategory = 'interview' | 'trial' | 'offer' | 'rejection' | 'reminder' | 'general'
type TemplateChannel = 'whatsapp' | 'email' | 'both'

interface MessageTemplate {
  id: string
  name: string
  category: TemplateCategory
  channel: TemplateChannel
  subject?: string // Email subject line
  content: string
  placeholders: string[]
  active: boolean
  createdAt: any
  updatedAt: any
  createdBy?: string
}

interface MessageTemplatesTabProps {
  userId?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE_CATEGORIES = [
  { value: 'interview', label: 'Interview', color: '#3b82f6' },
  { value: 'trial', label: 'Trial', color: '#8b5cf6' },
  { value: 'offer', label: 'Offer', color: '#10b981' },
  { value: 'rejection', label: 'Rejection', color: '#ef4444' },
  { value: 'reminder', label: 'Reminder', color: '#f59e0b' },
  { value: 'general', label: 'General', color: '#6b7280' },
]

const TEMPLATE_CHANNELS = [
  { value: 'whatsapp', label: '📱 WhatsApp Only', color: '#25D366' },
  { value: 'email', label: '📧 Email Only', color: '#3b82f6' },
  { value: 'both', label: '📱📧 Both', color: '#8b5cf6' },
]

// Available placeholders for templates
const AVAILABLE_PLACEHOLDERS = PLACEHOLDER_DEFINITIONS.map(p => ({
  key: p.key,
  label: p.label,
  description: p.description
}))

// Default templates for seeding
const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'Interview Invitation',
    category: 'interview',
    channel: 'both',
    subject: 'Interview Invitation - {{jobTitle}} at Allied Pharmacies',
    content: `Hi {{firstName}},

Thank you for applying for the {{jobTitle}} position at Allied Pharmacies.

We'd like to invite you for an interview. Please book your preferred slot using this link:
{{interviewBookingLink}}

We look forward to meeting you!

Best regards,
Allied Pharmacies Recruitment`,
    placeholders: ['firstName', 'jobTitle', 'interviewBookingLink'],
    active: true,
  },
  {
    name: 'Interview Reminder',
    category: 'reminder',
    channel: 'both',
    subject: 'Reminder: Your Interview Tomorrow - Allied Pharmacies',
    content: `Hi {{firstName}},

This is a friendly reminder about your interview tomorrow for the {{jobTitle}} position.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please arrive 10 minutes early. If you need to reschedule, please let us know as soon as possible.

See you soon!`,
    placeholders: ['firstName', 'jobTitle', 'interviewDate', 'interviewTime', 'branchAddress'],
    active: true,
  },
  {
    name: 'Trial Shift Invitation',
    category: 'trial',
    channel: 'both',
    subject: 'Trial Shift Invitation - {{branchName}} - Allied Pharmacies',
    content: `Hi {{firstName}},

Congratulations! Following your successful interview, we'd like to invite you for a trial shift at {{branchName}}.

Please book your trial slot here:
{{interviewBookingLink}}

What to bring:
• Proof of right to work
• Smart business attire
• Any relevant certificates

Looking forward to seeing you!

Best regards,
Allied Pharmacies`,
    placeholders: ['firstName', 'branchName', 'interviewBookingLink'],
    active: true,
  },
  {
    name: 'Trial Shift Reminder',
    category: 'reminder',
    channel: 'both',
    subject: 'Reminder: Your Trial Shift Tomorrow - Allied Pharmacies',
    content: `Hi {{firstName}},

Just a reminder about your trial shift tomorrow at {{branchName}}.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please arrive 10 minutes early and report to the branch manager.

Good luck!`,
    placeholders: ['firstName', 'branchName', 'interviewDate', 'interviewTime', 'branchAddress'],
    active: true,
  },
  {
    name: 'Job Offer',
    category: 'offer',
    channel: 'both',
    subject: 'Job Offer - {{jobTitle}} at Allied Pharmacies 🎉',
    content: `Hi {{firstName}},

Fantastic news! 🎉

We are delighted to offer you the position of {{jobTitle}} at {{branchName}}.

Please contact us to discuss the next steps.

Welcome to the team!

Best regards,
Allied Pharmacies`,
    placeholders: ['firstName', 'jobTitle', 'branchName'],
    active: true,
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function MessageTemplatesTab({ userId }: MessageTemplatesTabProps) {
  const db = getFirebaseDb()

  // State
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'general' as TemplateCategory,
    channel: 'both' as TemplateChannel,
    subject: '',
    content: ''
  })
  const [templateFormError, setTemplateFormError] = useState('')
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null)
  const [deletingTemplateLoading, setDeletingTemplateLoading] = useState(false)
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [templateChannelFilter, setTemplateChannelFilter] = useState<TemplateChannel | 'all'>('all')
  const [showPlaceholderHelp, setShowPlaceholderHelp] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [previewingTemplate, setPreviewingTemplate] = useState<MessageTemplate | null>(null)

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoadingTemplates(true)
        // Use same collection for backward compatibility
        const templatesRef = collection(db, 'whatsappTemplates')
        const snapshot = await getDocs(templatesRef)

        if (snapshot.empty) {
          console.log('No templates found, initializing defaults...')
          await initializeDefaultTemplates()
        } else {
          const data = snapshot.docs.map(doc => {
            const docData = doc.data()
            return {
              id: doc.id,
              ...docData,
              // Default channel to 'whatsapp' for backward compatibility
              channel: docData.channel || 'whatsapp',
              subject: docData.subject || '',
            }
          }) as MessageTemplate[]

          // Sort by category then name
          data.sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category)
            return a.name.localeCompare(b.name)
          })
          setTemplates(data)
        }
      } catch (err) {
        console.error('Error fetching templates:', err)
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [db])

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Extract placeholders from template content
  const extractPlaceholders = (content: string, subject?: string): string[] => {
    const allContent = subject ? `${subject} ${content}` : content
    const matches = allContent.match(/\{\{(\w+)\}\}/g) || []
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
  }

  // Highlight placeholders in template content for preview
  const highlightPlaceholders = (content: string): React.ReactNode => {
    const parts = content.split(/(\{\{[^}]+\}\})/g)
    return parts.map((part, index) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={index} className="placeholder-highlight">
            {part}
          </span>
        )
      }
      return part
    })
  }

  // Filter templates by category, channel, and search
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = templateCategoryFilter === 'all' || t.category === templateCategoryFilter
    const matchesChannel = templateChannelFilter === 'all' || 
      t.channel === templateChannelFilter || 
      t.channel === 'both'
    const matchesSearch = !templateSearch ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.content.toLowerCase().includes(templateSearch.toLowerCase())
    return matchesCategory && matchesChannel && matchesSearch
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Initialize default templates
  const initializeDefaultTemplates = async () => {
    try {
      const templatesRef = collection(db, 'whatsappTemplates')
      const newTemplates: MessageTemplate[] = []

      for (const defaultTemplate of DEFAULT_TEMPLATES) {
        const docRef = await addDoc(templatesRef, {
          ...defaultTemplate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId || 'system',
        })
        newTemplates.push({
          id: docRef.id,
          ...defaultTemplate,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId || 'system',
        })
      }

      newTemplates.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category)
        return a.name.localeCompare(b.name)
      })
      setTemplates(newTemplates)
    } catch (err) {
      console.error('Error initializing default templates:', err)
    }
  }

  const handleAddTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ name: '', category: 'general', channel: 'both', subject: '', content: '' })
    setTemplateFormError('')
    setShowTemplateModal(true)
  }

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      category: template.category,
      channel: template.channel,
      subject: template.subject || '',
      content: template.content
    })
    setTemplateFormError('')
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      setTemplateFormError('Template name is required')
      return
    }
    if (!templateForm.content.trim()) {
      setTemplateFormError('Template content is required')
      return
    }
    // Require subject for email templates
    if ((templateForm.channel === 'email' || templateForm.channel === 'both') && !templateForm.subject.trim()) {
      setTemplateFormError('Email subject is required for email templates')
      return
    }

    // Check for duplicates
    const duplicate = templates.find(
      t => t.name.toLowerCase() === templateForm.name.trim().toLowerCase() &&
           t.id !== editingTemplate?.id
    )
    if (duplicate) {
      setTemplateFormError('A template with this name already exists')
      return
    }

    try {
      setSavingTemplate(true)
      const templatesRef = collection(db, 'whatsappTemplates')
      const placeholders = extractPlaceholders(templateForm.content, templateForm.subject)

      if (editingTemplate) {
        await updateDoc(doc(db, 'whatsappTemplates', editingTemplate.id), {
          name: templateForm.name.trim(),
          category: templateForm.category,
          channel: templateForm.channel,
          subject: templateForm.subject.trim(),
          content: templateForm.content.trim(),
          placeholders,
          updatedAt: serverTimestamp(),
        })
        setTemplates(prev => prev.map(t =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: templateForm.name.trim(),
                category: templateForm.category,
                channel: templateForm.channel,
                subject: templateForm.subject.trim(),
                content: templateForm.content.trim(),
                placeholders,
                updatedAt: new Date(),
              }
            : t
        ).sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category)
          return a.name.localeCompare(b.name)
        }))
      } else {
        const docRef = await addDoc(templatesRef, {
          name: templateForm.name.trim(),
          category: templateForm.category,
          channel: templateForm.channel,
          subject: templateForm.subject.trim(),
          content: templateForm.content.trim(),
          placeholders,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId || 'system',
        })
        setTemplates(prev => [...prev, {
          id: docRef.id,
          name: templateForm.name.trim(),
          category: templateForm.category,
          channel: templateForm.channel,
          subject: templateForm.subject.trim(),
          content: templateForm.content.trim(),
          placeholders,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId || 'system',
        }].sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category)
          return a.name.localeCompare(b.name)
        }))
      }

      setShowTemplateModal(false)
    } catch (err) {
      console.error('Error saving template:', err)
      setTemplateFormError('Failed to save. Please try again.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleToggleTemplateActive = async (template: MessageTemplate) => {
    try {
      await updateDoc(doc(db, 'whatsappTemplates', template.id), {
        active: !template.active,
        updatedAt: serverTimestamp(),
      })
      setTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, active: !t.active } : t
      ))
    } catch (err) {
      console.error('Error toggling template:', err)
    }
  }

  const handleConfirmDeleteTemplate = (template: MessageTemplate) => {
    setDeletingTemplate(template)
    setShowDeleteTemplateModal(true)
  }

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return

    try {
      setDeletingTemplateLoading(true)
      await deleteDoc(doc(db, 'whatsappTemplates', deletingTemplate.id))
      setTemplates(prev => prev.filter(t => t.id !== deletingTemplate.id))
      setShowDeleteTemplateModal(false)
      setDeletingTemplate(null)
    } catch (err) {
      console.error('Error deleting template:', err)
    } finally {
      setDeletingTemplateLoading(false)
    }
  }

  const handleDuplicateTemplate = (template: MessageTemplate) => {
    setEditingTemplate(null)
    setTemplateForm({
      name: `${template.name} (Copy)`,
      category: template.category,
      channel: template.channel,
      subject: template.subject || '',
      content: template.content
    })
    setTemplateFormError('')
    setShowTemplateModal(true)
  }

  const handleInsertPlaceholder = (key: string) => {
    setTemplateForm(prev => ({
      ...prev,
      content: prev.content + `{{${key}}}`
    }))
  }

  const handleInsertPlaceholderSubject = (key: string) => {
    setTemplateForm(prev => ({
      ...prev,
      subject: prev.subject + `{{${key}}}`
    }))
  }

  // Get channel badge
  const getChannelBadge = (channel: TemplateChannel) => {
    const channelInfo = TEMPLATE_CHANNELS.find(c => c.value === channel)
    return (
      <span 
        className="channel-badge"
        style={{ 
          backgroundColor: `${channelInfo?.color}20`,
          color: channelInfo?.color
        }}
      >
        {channel === 'whatsapp' ? '📱' : channel === 'email' ? '📧' : '📱📧'}
      </span>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="settings-section">
        <div className="section-header">
          <div>
            <h3>📝 Message Templates</h3>
            <p>Manage templates for WhatsApp and Email communications</p>
          </div>
          <Button variant="primary" onClick={handleAddTemplate}>
            + New Template
          </Button>
        </div>

        {loadingTemplates ? (
          <div className="loading-state">
            <Spinner size="lg" />
            <p>Loading templates...</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="templates-filters">
              <Input
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="template-search"
              />
              <Select
                value={templateCategoryFilter}
                onChange={(e) => setTemplateCategoryFilter(e.target.value as TemplateCategory | 'all')}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...TEMPLATE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))
                ]}
              />
              <Select
                value={templateChannelFilter}
                onChange={(e) => setTemplateChannelFilter(e.target.value as TemplateChannel | 'all')}
                options={[
                  { value: 'all', label: 'All Channels' },
                  { value: 'whatsapp', label: '📱 WhatsApp' },
                  { value: 'email', label: '📧 Email' },
                ]}
              />
            </div>

            {/* Templates Grid */}
            <div className="templates-grid">
              {filteredTemplates.length === 0 ? (
                <div className="empty-state">
                  <p>No templates found</p>
                  {templateSearch || templateCategoryFilter !== 'all' || templateChannelFilter !== 'all' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setTemplateSearch('')
                        setTemplateCategoryFilter('all')
                        setTemplateChannelFilter('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={handleAddTemplate}>
                      Create your first template
                    </Button>
                  )}
                </div>
              ) : (
                filteredTemplates.map(template => {
                  const category = TEMPLATE_CATEGORIES.find(c => c.value === template.category)
                  return (
                    <Card key={template.id} className={`template-card ${!template.active ? 'inactive' : ''}`}>
                      <div className="template-card-header">
                        <div className="template-badges">
                          <span
                            className="template-category-badge"
                            style={{
                              backgroundColor: `${category?.color}20`,
                              color: category?.color
                            }}
                          >
                            {category?.label}
                          </span>
                          {getChannelBadge(template.channel)}
                        </div>
                        <div className="template-actions">
                          <button
                            className={`toggle-btn ${template.active ? 'active' : ''}`}
                            onClick={() => handleToggleTemplateActive(template)}
                            title={template.active ? 'Deactivate' : 'Activate'}
                          >
                            {template.active ? '✓' : '○'}
                          </button>
                        </div>
                      </div>
                      <h4 className="template-name">{template.name}</h4>
                      {template.subject && (
                        <p className="template-subject">
                          <strong>Subject:</strong> {template.subject}
                        </p>
                      )}
                      <div className="template-preview" onClick={() => setPreviewingTemplate(template)}>
                        {template.content.substring(0, 120)}
                        {template.content.length > 120 && '...'}
                      </div>
                      <div className="template-card-footer">
                        <span className="placeholder-count">
                          {template.placeholders.length} placeholder{template.placeholders.length !== 1 ? 's' : ''}
                        </span>
                        <div className="template-card-actions">
                          <button onClick={() => setPreviewingTemplate(template)} title="Preview">👁️</button>
                          <button onClick={() => handleDuplicateTemplate(template)} title="Duplicate">📋</button>
                          <button onClick={() => handleEditTemplate(template)} title="Edit">✏️</button>
                          <button onClick={() => handleConfirmDeleteTemplate(template)} title="Delete">🗑️</button>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Summary */}
            {templates.length > 0 && (
              <div className="templates-summary">
                {filteredTemplates.length === templates.length
                  ? `${templates.length} template${templates.length !== 1 ? 's' : ''}`
                  : `Showing ${filteredTemplates.length} of ${templates.length} templates`
                } • {templates.filter(t => t.active).length} active
                • {templates.filter(t => t.channel === 'email' || t.channel === 'both').length} email-enabled
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        size="lg"
      >
        <div className="template-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Template Name *</label>
              <Input
                value={templateForm.name}
                onChange={(e) => {
                  setTemplateForm(prev => ({ ...prev, name: e.target.value }))
                  setTemplateFormError('')
                }}
                placeholder="e.g., Interview Invitation"
                autoFocus
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Category *</label>
              <Select
                value={templateForm.category}
                onChange={(e) => setTemplateForm(prev => ({
                  ...prev,
                  category: e.target.value as TemplateCategory
                }))}
                options={TEMPLATE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Channel *</label>
              <Select
                value={templateForm.channel}
                onChange={(e) => setTemplateForm(prev => ({
                  ...prev,
                  channel: e.target.value as TemplateChannel
                }))}
                options={TEMPLATE_CHANNELS.map(c => ({ value: c.value, label: c.label }))}
              />
            </div>
          </div>

          {/* Email Subject (only for email templates) */}
          {(templateForm.channel === 'email' || templateForm.channel === 'both') && (
            <div className="form-group">
              <label>Email Subject *</label>
              <div className="subject-input-wrapper">
                <Input
                  value={templateForm.subject}
                  onChange={(e) => {
                    setTemplateForm(prev => ({ ...prev, subject: e.target.value }))
                    setTemplateFormError('')
                  }}
                  placeholder="e.g., Interview Invitation - {{jobTitle}} at Allied Pharmacies"
                />
                <button
                  type="button"
                  className="insert-placeholder-btn"
                  onClick={() => setShowPlaceholderHelp(!showPlaceholderHelp)}
                  title="Insert placeholder"
                >
                  {'{ }'}
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <div className="template-content-header">
              <label>Message Content *</label>
              <button
                type="button"
                className="placeholder-help-btn"
                onClick={() => setShowPlaceholderHelp(!showPlaceholderHelp)}
              >
                {showPlaceholderHelp ? 'Hide placeholders' : 'Show placeholders'}
              </button>
            </div>
            
            {showPlaceholderHelp && (
              <div className="placeholder-help-panel">
                <p className="placeholder-help-intro">Click a placeholder to insert it into your message:</p>
                <div className="placeholder-buttons">
                  {AVAILABLE_PLACEHOLDERS.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      className="placeholder-insert-btn"
                      onClick={() => handleInsertPlaceholder(p.key)}
                      title={p.description}
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              value={templateForm.content}
              onChange={(e) => {
                setTemplateForm(prev => ({ ...prev, content: e.target.value }))
                setTemplateFormError('')
              }}
              placeholder="Write your message here. Use {{placeholders}} for dynamic content..."
              rows={10}
            />
            
            {templateForm.content && (
              <div className="detected-placeholders">
                <span className="detected-label">Detected placeholders:</span>
                {extractPlaceholders(templateForm.content, templateForm.subject).length > 0 ? (
                  extractPlaceholders(templateForm.content, templateForm.subject).map(p => (
                    <span key={p} className="placeholder-tag">{`{{${p}}}`}</span>
                  ))
                ) : (
                  <span className="no-placeholders">None</span>
                )}
              </div>
            )}
          </div>

          {templateFormError && (
            <p className="form-error">{templateFormError}</p>
          )}

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Template Modal */}
      <Modal
        isOpen={showDeleteTemplateModal}
        onClose={() => setShowDeleteTemplateModal(false)}
        title="Delete Template"
        size="sm"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>"{deletingTemplate?.name}"</strong>?</p>
          <p className="delete-warning">
            This action cannot be undone. This template will no longer be available for sending messages.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowDeleteTemplateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTemplate}
              disabled={deletingTemplateLoading}
            >
              {deletingTemplateLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Preview Modal */}
      <Modal
        isOpen={!!previewingTemplate}
        onClose={() => setPreviewingTemplate(null)}
        title="Template Preview"
        size="md"
      >
        {previewingTemplate && (
          <div className="template-preview-modal">
            <div className="preview-header">
              <div className="preview-badges">
                <span
                  className="template-category-badge"
                  style={{
                    backgroundColor: `${TEMPLATE_CATEGORIES.find(c => c.value === previewingTemplate.category)?.color}20`,
                    color: TEMPLATE_CATEGORIES.find(c => c.value === previewingTemplate.category)?.color
                  }}
                >
                  {TEMPLATE_CATEGORIES.find(c => c.value === previewingTemplate.category)?.label}
                </span>
                {getChannelBadge(previewingTemplate.channel)}
              </div>
              <h3>{previewingTemplate.name}</h3>
              {!previewingTemplate.active && <span className="inactive-badge">Inactive</span>}
            </div>

            {previewingTemplate.subject && (
              <div className="preview-subject">
                <strong>Subject:</strong> {highlightPlaceholders(previewingTemplate.subject)}
              </div>
            )}
            
            <div className="preview-content">
              <div className="preview-message">
                {highlightPlaceholders(previewingTemplate.content)}
              </div>
            </div>

            {previewingTemplate.placeholders.length > 0 && (
              <div className="preview-placeholders">
                <span className="preview-placeholders-label">Placeholders used:</span>
                <div className="preview-placeholders-list">
                  {previewingTemplate.placeholders.map(p => {
                    const placeholder = AVAILABLE_PLACEHOLDERS.find(ap => ap.key === `{{${p}}}`)
                    return (
                      <div key={p} className="preview-placeholder-item">
                        <span className="placeholder-tag">{`{{${p}}}`}</span>
                        <span className="placeholder-description">{placeholder?.description || 'Custom placeholder'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setPreviewingTemplate(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  handleDuplicateTemplate(previewingTemplate)
                  setPreviewingTemplate(null)
                }}
              >
                Duplicate
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleEditTemplate(previewingTemplate)
                  setPreviewingTemplate(null)
                }}
              >
                Edit Template
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// Also export as default and with old name for backward compatibility
export { MessageTemplatesTab as WhatsAppTemplatesTab }
export default MessageTemplatesTab
