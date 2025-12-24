import { useEffect } from 'react';
import { Button, Input, Select, Textarea, Modal } from '../ui';
import { useFormValidation, validators } from '../../hooks/useFormValidation';
import { JOB_CATEGORIES, CONTRACT_TYPES } from '../../lib/jobs';
import './JobFormModal.css';

/**
 * Validation schema for job form
 */
const validationSchema = {
  title: [validators.required, validators.minLength(3)],
  category: [validators.required],
  location: [validators.required],
  hoursPerWeek: [validators.number]
};

const fieldNames = {
  title: 'Job title',
  category: 'Category',
  location: 'Location',
  hoursPerWeek: 'Hours per week'
};

/**
 * JobFormModal - Modal for creating and editing job listings
 * Now with real-time validation
 */
export default function JobFormModal({
  isOpen,
  onClose,
  onSubmit,
  job = null,
  loading = false
}) {
  const isEditing = !!job;
  
  // Get initial values
  const getInitialValues = () => ({
    title: job?.title || '',
    category: job?.category || '',
    location: job?.location || '',
    description: job?.description || '',
    contractType: job?.contractType || 'full_time',
    salary: job?.salary || '',
    hoursPerWeek: job?.hoursPerWeek?.toString() || ''
  });

  // Form validation hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    resetForm,
    getFieldError
  } = useFormValidation(
    getInitialValues(),
    validationSchema,
    { 
      debounceMs: 300,
      validateOnChange: true,
      validateOnBlur: true,
      fieldNames
    }
  );

  // Reset form when job changes or modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm(getInitialValues());
    }
  }, [isOpen, job?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const submitData = {
      ...values,
      hoursPerWeek: values.hoursPerWeek ? Number(values.hoursPerWeek) : null
    };
    
    await onSubmit(submitData);
  };

  const handleClose = () => {
    resetForm(getInitialValues());
    onClose();
  };

  // Check if a field is valid (touched, has value, no error)
  const isFieldValid = (name) => {
    return touched[name] && values[name] && !errors[name];
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
            value={values.title}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g., Dispenser, Pharmacist"
            error={getFieldError('title')}
            success={isFieldValid('title')}
            required
          />
        </div>

        <div className="job-form-row job-form-row-2col">
          <Select
            label="Category"
            name="category"
            value={values.category}
            onChange={handleChange}
            options={JOB_CATEGORIES}
            placeholder="Select category"
            error={getFieldError('category')}
            required
          />
          
          <Select
            label="Contract Type"
            name="contractType"
            value={values.contractType}
            onChange={handleChange}
            options={CONTRACT_TYPES}
          />
        </div>

        <div className="job-form-row">
          <Input
            label="Location"
            name="location"
            value={values.location}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g., Manchester City Centre, Bolton"
            error={getFieldError('location')}
            success={isFieldValid('location')}
            required
          />
        </div>

        <div className="job-form-row job-form-row-2col">
          <Input
            label="Salary"
            name="salary"
            value={values.salary}
            onChange={handleChange}
            placeholder="e.g., £12-14/hour, £25,000-30,000"
            hint="Optional"
          />
          
          <Input
            label="Hours per Week"
            name="hoursPerWeek"
            type="number"
            value={values.hoursPerWeek}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g., 40"
            error={getFieldError('hoursPerWeek')}
            hint={!touched.hoursPerWeek ? "Optional" : undefined}
          />
        </div>

        <div className="job-form-row">
          <Textarea
            label="Job Description"
            name="description"
            value={values.description}
            onChange={handleChange}
            placeholder="Describe the role, responsibilities, and requirements..."
            rows={5}
            hint="Optional"
          />
        </div>
      </form>
    </Modal>
  );
}
