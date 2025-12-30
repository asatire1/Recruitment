import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'

interface Entity {
  id: string
  name: string
  shortCode: string
  isDefault: boolean
  isActive: boolean
}

interface EntityOption {
  value: string
  label: string
}

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const db = getFirebaseDb()

  useEffect(() => {
    async function fetchEntities() {
      try {
        setLoading(true)
        const entitiesRef = collection(db, 'entities')
        const snapshot = await getDocs(entitiesRef)
        
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          shortCode: doc.data().shortCode || '',
          isDefault: doc.data().isDefault || false,
          isActive: doc.data().isActive !== false,
        })) as Entity[]
        
        setEntities(data.filter(e => e.isActive))
      } catch (err) {
        console.error('Error fetching entities:', err)
        setError('Failed to load entities')
      } finally {
        setLoading(false)
      }
    }

    fetchEntities()
  }, [db])

  // Convert entities to options for Select components
  const entityOptions: EntityOption[] = entities.map(e => ({
    value: e.shortCode,
    label: e.name,
  }))

  // Get the default entity shortCode
  const defaultEntity = entities.find(e => e.isDefault)?.shortCode || 'allied'

  return {
    entities,
    entityOptions,
    defaultEntity,
    loading,
    error,
  }
}
