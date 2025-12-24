import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardBody, Button, Input } from '../../components/ui';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import './BookingAvailability.css';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const DEFAULT_AVAILABILITY = {
  interview: {
    enabled: true,
    slotDuration: 30, // minutes
    bookingWindow: 14, // days in advance
    days: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] },
    },
    excludedDates: [], // Array of date strings 'YYYY-MM-DD'
  },
  trial: {
    enabled: true,
    slotDuration: 240, // 4 hours
    bookingWindow: 14,
    days: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] },
    },
    excludedDates: [],
  }
};

export default function BookingAvailability() {
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [activeType, setActiveType] = useState('interview'); // 'interview' or 'trial'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newExcludedDate, setNewExcludedDate] = useState('');

  // Load availability from Firestore
  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const docRef = doc(db, 'settings', 'bookingAvailability');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setAvailability({ ...DEFAULT_AVAILABILITY, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'bookingAvailability');
      await setDoc(docRef, availability);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  const currentSettings = availability[activeType];

  const updateSetting = (key, value) => {
    setAvailability(prev => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        [key]: value
      }
    }));
  };

  const updateDay = (dayId, updates) => {
    setAvailability(prev => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        days: {
          ...prev[activeType].days,
          [dayId]: {
            ...prev[activeType].days[dayId],
            ...updates
          }
        }
      }
    }));
  };

  const toggleDay = (dayId) => {
    const day = currentSettings.days[dayId];
    updateDay(dayId, { 
      enabled: !day.enabled,
      slots: !day.enabled ? [{ start: '09:00', end: '17:00' }] : day.slots
    });
  };

  const updateSlot = (dayId, slotIndex, field, value) => {
    const day = currentSettings.days[dayId];
    const newSlots = [...day.slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
    updateDay(dayId, { slots: newSlots });
  };

  const addSlot = (dayId) => {
    const day = currentSettings.days[dayId];
    const lastSlot = day.slots[day.slots.length - 1];
    const newStart = lastSlot ? lastSlot.end : '09:00';
    updateDay(dayId, { 
      slots: [...day.slots, { start: newStart, end: '17:00' }] 
    });
  };

  const removeSlot = (dayId, slotIndex) => {
    const day = currentSettings.days[dayId];
    if (day.slots.length > 1) {
      const newSlots = day.slots.filter((_, i) => i !== slotIndex);
      updateDay(dayId, { slots: newSlots });
    }
  };

  const addExcludedDate = () => {
    if (newExcludedDate && !currentSettings.excludedDates.includes(newExcludedDate)) {
      updateSetting('excludedDates', [...currentSettings.excludedDates, newExcludedDate].sort());
      setNewExcludedDate('');
    }
  };

  const removeExcludedDate = (date) => {
    updateSetting('excludedDates', currentSettings.excludedDates.filter(d => d !== date));
  };

  if (loading) {
    return <div className="loading-spinner">Loading availability settings...</div>;
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2>Booking Availability</h2>
        <p>Configure when candidates can book interviews and trial shifts</p>
      </div>

      {/* Type Tabs */}
      <div className="availability-tabs">
        <button 
          className={`availability-tab ${activeType === 'interview' ? 'active' : ''}`}
          onClick={() => setActiveType('interview')}
        >
          <Calendar size={18} />
          Interviews
        </button>
        <button 
          className={`availability-tab ${activeType === 'trial' ? 'active' : ''}`}
          onClick={() => setActiveType('trial')}
        >
          <Clock size={18} />
          Trial Shifts
        </button>
      </div>

      {/* General Settings */}
      <Card className="availability-card">
        <CardBody>
          <h3>General Settings</h3>
          
          <div className="availability-general">
            <label className="availability-toggle">
              <input 
                type="checkbox" 
                checked={currentSettings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                Enable {activeType === 'interview' ? 'interview' : 'trial shift'} self-booking
              </span>
            </label>

            <div className="availability-options">
              <div className="availability-option">
                <label>Slot Duration</label>
                <select 
                  value={currentSettings.slotDuration}
                  onChange={(e) => updateSetting('slotDuration', parseInt(e.target.value))}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>Full day (8 hours)</option>
                </select>
              </div>

              <div className="availability-option">
                <label>Booking Window</label>
                <select 
                  value={currentSettings.bookingWindow}
                  onChange={(e) => updateSetting('bookingWindow', parseInt(e.target.value))}
                >
                  <option value={7}>1 week ahead</option>
                  <option value={14}>2 weeks ahead</option>
                  <option value={21}>3 weeks ahead</option>
                  <option value={28}>4 weeks ahead</option>
                </select>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Weekly Schedule */}
      <Card className="availability-card">
        <CardBody>
          <h3>Weekly Schedule</h3>
          <p className="availability-hint">Set available hours for each day of the week</p>

          <div className="availability-days">
            {DAYS_OF_WEEK.map((day) => {
              const daySettings = currentSettings.days[day.id];
              return (
                <div key={day.id} className={`availability-day ${daySettings.enabled ? 'enabled' : 'disabled'}`}>
                  <div className="day-header">
                    <label className="day-toggle">
                      <input 
                        type="checkbox" 
                        checked={daySettings.enabled}
                        onChange={() => toggleDay(day.id)}
                      />
                      <span className="toggle-slider small"></span>
                      <span className="day-name">{day.label}</span>
                    </label>
                  </div>

                  {daySettings.enabled && (
                    <div className="day-slots">
                      {daySettings.slots.map((slot, idx) => (
                        <div key={idx} className="time-slot">
                          <input 
                            type="time" 
                            value={slot.start}
                            onChange={(e) => updateSlot(day.id, idx, 'start', e.target.value)}
                          />
                          <span className="slot-separator">to</span>
                          <input 
                            type="time" 
                            value={slot.end}
                            onChange={(e) => updateSlot(day.id, idx, 'end', e.target.value)}
                          />
                          {daySettings.slots.length > 1 && (
                            <button 
                              className="slot-remove"
                              onClick={() => removeSlot(day.id, idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button className="add-slot-btn" onClick={() => addSlot(day.id)}>
                        <Plus size={14} />
                        Add time slot
                      </button>
                    </div>
                  )}

                  {!daySettings.enabled && (
                    <div className="day-unavailable">Unavailable</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Excluded Dates */}
      <Card className="availability-card">
        <CardBody>
          <h3>Excluded Dates</h3>
          <p className="availability-hint">Block specific dates (holidays, etc.) from booking</p>

          <div className="excluded-dates">
            <div className="add-excluded-date">
              <Input
                type="date"
                value={newExcludedDate}
                onChange={(e) => setNewExcludedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Button onClick={addExcludedDate} disabled={!newExcludedDate}>
                <Plus size={16} />
                Add Date
              </Button>
            </div>

            {currentSettings.excludedDates.length > 0 ? (
              <div className="excluded-dates-list">
                {currentSettings.excludedDates.map((date) => (
                  <div key={date} className="excluded-date-item">
                    <span>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}</span>
                    <button onClick={() => removeExcludedDate(date)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-excluded-dates">No dates excluded</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="availability-actions">
        {saved && (
          <span className="save-success">
            <CheckCircle size={16} />
            Settings saved successfully
          </span>
        )}
        <Button onClick={saveAvailability} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Availability Settings'}
        </Button>
      </div>
    </div>
  );
}
