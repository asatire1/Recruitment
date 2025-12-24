import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone } from 'lucide-react';
import { Button, Modal, Input, Select, Textarea } from '../ui';
import { useAuth } from '../../context/AuthContext';
import {
  createInterview,
  updateInterview,
  INTERVIEW_TYPES,
  LOCATION_TYPES,
  DURATION_OPTIONS
} from '../../lib/interviews';
import './ScheduleInterviewModal.css';

/**
 * ScheduleInterviewModal - Schedule interviews or trials for candidates
 */
export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  candidate,
  existingInterview = null,
  onSuccess
}) {
  const { user, userProfile } = useAuth();
  const isEditing = !!existingInterview;

  // Form state
  const [formData, setFormData] = useState({
    type: 'interview',
    date: '',
    time: '',
    duration: 30,
    locationType: 'in_person',
    location: '',
    interviewerName: '',
    interviewerPhone: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (existingInterview) {
      const dateTime = existingInterview.dateTime?.toDate 
        ? existingInterview.dateTime.toDate() 
        : new Date(existingInterview.dateTime);
      
      setFormData({
        type: existingInterview.type || 'interview',
        date: dateTime.toISOString().split('T')[0],
        time: dateTime.toTimeString().slice(0, 5),
        duration: existingInterview.duration || 30,
        locationType: existingInterview.locationType || 'in_person',
        location: existingInterview.location || '',
        interviewerName: existingInterview.interviewerName || '',
        interviewerPhone: existingInterview.interviewerPhone || '',
        notes: existingInterview.notes || ''
      });
    } else {
      // Reset form with defaults
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setFormData({
        type: 'interview',
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
        duration: 30,
        locationType: 'in_person',
        location: '',
        interviewerName: userProfile?.displayName || '',
        interviewerPhone: '',
        notes: ''
      });
    }
    setErrors({});
  }, [existingInterview, isOpen, userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }
    
    if (!formData.time) {
      newErrors.time = 'Time is required';
    }
    
    if (formData.locationType === 'in_person' && !formData.location.trim()) {
      newErrors.location = 'Location is required for in-person meetings';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate() || !candidate) return;

    setIsSubmitting(true);
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      const interviewData = {
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        candidatePhone: candidate.phone,
        candidateEmail: candidate.email,
        jobId: candidate.jobId,
        jobTitle: candidate.jobTitle,
        type: formData.type,
        dateTime,
        duration: parseInt(formData.duration),
        locationType: formData.locationType,
        location: formData.locationType === 'in_person' ? formData.location : formData.locationType,
        interviewerName: formData.interviewerName,
        interviewerPhone: formData.interviewerPhone,
        notes: formData.notes
      };

      if (isEditing) {
        await updateInterview(existingInterview.id, interviewData, user.uid, userProfile?.displayName);
      } else {
        await createInterview(interviewData, user.uid, userProfile?.displayName);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error scheduling interview:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!candidate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Interview' : 'Schedule Interview'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            {isEditing ? 'Update Interview' : 'Schedule Interview'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="schedule-form">
        {/* Candidate Info */}
        <div className="schedule-candidate-info">
          <div className="schedule-candidate-avatar">
            {candidate.firstName?.[0]}{candidate.lastName?.[0]}
          </div>
          <div className="schedule-candidate-details">
            <span className="schedule-candidate-name">
              {candidate.firstName} {candidate.lastName}
            </span>
            <span className="schedule-candidate-job">
              {candidate.jobTitle || 'No position assigned'}
            </span>
          </div>
        </div>

        {/* Type Selection */}
        <div className="schedule-form-row">
          <Select
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={INTERVIEW_TYPES}
          />
        </div>

        {/* Date & Time */}
        <div className="schedule-form-row schedule-form-row-2col">
          <div className="schedule-field">
            <label className="schedule-label">
              <Calendar size={16} />
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`schedule-input ${errors.date ? 'schedule-input-error' : ''}`}
            />
            {errors.date && <span className="schedule-error">{errors.date}</span>}
          </div>
          
          <div className="schedule-field">
            <label className="schedule-label">
              <Clock size={16} />
              Time
            </label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className={`schedule-input ${errors.time ? 'schedule-input-error' : ''}`}
            />
            {errors.time && <span className="schedule-error">{errors.time}</span>}
          </div>
        </div>

        {/* Duration */}
        <div className="schedule-form-row">
          <Select
            label="Duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            options={DURATION_OPTIONS}
          />
        </div>

        {/* Location */}
        <div className="schedule-form-row">
          <Select
            label="Location Type"
            name="locationType"
            value={formData.locationType}
            onChange={handleChange}
            options={LOCATION_TYPES}
          />
        </div>

        {formData.locationType === 'in_person' && (
          <div className="schedule-form-row">
            <Input
              label="Address"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., 123 High Street, Manchester M1 1AA"
              leftIcon={<MapPin size={16} />}
              error={errors.location}
            />
          </div>
        )}

        {/* Interviewer Details */}
        <div className="schedule-section-title">Interviewer Details (Optional)</div>
        
        <div className="schedule-form-row schedule-form-row-2col">
          <Input
            label="Interviewer Name"
            name="interviewerName"
            value={formData.interviewerName}
            onChange={handleChange}
            placeholder="Who will conduct the interview?"
            leftIcon={<User size={16} />}
          />
          
          <Input
            label="Interviewer Phone"
            name="interviewerPhone"
            value={formData.interviewerPhone}
            onChange={handleChange}
            placeholder="Contact number"
            leftIcon={<Phone size={16} />}
          />
        </div>

        {/* Notes */}
        <div className="schedule-form-row">
          <Textarea
            label="Notes (Optional)"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any special instructions or notes..."
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}
