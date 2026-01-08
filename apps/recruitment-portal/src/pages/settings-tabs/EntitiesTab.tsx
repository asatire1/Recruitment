// ============================================================================
// Entities Tab - Extracted from Settings.tsx
// Location: apps/recruitment-portal/src/pages/settings-tabs/EntitiesTab.tsx
// ============================================================================

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import { Card, Button, Input, Spinner, Modal } from '@allied/shared-ui'

// ============================================================================
// TYPES
// ============================================================================

interface Entity {
  id: string
  name: string
  shortCode: string  // e.g., 'allied', 'sharief', 'core'
  isDefault: boolean
  isActive: boolean
  createdAt: any
  updatedAt?: any
  createdBy: string
}

interface EntitiesTabProps {
  userId?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ENTITIES = [
  { name: 'Allied Pharmacies', shortCode: 'allied', isDefault: true },
  { name: 'Sharief Healthcare', shortCode: 'sharief', isDefault: false },
  { name: 'Core Pharmaceuticals', shortCode: 'core', isDefault: false },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function EntitiesTab({ userId }: EntitiesTabProps) {
  const db = getFirebaseDb()

  // State
  const [entities, setEntities] = useState<Entity[]>([])
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [savingEntity, setSavingEntity] = useState(false)
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [entityForm, setEntityForm] = useState({ name: '', shortCode: '', isDefault: false })
  const [entityFormError, setEntityFormError] = useState('')
  const [showDeleteEntityModal, setShowDeleteEntityModal] = useState(false)
  const [deletingEntity, setDeletingEntity] = useState<Entity | null>(null)
  const [deletingEntityLoading, setDeletingEntityLoading] = useState(false)

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    async function fetchEntities() {
      try {
        setLoadingEntities(true)
        const entitiesRef = collection(db, 'entities')
        const snapshot = await getDocs(entitiesRef)
        
        if (snapshot.empty) {
          console.log('No entities found, initializing defaults...')
          await initializeDefaultEntities()
        } else {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Entity[]
          data.sort((a, b) => {
            // Default entity first, then alphabetical
            if (a.isDefault && !b.isDefault) return -1
            if (!a.isDefault && b.isDefault) return 1
            return a.name.localeCompare(b.name)
          })
          setEntities(data)
        }
      } catch (err) {
        console.error('Error fetching entities:', err)
      } finally {
        setLoadingEntities(false)
      }
    }

    fetchEntities()
  }, [db])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Initialize default entities
  const initializeDefaultEntities = async () => {
    try {
      const entitiesRef = collection(db, 'entities')
      const newEntities: Entity[] = []

      for (const defaultEntity of DEFAULT_ENTITIES) {
        const docRef = await addDoc(entitiesRef, {
          name: defaultEntity.name,
          shortCode: defaultEntity.shortCode,
          isDefault: defaultEntity.isDefault,
          isActive: true,
          createdAt: serverTimestamp(),
          createdBy: userId || 'system',
        })
        newEntities.push({
          id: docRef.id,
          name: defaultEntity.name,
          shortCode: defaultEntity.shortCode,
          isDefault: defaultEntity.isDefault,
          isActive: true,
          createdAt: new Date(),
          createdBy: userId || 'system',
        })
      }

      setEntities(newEntities)
    } catch (err) {
      console.error('Error initializing default entities:', err)
    }
  }

  const handleSaveEntity = async () => {
    if (!entityForm.name.trim()) {
      setEntityFormError('Entity name is required')
      return
    }
    if (!entityForm.shortCode.trim()) {
      setEntityFormError('Short code is required')
      return
    }

    // Check for duplicate short codes
    const isDuplicate = entities.some(e =>
      e.shortCode.toLowerCase() === entityForm.shortCode.toLowerCase() &&
      e.id !== editingEntity?.id
    )
    if (isDuplicate) {
      setEntityFormError('An entity with this short code already exists')
      return
    }

    setSavingEntity(true)
    setEntityFormError('')

    try {
      const entitiesRef = collection(db, 'entities')

      if (editingEntity) {
        // Update existing
        const docRef = doc(db, 'entities', editingEntity.id)
        
        // If setting as default, unset other defaults first
        if (entityForm.isDefault && !editingEntity.isDefault) {
          for (const entity of entities) {
            if (entity.isDefault) {
              await updateDoc(doc(db, 'entities', entity.id), { isDefault: false })
            }
          }
        }

        await updateDoc(docRef, {
          name: entityForm.name.trim(),
          shortCode: entityForm.shortCode.toLowerCase().trim(),
          isDefault: entityForm.isDefault,
          updatedAt: serverTimestamp(),
        })

        setEntities(prev => prev.map(e =>
          e.id === editingEntity.id
            ? { ...e, name: entityForm.name.trim(), shortCode: entityForm.shortCode.toLowerCase().trim(), isDefault: entityForm.isDefault }
            : entityForm.isDefault ? { ...e, isDefault: false } : e
        ))
      } else {
        // Add new
        // If setting as default, unset other defaults first
        if (entityForm.isDefault) {
          for (const entity of entities) {
            if (entity.isDefault) {
              await updateDoc(doc(db, 'entities', entity.id), { isDefault: false })
            }
          }
        }

        const docRef = await addDoc(entitiesRef, {
          name: entityForm.name.trim(),
          shortCode: entityForm.shortCode.toLowerCase().trim(),
          isDefault: entityForm.isDefault,
          isActive: true,
          createdAt: serverTimestamp(),
          createdBy: userId || 'system',
        })

        const newEntity: Entity = {
          id: docRef.id,
          name: entityForm.name.trim(),
          shortCode: entityForm.shortCode.toLowerCase().trim(),
          isDefault: entityForm.isDefault,
          isActive: true,
          createdAt: new Date(),
          createdBy: userId || 'system',
        }

        setEntities(prev => {
          const updated = entityForm.isDefault
            ? prev.map(e => ({ ...e, isDefault: false }))
            : prev
          return [...updated, newEntity].sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1
            if (!a.isDefault && b.isDefault) return 1
            return a.name.localeCompare(b.name)
          })
        })
      }

      setShowEntityModal(false)
      setEditingEntity(null)
      setEntityForm({ name: '', shortCode: '', isDefault: false })
    } catch (err) {
      console.error('Error saving entity:', err)
      setEntityFormError('Failed to save entity')
    } finally {
      setSavingEntity(false)
    }
  }

  const handleDeleteEntity = async () => {
    if (!deletingEntity) return

    // Don't allow deleting the default entity
    if (deletingEntity.isDefault) {
      setEntityFormError('Cannot delete the default entity. Set another entity as default first.')
      return
    }

    setDeletingEntityLoading(true)

    try {
      await deleteDoc(doc(db, 'entities', deletingEntity.id))
      setEntities(prev => prev.filter(e => e.id !== deletingEntity.id))
      setShowDeleteEntityModal(false)
      setDeletingEntity(null)
    } catch (err) {
      console.error('Error deleting entity:', err)
    } finally {
      setDeletingEntityLoading(false)
    }
  }

  const handleToggleEntityActive = async (entity: Entity) => {
    // Don't allow deactivating the default entity
    if (entity.isDefault && entity.isActive) {
      return
    }

    try {
      const docRef = doc(db, 'entities', entity.id)
      await updateDoc(docRef, { isActive: !entity.isActive })
      setEntities(prev => prev.map(e =>
        e.id === entity.id ? { ...e, isActive: !e.isActive } : e
      ))
    } catch (err) {
      console.error('Error toggling entity:', err)
    }
  }

  const handleAddEntity = () => {
    setEditingEntity(null)
    setEntityForm({ name: '', shortCode: '', isDefault: false })
    setEntityFormError('')
    setShowEntityModal(true)
  }

  const handleEditEntity = (entity: Entity) => {
    setEditingEntity(entity)
    setEntityForm({
      name: entity.name,
      shortCode: entity.shortCode,
      isDefault: entity.isDefault
    })
    setEntityFormError('')
    setShowEntityModal(true)
  }

  const handleConfirmDelete = (entity: Entity) => {
    setDeletingEntity(entity)
    setShowDeleteEntityModal(true)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2>Entities</h2>
            <p>Manage the business entities/companies in your organization</p>
          </div>
          <Button variant="primary" onClick={handleAddEntity}>
            + Add Entity
          </Button>
        </div>

        {loadingEntities ? (
          <div className="settings-loading">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="entities-list">
            {entities.length === 0 ? (
              <Card className="empty-state-card">
                <p>No entities configured. Add your first entity to get started.</p>
              </Card>
            ) : (
              <Card>
                <table className="entities-table">
                  <thead>
                    <tr>
                      <th>Entity Name</th>
                      <th>Short Code</th>
                      <th>Status</th>
                      <th>Default</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map(entity => (
                      <tr key={entity.id} className={!entity.isActive ? 'inactive' : ''}>
                        <td className="entity-name">
                          <span className="entity-icon">🏢</span>
                          {entity.name}
                        </td>
                        <td>
                          <code className="entity-code">{entity.shortCode}</code>
                        </td>
                        <td>
                          <span className={`status-badge ${entity.isActive ? 'active' : 'inactive'}`}>
                            {entity.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {entity.isDefault && (
                            <span className="default-badge">✓ Default</span>
                          )}
                        </td>
                        <td className="entity-actions">
                          <button
                            className={`toggle-btn ${entity.isActive ? 'active' : ''}`}
                            onClick={() => handleToggleEntityActive(entity)}
                            title={entity.isActive ? 'Deactivate' : 'Activate'}
                            disabled={entity.isDefault && entity.isActive}
                          >
                            {entity.isActive ? '✓' : '○'}
                          </button>
                          <button
                            className="edit-btn"
                            onClick={() => handleEditEntity(entity)}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleConfirmDelete(entity)}
                            title="Delete"
                            disabled={entity.isDefault}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Entity Modal */}
      <Modal
        isOpen={showEntityModal}
        onClose={() => setShowEntityModal(false)}
        title={editingEntity ? 'Edit Entity' : 'Add Entity'}
        size="sm"
      >
        <div className="entity-form">
          <div className="form-group">
            <label>Entity Name *</label>
            <Input
              value={entityForm.name}
              onChange={(e) => {
                setEntityForm(prev => ({ ...prev, name: e.target.value }))
                setEntityFormError('')
              }}
              placeholder="e.g., Allied Pharmacies"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Short Code *</label>
            <Input
              value={entityForm.shortCode}
              onChange={(e) => {
                setEntityForm(prev => ({ ...prev, shortCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
                setEntityFormError('')
              }}
              placeholder="e.g., allied"
            />
            <p className="form-hint">Used internally for identification. Lowercase letters, numbers, and hyphens only.</p>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={entityForm.isDefault}
                onChange={(e) => setEntityForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              />
              <span>Set as default entity</span>
            </label>
            <p className="form-hint">The default entity will be pre-selected when creating jobs and candidates.</p>
          </div>

          {entityFormError && (
            <p className="form-error">{entityFormError}</p>
          )}

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowEntityModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEntity} disabled={savingEntity}>
              {savingEntity ? 'Saving...' : editingEntity ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Entity Modal */}
      <Modal
        isOpen={showDeleteEntityModal}
        onClose={() => setShowDeleteEntityModal(false)}
        title="Delete Entity"
        size="sm"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>{deletingEntity?.name}</strong>?</p>
          <p className="warning-text">This action cannot be undone. Jobs and candidates associated with this entity will need to be reassigned.</p>
          
          {deletingEntity?.isDefault && (
            <p className="error-text">Cannot delete the default entity. Set another entity as default first.</p>
          )}

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowDeleteEntityModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteEntity}
              disabled={deletingEntityLoading || deletingEntity?.isDefault}
            >
              {deletingEntityLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default EntitiesTab
