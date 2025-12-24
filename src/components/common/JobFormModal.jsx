import { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, Modal } from '../ui';
import { JOB_CATEGORIES, CONTRACT_TYPES } from '../../lib/jobs';
import './JobFormModal.css';

/**
 * JobFormModal - Modal for creating and editing job listings
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {function} props.onSubmit
 * @param {Object} props.job - Existing job for editing (null for create)
 * @param {boolean} props.loading
 */
export default function JobFormModal({
  isOpen,
  onClose,
  onSubmit,
  job = null,
  loading = false
}) {
  const isEditing = !!job;
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    description: '',
    contractType: 'full_time',
    salary: '',
    hoursPerWeek: ''
  });
  
  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        category: job.category || '',
        location: job.location || '',
        description: job.description || '',
        contractType: job.contractType || 'full_time',
        salary: job.salary || '',
        hoursPerWeek: job.hoursPerWeek?.toString() || ''
      });
    } else {
      // Reset form for new job
      setFormData({
        title: '',
        category: '',
        location: '',
        description: '',
        contractType: 'full_time',
        salary: '',
        hoursPerWeek: ''
      });
    }
    setErrors({});
  }, [job, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (formData.hoursPerWeek && isNaN(Number(formData.hoursPerWeek))) {
      newErrors.hoursPerWeek = 'Must be a valid number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const submitData = {
      ...formData,
      hoursPerWeek: formData.hoursPerWeek ? Number(formData.hoursPerWeek) : null
    };
    
    await onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({
      title: '',
      category: '',
      location: '',
      description: '',
      contractType: 'full_time',
      salary: '',
      hoursPerWeek: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Job Listing' : 'Create New Job Listing'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Job'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="job-form">
        <div className="job-form-row">
          <Input
            label="Job Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Dispenser, Pharmacist"
            error={errors.title}
            required
          />
        </div>

        <div className="job-form-row job-form-row-2col">
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            options={JOB_CATEGORIES}
            placeholder="Select category"
            error={errors.category}
            required
          />
          
          <Select
            label="Contract Type"
            name="contractType"
            value={formData.contractType}
            onChange={handleChange}
            options={CONTRACT_TYPES}
          />
        </div>

        <div className="job-form-row">
          <Input
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Manchester City Centre, Bolton"
            error={errors.location}
            required
          />
        </div>

        <div className="job-form-row job-form-row-2col">
          <Input
            label="Salary (optional)"
            name="salary"
            value={formData.salary}
            onChange={handleChange}
            placeholder="e.g., £12-14/hour, £25,000-30,000"
          />
          
          <Input
            label="Hours per Week (optional)"
            name="hoursPerWeek"
            type="number"
            value={formData.hoursPerWeek}
            onChange={handleChange}
            placeholder="e.g., 40"
            error={errors.hoursPerWeek}
          />
        </div>

        <div className="job-form-row">
          <Textarea
            label="Job Description (optional)"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the role, responsibilities, and requirements..."
            rows={5}
          />
        </div>
      </form>
    </Modal>
  );
}
