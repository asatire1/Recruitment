import React, { useState } from 'react';
import { 
  useWhatsAppTemplates, 
  useWhatsAppTemplateActions,
  TEMPLATE_CATEGORIES,
  replaceWithExamples 
} from '../hooks/useWhatsAppTemplates';
import TemplateEditor from '../components/TemplateEditor';
import ConfirmModal from '../components/ConfirmModal';
import './WhatsAppTemplates.css';

// Icons
const Icons = {
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  MoreVertical: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="12" cy="5" r="1"/>
      <circle cx="12" cy="19" r="1"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
};

// Category Badge Component
function CategoryBadge({ category }) {
  const config = TEMPLATE_CATEGORIES.find(c => c.value === category) || TEMPLATE_CATEGORIES[TEMPLATE_CATEGORIES.length - 1];
  
  return (
    <span className="category-badge">
      <span className="category-icon">{config.icon}</span>
      {config.label}
    </span>
  );
}

// Template Card Component
function TemplateCard({ template, onEdit, onDuplicate, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const preview = replaceWithExamples(template.content);
  
  const handleAction = (action) => {
    setShowMenu(false);
    action();
  };

  return (
    <div className="template-card">
      <div className="template-card-header">
        <CategoryBadge category={template.category} />
        <div className="template-card-actions">
          <button 
            className="action-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Icons.MoreVertical />
          </button>
          {showMenu && (
            <>
              <div className="action-menu-backdrop" onClick={() => setShowMenu(false)} />
              <div className="action-menu">
                <button onClick={() => handleAction(() => onEdit(template))}>
                  <Icons.Edit />
                  Edit
                </button>
                <button onClick={() => handleAction(() => onDuplicate(template))}>
                  <Icons.Copy />
                  Duplicate
                </button>
                <button className="danger" onClick={() => handleAction(() => onDelete(template))}>
                  <Icons.Trash />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="template-card-title">{template.name}</h3>
      
      <div className="template-card-preview">
        {preview.length > 200 ? preview.substring(0, 200) + '...' : preview}
      </div>

      <div className="template-card-footer">
        <div className="template-meta">
          <Icons.Clock />
          <span>Used {template.usageCount || 0} times</span>
        </div>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(template)}
        >
          <Icons.Edit />
          Edit
        </button>
      </div>
    </div>
  );
}

// Category Filter Component
function CategoryFilter({ selected, onChange }) {
  return (
    <div className="category-filter">
      <button
        className={`category-btn ${selected === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
      >
        All Templates
      </button>
      {TEMPLATE_CATEGORIES.map(cat => (
        <button
          key={cat.value}
          className={`category-btn ${selected === cat.value ? 'active' : ''}`}
          onClick={() => onChange(cat.value)}
        >
          <span className="category-icon">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// Empty State Component
function EmptyState({ category, onCreateTemplate }) {
  const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.value === category);
  
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icons.MessageCircle />
      </div>
      <h3>
        {category === 'all' 
          ? 'No templates yet' 
          : `No ${categoryInfo?.label || category} templates`}
      </h3>
      <p>
        {category === 'all'
          ? 'Create your first WhatsApp template to streamline candidate communication.'
          : categoryInfo?.description || 'Create a template for this category.'}
      </p>
      <button className="btn btn-primary" onClick={onCreateTemplate}>
        <Icons.Plus />
        Create Template
      </button>
    </div>
  );
}

// Loading Skeleton
function TemplatesLoadingSkeleton() {
  return (
    <div className="templates-grid">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="template-card skeleton">
          <div className="skeleton-badge" />
          <div className="skeleton-title" />
          <div className="skeleton-content" />
          <div className="skeleton-footer" />
        </div>
      ))}
    </div>
  );
}

// Main WhatsAppTemplates Page Component
export default function WhatsAppTemplates() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { templates, loading, error } = useWhatsAppTemplates({
    category: selectedCategory,
    searchQuery
  });

  const { duplicateTemplate, deleteTemplate, loading: actionLoading } = useWhatsAppTemplateActions();

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      await duplicateTemplate(template);
    } catch (err) {
      console.error('Error duplicating template:', err);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTemplate(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>WhatsApp Templates</h1>
          <p>Manage message templates for candidate communication</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={handleCreateTemplate}>
            <Icons.Plus />
            Create Template
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="templates-toolbar">
        <div className="search-input-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="templates-count">
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Category Filter */}
      <CategoryFilter
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* Templates Grid */}
      {loading ? (
        <TemplatesLoadingSkeleton />
      ) : error ? (
        <div className="error-state">
          <p>Error loading templates: {error}</p>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState 
          category={selectedCategory} 
          onCreateTemplate={handleCreateTemplate}
        />
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDuplicate={handleDuplicateTemplate}
              onDelete={setDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          isOpen={showEditor}
          onClose={handleEditorClose}
          template={editingTemplate}
          defaultCategory={selectedCategory !== 'all' ? selectedCategory : undefined}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteTemplate}
          title="Delete Template?"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={actionLoading}
        />
      )}
    </div>
  );
}
