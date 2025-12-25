import React, { useState, useEffect } from 'react';
import { useJobActions, JOB_TYPES, EMPLOYMENT_TYPES, JOB_STATUSES } from '../hooks/useJobs';
import './AddJobModal.css';

// Icons
const Icons = {
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
};

// Entity options (could be fetched from Firestore in production)
const ENTITIES = [
  { value: 'allied', label: 'Allied Pharmacies' },
  { value: 'sharief', label: 'Sharief Healthcare' },
  { value: 'core', label: 'Core Pharmaceuticals' }
];

// Input Component
function FormInput({ label, error, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className={`form-input ${error ? 'error' : ''}`} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// Select Component
function FormSelect({ label, options, error, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className={`form-select ${error ? 'error' : ''}`} {...props}>
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// Textarea Component
function FormTextarea({ label, error, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea className={`form-textarea ${error ? 'error' : ''}`} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// Main AddJobModal Component
export default function AddJobModal({ isOpen, onClose, onSuccess, editJob = null }) {
  const { createJob, updateJob, loading, error: actionError } = useJobActions();
  
  const [formData, setFormData] = useState({
    title: '',
    jobType: '',
    employmentType: '',
    location: '',
    entityId: '',
    entityName: '',
    branchId: '',
    branchName: '',
    description: '',
    requirements: '',
    salaryMin: '',
    salaryMax: '',
    salaryPeriod: 'year',
    status: JOB_STATUSES.DRAFT
  });
  
  const [errors, setErrors] = useState({});

  // Populate form if editing
  useEffect(() => {
    if (editJob) {
      setFormData({
        title: editJob.title || '',
        jobType: editJob.jobType || '',
        employmentType: editJob.employmentType || '',
        location: editJob.location || '',
        entityId: editJob.entityId || '',
        entityName: editJob.entityName || '',
        branchId: editJob.branchId || '',
        branchName: editJob.branchName || '',
        description: editJob.description || '',
        requirements: editJob.requirements?.join('\n') || '',
        salaryMin: editJob.salaryMin || '',
        salaryMax: editJob.salaryMax || '',
        salaryPeriod: editJob.salaryPeriod || 'year',
        status: editJob.status || JOB_STATUSES.DRAFT
      });
    }
  }, [editJob]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Update entity name when entity changes
    if (name === 'entityId') {
      const entity = ENTITIES.find(e => e.value === value);
      setFormData(prev => ({ ...prev, entityName: entity?.label || '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    
    if (!formData.jobType) {
      newErrors.jobType = 'Please select a job type';
    }
    
    if (!formData.employmentType) {
      newErrors.employmentType = 'Please select employment type';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (formData.salaryMin && formData.salaryMax) {
      if (Number(formData.salaryMin) > Number(formData.salaryMax)) {
        newErrors.salaryMin = 'Minimum salary cannot exceed maximum';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      const jobData = {
        ...formData,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
        requirements: formData.requirements
          .split('\n')
          .map(r => r.trim())
          .filter(r => r.length > 0)
      };
      
      if (editJob) {
        await updateJob(editJob.id, jobData);
      } else {
        const jobId = await createJob(jobData);
        onSuccess?.(jobId);
        return;
      }
      
      onSuccess?.();
    } catch (err) {
      console.error('Error saving job:', err);
    }
  };

  const handleSaveAsDraft = async () => {
    setFormData(prev => ({ ...prev, status: JOB_STATUSES.DRAFT }));
    await handleSubmit(new Event('submit'));
  };

  const handlePublish = async () => {
    setFormData(prev => ({ ...prev, status: JOB_STATUSES.ACTIVE }));
    await handleSubmit(new Event('submit'));
  };

  // Flatten job types for select
  const jobTypeOptions = Object.entries(JOB_TYPES).flatMap(([category, types]) => 
    types.map(type => ({
      value: type.value,
      label: `${type.label} (${category})`
    }))
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon">
              <Icons.Briefcase />
            </div>
            <div>
              <h2 className="modal-title">
                {editJob ? 'Edit Job' : 'Create New Job'}
              </h2>
              <p className="modal-subtitle">
                {editJob 
                  ? 'Update the job posting details' 
                  : 'Add a new job posting to start receiving candidates'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {actionError && (
              <div className="form-error-banner">
                {actionError}
              </div>
            )}

            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              
              <FormInput
                label="Job Title *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Pharmacist, Dispenser, Counter Assistant"
                error={errors.title}
              />

              <div className="form-row">
                <FormSelect
                  label="Job Type *"
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  options={jobTypeOptions}
                  error={errors.jobType}
                />
                
                <FormSelect
                  label="Employment Type *"
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  options={EMPLOYMENT_TYPES}
                  error={errors.employmentType}
                />
              </div>

              <FormInput
                label="Location *"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Manchester, Multiple Locations"
                error={errors.location}
              />
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Organisation</h3>
              
              <div className="form-row">
                <FormSelect
                  label="Entity"
                  name="entityId"
                  value={formData.entityId}
                  onChange={handleChange}
                  options={ENTITIES}
                />
                
                <FormInput
                  label="Branch Name"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  placeholder="e.g. Manchester Central"
                />
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Salary (Optional)</h3>
              
              <div className="form-row three-col">
                <FormInput
                  label="Minimum (£)"
                  name="salaryMin"
                  type="number"
                  value={formData.salaryMin}
                  onChange={handleChange}
                  placeholder="e.g. 25000"
                  error={errors.salaryMin}
                />
                
                <FormInput
                  label="Maximum (£)"
                  name="salaryMax"
                  type="number"
                  value={formData.salaryMax}
                  onChange={handleChange}
                  placeholder="e.g. 35000"
                />
                
                <FormSelect
                  label="Period"
                  name="salaryPeriod"
                  value={formData.salaryPeriod}
                  onChange={handleChange}
                  options={[
                    { value: 'year', label: 'Per Year' },
                    { value: 'month', label: 'Per Month' },
                    { value: 'hour', label: 'Per Hour' }
                  ]}
                />
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Job Details</h3>
              
              <FormTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
                rows={5}
              />
              
              <FormTextarea
                label="Requirements (one per line)"
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                placeholder="GPhC Registration&#10;Minimum 2 years experience&#10;Excellent communication skills"
                rows={4}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            
            <div className="modal-footer-right">
              {!editJob && (
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveAsDraft}
                  disabled={loading}
                >
                  Save as Draft
                </button>
              )}
              
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  'Saving...'
                ) : editJob ? (
                  <>
                    <Icons.Check />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Icons.Check />
                    Publish Job
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
