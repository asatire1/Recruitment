// ============================================================================
// Allied Recruitment Portal - Scorecard Templates Settings (R10.3)
// Location: apps/recruitment-portal/src/components/feedback/ScorecardTemplateSettings.tsx
//
// This component allows admins to configure scorecard templates with
// custom criteria per job type.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import type { 
  ScorecardTemplate, 
  FeedbackCriterion,
  CriterionCategory,
  RatingScale,
  FeedbackInterviewType
} from '@allied/shared-lib'
import { 
  DEFAULT_FEEDBACK_CRITERIA,
  CRITERION_CATEGORY_LABELS,
} from '@allied/shared-lib'
import { Card, Button, Spinner } from '@allied/shared-ui'
import { useAuth } from '../../contexts/AuthContext'
import './ScorecardTemplateSettings.css'

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface CriterionFormData {
  name: string
  description: string
  category: CriterionCategory
  ratingScale: RatingScale
  weight: number
  required: boolean
  allowNotes: boolean
  sortOrder: number
}

const EMPTY_CRITERION: CriterionFormData = {
  name: '',
  description: '',
  category: 'general',
  ratingScale: '1-5',
  weight: 100,
  required: false,
  allowNotes: false,
  sortOrder: 99,
}

const CATEGORIES: { value: CriterionCategory; label: string }[] = [
  { value: 'communication', label: 'Communication' },
  { value: 'technical', label: 'Technical Skills' },
  { value: 'experience', label: 'Experience' },
  { value: 'cultural_fit', label: 'Cultural Fit' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'pharmacy_specific', label: 'Pharmacy Knowledge' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'general', label: 'General' },
]

const RATING_SCALES: { value: RatingScale; label: string }[] = [
  { value: '1-5', label: '1-5 Stars' },
  { value: '1-10', label: '1-10 Scale' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'met-not_met', label: 'Met/Not Met' },
]

const INTERVIEW_TYPES: { value: FeedbackInterviewType; label: string }[] = [
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'video_interview', label: 'Video Interview' },
  { value: 'in_person', label: 'In-Person Interview' },
  { value: 'technical', label: 'Technical Interview' },
  { value: 'trial', label: 'Trial Shift' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function ScorecardTemplateSettings() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<ScorecardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCriterionModal, setShowCriterionModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ScorecardTemplate | null>(null)
  const [selectedCriterion, setSelectedCriterion] = useState<FeedbackCriterion | null>(null)
  
  // Form states
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateInterviewTypes, setTemplateInterviewTypes] = useState<FeedbackInterviewType[]>([])
  const [criterionForm, setCriterionForm] = useState<CriterionFormData>(EMPTY_CRITERION)

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const db = getFirebaseDb()
      const templatesQuery = query(collection(db, 'scorecardTemplates'), orderBy('name', 'asc'))
      const snap = await getDocs(templatesQuery)
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ScorecardTemplate[]
      setTemplates(data)
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load scorecard templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  // Template CRUD
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) { setError('Please enter a template name'); return }
    try {
      setSaving(true)
      const db = getFirebaseDb()
      await addDoc(collection(db, 'scorecardTemplates'), {
        name: templateName,
        description: templateDescription,
        interviewTypes: templateInterviewTypes,
        jobCategories: [],
        jobTitleIds: [],
        criteria: DEFAULT_FEEDBACK_CRITERIA.map((c, i) => ({ ...c, id: `crit-${Date.now()}-${i}` })),
        isDefault: templates.length === 0,
        active: true,
        version: 1,
        progressThreshold: 3.5,
        holdThreshold: 2.5,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid,
      })
      setShowTemplateModal(false)
      setTemplateName('')
      setTemplateDescription('')
      setTemplateInterviewTypes([])
      await loadTemplates()
    } catch (err) {
      console.error('Error creating template:', err)
      setError('Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTemplate = async (template: ScorecardTemplate, updates: Partial<ScorecardTemplate>) => {
    try {
      setSaving(true)
      const db = getFirebaseDb()
      await updateDoc(doc(db, 'scorecardTemplates', template.id), {
        ...updates,
        updatedAt: serverTimestamp(),
        version: (template.version || 1) + 1,
      })
      await loadTemplates()
    } catch (err) {
      console.error('Error updating template:', err)
      setError('Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (template: ScorecardTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return
    try {
      setSaving(true)
      const db = getFirebaseDb()
      await deleteDoc(doc(db, 'scorecardTemplates', template.id))
      if (selectedTemplate?.id === template.id) setSelectedTemplate(null)
      await loadTemplates()
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Failed to delete template')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (template: ScorecardTemplate) => {
    try {
      setSaving(true)
      const db = getFirebaseDb()
      for (const t of templates) {
        if (t.isDefault && t.id !== template.id) {
          await updateDoc(doc(db, 'scorecardTemplates', t.id), { isDefault: false, updatedAt: serverTimestamp() })
        }
      }
      await updateDoc(doc(db, 'scorecardTemplates', template.id), { isDefault: true, updatedAt: serverTimestamp() })
      await loadTemplates()
    } catch (err) {
      console.error('Error setting default:', err)
      setError('Failed to set default template')
    } finally {
      setSaving(false)
    }
  }

  // Criterion CRUD
  const handleAddCriterion = () => {
    setCriterionForm({ ...EMPTY_CRITERION, sortOrder: (selectedTemplate?.criteria.length || 0) + 1 })
    setSelectedCriterion(null)
    setShowCriterionModal(true)
  }

  const handleEditCriterion = (criterion: FeedbackCriterion) => {
    setCriterionForm({
      name: criterion.name,
      description: criterion.description || '',
      category: criterion.category,
      ratingScale: criterion.ratingScale,
      weight: criterion.weight,
      required: criterion.required,
      allowNotes: criterion.allowNotes,
      sortOrder: criterion.sortOrder,
    })
    setSelectedCriterion(criterion)
    setShowCriterionModal(true)
  }

  const handleSaveCriterion = async () => {
    if (!selectedTemplate || !criterionForm.name.trim()) return
    try {
      setSaving(true)
      const db = getFirebaseDb()
      let newCriteria: FeedbackCriterion[]
      if (selectedCriterion) {
        newCriteria = selectedTemplate.criteria.map(c => c.id === selectedCriterion.id ? { ...c, ...criterionForm } : c)
      } else {
        const newCriterion: FeedbackCriterion = { id: `crit-${Date.now()}`, ...criterionForm }
        newCriteria = [...selectedTemplate.criteria, newCriterion]
      }
      await updateDoc(doc(db, 'scorecardTemplates', selectedTemplate.id), {
        criteria: newCriteria,
        updatedAt: serverTimestamp(),
        version: (selectedTemplate.version || 1) + 1,
      })
      setShowCriterionModal(false)
      setCriterionForm(EMPTY_CRITERION)
      setSelectedCriterion(null)
      await loadTemplates()
      setSelectedTemplate(prev => prev ? { ...prev, criteria: newCriteria } : null)
    } catch (err) {
      console.error('Error saving criterion:', err)
      setError('Failed to save criterion')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCriterion = async (criterion: FeedbackCriterion) => {
    if (!selectedTemplate) return
    if (!confirm(`Delete "${criterion.name}"?`)) return
    try {
      setSaving(true)
      const db = getFirebaseDb()
      const newCriteria = selectedTemplate.criteria.filter(c => c.id !== criterion.id)
      await updateDoc(doc(db, 'scorecardTemplates', selectedTemplate.id), { criteria: newCriteria, updatedAt: serverTimestamp() })
      await loadTemplates()
      setSelectedTemplate(prev => prev ? { ...prev, criteria: newCriteria } : null)
    } catch (err) {
      console.error('Error deleting criterion:', err)
      setError('Failed to delete criterion')
    } finally {
      setSaving(false)
    }
  }

  const handleReorderCriterion = async (criterion: FeedbackCriterion, direction: 'up' | 'down') => {
    if (!selectedTemplate) return
    const currentIndex = selectedTemplate.criteria.findIndex(c => c.id === criterion.id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= selectedTemplate.criteria.length) return
    try {
      const newCriteria = [...selectedTemplate.criteria]
      const [removed] = newCriteria.splice(currentIndex, 1)
      newCriteria.splice(newIndex, 0, removed)
      newCriteria.forEach((c, i) => { c.sortOrder = i + 1 })
      const db = getFirebaseDb()
      await updateDoc(doc(db, 'scorecardTemplates', selectedTemplate.id), { criteria: newCriteria, updatedAt: serverTimestamp() })
      setSelectedTemplate(prev => prev ? { ...prev, criteria: newCriteria } : null)
      await loadTemplates()
    } catch (err) {
      console.error('Error reordering:', err)
    }
  }

  if (loading) {
    return (
      <div className="scorecard-settings-loading">
        <Spinner size="lg" />
        <p>Loading scorecard templates...</p>
      </div>
    )
  }

  return (
    <div className="scorecard-settings">
      <div className="settings-header">
        <div>
          <h2>Scorecard Templates</h2>
          <p>Configure interview feedback criteria for different job types</p>
        </div>
        <Button variant="primary" onClick={() => setShowTemplateModal(true)}>+ New Template</Button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="settings-layout">
        {/* Templates List */}
        <div className="templates-list">
          <h3>Templates ({templates.length})</h3>
          {templates.length === 0 ? (
            <div className="empty-state"><p>No templates yet. Create one to get started.</p></div>
          ) : (
            <ul>
              {templates.map(template => (
                <li 
                  key={template.id}
                  className={`template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="template-info">
                    <span className="template-name">
                      {template.name}
                      {template.isDefault && <span className="default-badge">Default</span>}
                    </span>
                    <span className="template-meta">{template.criteria.length} criteria • {template.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="template-actions">
                    {!template.isDefault && (
                      <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleSetDefault(template) }} title="Set as default">★</button>
                    )}
                    <button className="action-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template) }} title="Delete">🗑</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Template Editor */}
        <div className="template-editor">
          {selectedTemplate ? (
            <>
              <div className="editor-header">
                <h3>{selectedTemplate.name}</h3>
                <label className="toggle-label">
                  <input type="checkbox" checked={selectedTemplate.active} onChange={(e) => handleUpdateTemplate(selectedTemplate, { active: e.target.checked })} />
                  Active
                </label>
              </div>

              <div className="editor-section">
                <h4>Interview Types</h4>
                <div className="interview-types-grid">
                  {INTERVIEW_TYPES.map(type => (
                    <label key={type.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.interviewTypes?.includes(type.value) || false}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...(selectedTemplate.interviewTypes || []), type.value]
                            : (selectedTemplate.interviewTypes || []).filter(t => t !== type.value)
                          handleUpdateTemplate(selectedTemplate, { interviewTypes: newTypes })
                        }}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="editor-section">
                <h4>Thresholds</h4>
                <div className="thresholds-grid">
                  <div className="threshold-field">
                    <label>Progress (min)</label>
                    <input type="number" min="1" max="5" step="0.5" value={selectedTemplate.progressThreshold || 3.5}
                      onChange={(e) => handleUpdateTemplate(selectedTemplate, { progressThreshold: parseFloat(e.target.value) })} />
                  </div>
                  <div className="threshold-field">
                    <label>Hold (min)</label>
                    <input type="number" min="1" max="5" step="0.5" value={selectedTemplate.holdThreshold || 2.5}
                      onChange={(e) => handleUpdateTemplate(selectedTemplate, { holdThreshold: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="editor-section">
                <div className="section-header">
                  <h4>Criteria ({selectedTemplate.criteria.length})</h4>
                  <Button variant="secondary" size="sm" onClick={handleAddCriterion}>+ Add</Button>
                </div>
                <div className="criteria-list">
                  {selectedTemplate.criteria.sort((a, b) => a.sortOrder - b.sortOrder).map((criterion, index) => (
                    <div key={criterion.id} className="criterion-row">
                      <div className="criterion-order">
                        <button disabled={index === 0} onClick={() => handleReorderCriterion(criterion, 'up')}>↑</button>
                        <button disabled={index === selectedTemplate.criteria.length - 1} onClick={() => handleReorderCriterion(criterion, 'down')}>↓</button>
                      </div>
                      <div className="criterion-info">
                        <span className="criterion-name">{criterion.name}{criterion.required && <span className="required">*</span>}</span>
                        <span className="criterion-meta">{CRITERION_CATEGORY_LABELS[criterion.category]} • Weight: {criterion.weight}</span>
                      </div>
                      <div className="criterion-actions">
                        <button onClick={() => handleEditCriterion(criterion)}>Edit</button>
                        <button className="danger" onClick={() => handleDeleteCriterion(criterion)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection"><p>Select a template to edit</p></div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Scorecard Template</h3>
              <button className="modal-close" onClick={() => setShowTemplateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Template Name *</label>
                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g., Pharmacist Interview" />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="When should this template be used?" rows={3} />
              </div>
              <div className="form-field">
                <label>Interview Types</label>
                <div className="checkbox-grid">
                  {INTERVIEW_TYPES.map(type => (
                    <label key={type.value} className="checkbox-label">
                      <input type="checkbox" checked={templateInterviewTypes.includes(type.value)}
                        onChange={(e) => setTemplateInterviewTypes(prev => e.target.checked ? [...prev, type.value] : prev.filter(t => t !== type.value))} />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateTemplate} disabled={saving}>{saving ? 'Creating...' : 'Create Template'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Criterion Modal */}
      {showCriterionModal && (
        <div className="modal-overlay" onClick={() => setShowCriterionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCriterion ? 'Edit Criterion' : 'Add Criterion'}</h3>
              <button className="modal-close" onClick={() => setShowCriterionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Criterion Name *</label>
                <input type="text" value={criterionForm.name} onChange={(e) => setCriterionForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Communication Skills" />
              </div>
              <div className="form-field">
                <label>Description / Guidance</label>
                <textarea value={criterionForm.description} onChange={(e) => setCriterionForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Instructions for the interviewer..." rows={2} />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Category</label>
                  <select value={criterionForm.category} onChange={(e) => setCriterionForm(prev => ({ ...prev, category: e.target.value as CriterionCategory }))}>
                    {CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Rating Scale</label>
                  <select value={criterionForm.ratingScale} onChange={(e) => setCriterionForm(prev => ({ ...prev, ratingScale: e.target.value as RatingScale }))}>
                    {RATING_SCALES.map(scale => (<option key={scale.value} value={scale.value}>{scale.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Weight (1-100)</label>
                  <input type="number" min="1" max="100" value={criterionForm.weight} onChange={(e) => setCriterionForm(prev => ({ ...prev, weight: parseInt(e.target.value) || 100 }))} />
                </div>
                <div className="form-field checkbox-field">
                  <label className="checkbox-label"><input type="checkbox" checked={criterionForm.required} onChange={(e) => setCriterionForm(prev => ({ ...prev, required: e.target.checked }))} /> Required</label>
                  <label className="checkbox-label"><input type="checkbox" checked={criterionForm.allowNotes} onChange={(e) => setCriterionForm(prev => ({ ...prev, allowNotes: e.target.checked }))} /> Allow Notes</label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowCriterionModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveCriterion} disabled={saving}>{saving ? 'Saving...' : 'Save Criterion'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScorecardTemplateSettings
