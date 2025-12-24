import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MessageSquare, Copy } from 'lucide-react';
import { Button, Card, CardBody, Badge, Modal, Input, Select, Textarea } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
  getCategoryLabel,
  TEMPLATE_CATEGORIES,
  AVAILABLE_PLACEHOLDERS
} from '../../lib/whatsapp';
import './WhatsAppTemplates.css';

export default function WhatsAppTemplates() {
  const { user } = useAuth();
  
  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    content: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Subscribe to templates
  useEffect(() => {
    const unsubscribe = subscribeToTemplates((data) => {
      setTemplates(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter templates
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  // Handle seed default templates
  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      await seedDefaultTemplates(user.uid);
    } catch (err) {
      console.error('Error seeding templates:', err);
    }
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Insert placeholder at cursor
  const insertPlaceholder = (placeholder) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{{${placeholder}}}`
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.content.trim()) errors.content = 'Content is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        await createTemplate(formData, user.uid);
      }
      closeForm();
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (templateId) => {
    try {
      await deleteTemplate(templateId);
    } catch (err) {
      console.error('Error deleting template:', err);
    }
    setDeleteConfirm(null);
  };

  // Open form for edit
  const openEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open form for create
  const openCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', category: '', content: '' });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTemplate(null);
    setFormData({ name: '', category: '', content: '' });
    setFormErrors({});
  };

  return (
    <div className="whatsapp-templates-page">
      {/* Header */}
      <div className="templates-header">
        <div className="templates-header-left">
          <h2 className="templates-title">WhatsApp Templates</h2>
          <p className="templates-subtitle">
            Create and manage message templates for candidate communication
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
          New Template
        </Button>
      </div>

      {/* Filter */}
      <div className="templates-filter">
        <select
          className="templates-category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {TEMPLATE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        
        {templates.length === 0 && !loading && (
          <Button variant="outline" onClick={handleSeedDefaults}>
            Load Default Templates
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="templates-loading">
          <div className="loading-spinner" />
          <p>Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        /* Empty State */
        <Card className="templates-empty">
          <CardBody>
            <div className="empty-state">
              <div className="empty-state-icon">
                <MessageSquare size={28} />
              </div>
              <h3 className="empty-state-title">No templates yet</h3>
              <p className="empty-state-description">
                Create your first template or load the default templates to get started.
              </p>
              <div className="empty-state-actions">
                <Button onClick={handleSeedDefaults}>
                  Load Default Templates
                </Button>
                <Button variant="outline" onClick={openCreate}>
                  Create Custom Template
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        /* Templates List */
        <div className="templates-list">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="templates-category-group">
              <h3 className="templates-category-title">
                {getCategoryLabel(category)}
                <span className="templates-category-count">{categoryTemplates.length}</span>
              </h3>
              
              <div className="templates-grid">
                {categoryTemplates.map(template => (
                  <Card key={template.id} className="template-card">
                    <CardBody>
                      <div className="template-card-header">
                        <h4 className="template-card-name">{template.name}</h4>
                        {template.isDefault && (
                          <Badge variant="gray">Default</Badge>
                        )}
                      </div>
                      
                      <p className="template-card-preview">
                        {template.content.substring(0, 120)}
                        {template.content.length > 120 ? '...' : ''}
                      </p>
                      
                      {template.placeholders?.length > 0 && (
                        <div className="template-card-placeholders">
                          {template.placeholders.slice(0, 4).map(p => (
                            <code key={p} className="template-placeholder">{`{{${p}}}`}</code>
                          ))}
                          {template.placeholders.length > 4 && (
                            <span className="template-placeholder-more">
                              +{template.placeholders.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="template-card-actions">
                        <button 
                          className="template-action-btn"
                          onClick={() => openEdit(template)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="template-action-btn template-action-danger"
                          onClick={() => setDeleteConfirm(template)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </>
        }
      >
        <div className="template-form">
          <div className="template-form-row">
            <Input
              label="Template Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g., Initial Contact"
              error={formErrors.name}
            />
          </div>
          
          <div className="template-form-row">
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleFormChange}
              options={TEMPLATE_CATEGORIES}
              placeholder="Select a category"
              error={formErrors.category}
            />
          </div>
          
          <div className="template-form-row">
            <Textarea
              label="Message Content"
              name="content"
              value={formData.content}
              onChange={handleFormChange}
              placeholder="Type your message template..."
              rows={8}
              error={formErrors.content}
            />
          </div>
          
          <div className="template-form-placeholders">
            <span className="template-form-placeholders-label">
              Click to insert placeholder:
            </span>
            <div className="template-form-placeholders-list">
              {AVAILABLE_PLACEHOLDERS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  className="template-form-placeholder-btn"
                  onClick={() => insertPlaceholder(p.key)}
                  title={p.example}
                >
                  {`{{${p.key}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="delete-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Template</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
