// ============================================================================
// Locations Tab - Extracted from Settings.tsx
// Manage pharmacy branch locations for candidate assignments
// ============================================================================

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import { Card, Button, Input, Spinner, Modal, Select } from '@allied/shared-ui'

// ============================================================================
// TYPES
// ============================================================================

interface Location {
  id: string
  name: string
  address?: string
  city?: string
  postcode?: string
  region?: string
  isActive: boolean
  createdAt: any
  createdBy: string
}

interface LocationsTabProps {
  userId?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const UK_REGIONS = [
  'London',
  'South East',
  'South West',
  'East of England',
  'West Midlands',
  'East Midlands',
  'Yorkshire',
  'North West',
  'North East',
  'Wales',
  'Scotland',
  'Northern Ireland',
]

// ============================================================================
// COMPONENT
// ============================================================================

export function LocationsTab({ userId }: LocationsTabProps) {
  const db = getFirebaseDb()

  // State
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [form, setForm] = useState({ name: '', address: '', city: '', postcode: '', region: '' })
  const [formError, setFormError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [search, setSearch] = useState('')

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  useEffect(() => {
    async function fetchLocations() {
      try {
        setLoading(true)
        const locationsRef = collection(db, 'locations')
        const snapshot = await getDocs(locationsRef)
        
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Location[]
        
        data.sort((a, b) => a.name.localeCompare(b.name))
        setLocations(data)
      } catch (err) {
        console.error('Error fetching locations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [db])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAdd = () => {
    setEditingLocation(null)
    setForm({ name: '', address: '', city: '', postcode: '', region: '' })
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setForm({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      postcode: location.postcode || '',
      region: location.region || ''
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Location name is required')
      return
    }

    // Check for duplicates
    const duplicate = locations.find(
      loc => loc.name.toLowerCase() === form.name.trim().toLowerCase() &&
             loc.id !== editingLocation?.id
    )
    if (duplicate) {
      setFormError('A location with this name already exists')
      return
    }

    try {
      setSaving(true)
      const locationsRef = collection(db, 'locations')

      if (editingLocation) {
        await updateDoc(doc(db, 'locations', editingLocation.id), {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postcode: form.postcode.trim().toUpperCase(),
          region: form.region,
          updatedAt: serverTimestamp(),
        })
        setLocations(prev => prev.map(loc =>
          loc.id === editingLocation.id
            ? {
                ...loc,
                name: form.name.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                postcode: form.postcode.trim().toUpperCase(),
                region: form.region
              }
            : loc
        ))
      } else {
        const docRef = await addDoc(locationsRef, {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postcode: form.postcode.trim().toUpperCase(),
          region: form.region,
          isActive: true,
          createdAt: serverTimestamp(),
          createdBy: userId || 'system',
        })
        setLocations(prev => [...prev, {
          id: docRef.id,
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postcode: form.postcode.trim().toUpperCase(),
          region: form.region,
          isActive: true,
          createdAt: new Date(),
          createdBy: userId || 'system',
        }].sort((a, b) => a.name.localeCompare(b.name)))
      }

      setShowModal(false)
    } catch (err) {
      console.error('Error saving location:', err)
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (location: Location) => {
    try {
      await updateDoc(doc(db, 'locations', location.id), {
        isActive: !location.isActive,
        updatedAt: serverTimestamp(),
      })
      setLocations(prev => prev.map(loc =>
        loc.id === location.id ? { ...loc, isActive: !loc.isActive } : loc
      ))
    } catch (err) {
      console.error('Error toggling location:', err)
    }
  }

  const handleConfirmDelete = (location: Location) => {
    setDeletingLocation(location)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deletingLocation) return

    try {
      setDeletingLoading(true)
      await deleteDoc(doc(db, 'locations', deletingLocation.id))
      setLocations(prev => prev.filter(loc => loc.id !== deletingLocation.id))
      setShowDeleteModal(false)
      setDeletingLocation(null)
    } catch (err) {
      console.error('Error deleting location:', err)
    } finally {
      setDeletingLoading(false)
    }
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredLocations = locations.filter(loc => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return loc.name.toLowerCase().includes(searchLower) ||
           loc.city?.toLowerCase().includes(searchLower) ||
           loc.postcode?.toLowerCase().includes(searchLower) ||
           loc.region?.toLowerCase().includes(searchLower)
  })

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2>Locations</h2>
            <p>Manage pharmacy branch locations for candidate assignments</p>
          </div>
          <Button variant="primary" onClick={handleAdd}>
            + Add Location
          </Button>
        </div>

        {loading ? (
          <div className="settings-loading">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Search */}
            {locations.length > 5 && (
              <div className="locations-search">
                <Input
                  placeholder="Search locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {/* Locations list */}
            <div className="locations-list">
              {filteredLocations.length === 0 ? (
                <Card className="empty-locations">
                  <p>{locations.length === 0 ? 'No locations added yet. Add your first location.' : 'No locations match your search.'}</p>
                </Card>
              ) : (
                filteredLocations.map(location => (
                  <Card key={location.id} className={`location-card ${!location.isActive ? 'inactive' : ''}`}>
                    <div className="location-info">
                      <div className="location-name">
                        <span className="location-icon">📍</span>
                        {location.name}
                        {!location.isActive && <span className="inactive-badge">Inactive</span>}
                      </div>
                      {(location.address || location.city || location.postcode) && (
                        <div className="location-address">
                          {[location.address, location.city, location.postcode].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {location.region && (
                        <div className="location-region">{location.region}</div>
                      )}
                    </div>
                    <div className="location-actions">
                      <button
                        className={`toggle-btn ${location.isActive ? 'active' : ''}`}
                        onClick={() => handleToggleActive(location)}
                        title={location.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {location.isActive ? '✓' : '○'}
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(location)}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleConfirmDelete(location)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Summary */}
            {locations.length > 0 && (
              <div className="locations-summary">
                {locations.length} location{locations.length !== 1 ? 's' : ''} • {locations.filter(l => l.isActive).length} active
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
        size="md"
      >
        <div className="location-form">
          <div className="form-group">
            <label>Location Name *</label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm(prev => ({ ...prev, name: e.target.value }))
                setFormError('')
              }}
              placeholder="e.g., Allied Pharmacy Croydon"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <Input
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g., 123 High Street"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <Input
                value={form.city}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Croydon"
              />
            </div>
            <div className="form-group">
              <label>Postcode</label>
              <Input
                value={form.postcode}
                onChange={(e) => setForm(prev => ({ ...prev, postcode: e.target.value }))}
                placeholder="e.g., CR0 1AB"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Region</label>
            <Select
              value={form.region}
              onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
              options={[
                { value: '', label: 'Select region...' },
                ...UK_REGIONS.map(r => ({ value: r, label: r }))
              ]}
            />
          </div>

          {formError && (
            <p className="form-error">{formError}</p>
          )}

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingLocation ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Location Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Location"
        size="sm"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>"{deletingLocation?.name}"</strong>?</p>
          <p className="delete-warning">
            This action cannot be undone. Existing candidates assigned to this location will not be affected.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deletingLoading}
            >
              {deletingLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
