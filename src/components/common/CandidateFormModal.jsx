import { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, Modal, FileUpload } from '../ui';
import { useFormValidation, validators } from '../../hooks/useFormValidation';
import { CANDIDATE_SOURCES } from '../../lib/candidates';
import { getJobs } from '../../lib/jobs';
import './CandidateFormModal.css';

/**
 * Validation schema for candidate form
 */
const validationSchema = {
  firstName: [validators.required],
  lastName: [validators.required],
  email: [validators.required, validators.email],
  phone: [validators.required, validators.phone],
  postcode: [validators.postcode]
};

const fieldNames = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone number',
  postcode: 'Postcode'
};

/**
 * CandidateFormModal - Modal for creating and editing candidates
 * Now with real-time validation
 */
export default function CandidateFormModal({
  isOpen,
  onClose,
  onSubmit,
  candidate = null,
  loading = false,
  preSelectedJobId = null
}) {
  const isEditing = !!candidate;
  
  // Get initial values
  const getInitialValues = () => ({
    firstName: candidate?.firstName || '',
    lastName: candidate?.lastName || '',
    email: candidate?.email || '',
    phone: candidate?.phone || '',
    address: candidate?.address || '',
    postcode: candidate?.postcode || '',
    jobId: candidate?.jobId || preSelectedJobId || '',
    source: candidate?.source || '',
    notes: candidate?.notes || ''
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
  
  const [cvFile, setCvFile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Fetch active jobs for dropdown
  useEffect(() => {
    async function fetchJobs() {
      try {
        const jobsData = await getJobs({ status: 'active' });
        setJobs(jobsData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    }
    
    if (isOpen) {
      fetchJobs();
    }
  }, [isOpen]);

  // Reset form when candidate changes or modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm(getInitialValues());
      setCvFile(null);
    }
  }, [isOpen, candidate?.id]);

  const handleFileSelect = (file) => {
    setCvFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    if (!validate()) return;
    
    // Get job title for denormalization
    const selectedJob = jobs.find(j => j.id === values.jobId);
    
    const submitData = {
      ...values,
      jobTitle: selectedJob?.title || null
    };
    
    await onSubmit(submitData, cvFile);
  };

  const handleClose = () => {
    resetForm(getInitialValues());
    setCvFile(null);
    onClose();
  };

  // Check if a field is valid (touched, has value, no error)
  const isFieldValid = (name) => {
    return touched[name] && values[name] && !errors[name];
  };

  // Format jobs for select dropdown
  const jobOptions = jobs.map(job => ({
    value: job.id,
    label: `${job.title} - ${job.location}`
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Candidate' : 'Add New Candidate'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEditing ? 'Save Changes' : 'Add Candidate'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="candidate-form">
        {/* CV Upload */}
        <div className="candidate-form-section">
          <FileUpload
            label="CV / Resume"
            onFileSelect={handleFileSelect}
            currentFile={cvFile}
            currentFileName={candidate?.cvFileName}
            accept={['.pdf', '.doc', '.docx']}
            hint="PDF, DOC, or DOCX up to 10MB"
          />
        </div>

        {/* Personal Information */}
        <div className="candidate-form-section">
          <h4 className="candidate-form-section-title">Personal Information</h4>
          
          <div className="candidate-form-row candidate-form-row-2col">
            <Input
              label="First Name"
              name="firstName"
              value={values.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="John"
              error={getFieldError('firstName')}
              success={isFieldValid('firstName')}
              required
            />
            
            <Input
              label="Last Name"
              name="lastName"
              value={values.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Smith"
              error={getFieldError('lastName')}
              success={isFieldValid('lastName')}
              required
            />
          </div>

          <div className="candidate-form-row candidate-form-row-2col">
            <Input
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="john.smith@email.com"
              error={getFieldError('email')}
              success={isFieldValid('email')}
              required
            />
            
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="07123 456789"
              error={getFieldError('phone')}
              success={isFieldValid('phone')}
              required
            />
          </div>

          <div className="candidate-form-row candidate-form-row-2col">
            <Input
              label="Address"
              name="address"
              value={values.address}
              onChange={handleChange}
              placeholder="123 Main Street, Manchester"
              hint="Optional"
            />
            
            <Input
              label="Postcode"
              name="postcode"
              value={values.postcode}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="M1 1AA"
              error={getFieldError('postcode')}
              success={isFieldValid('postcode')}
              hint={!touched.postcode ? "Optional" : undefined}
            />
          </div>
        </div>

        {/* Application Details */}
        <div className="candidate-form-section">
          <h4 className="candidate-form-section-title">Application Details</h4>
          
          <div className="candidate-form-row candidate-form-row-2col">
            <Select
              label="Job Position"
              name="jobId"
              value={values.jobId}
              onChange={handleChange}
              options={jobOptions}
              placeholder={loadingJobs ? 'Loading jobs...' : 'Select a job position'}
              disabled={loadingJobs}
            />
            
            <Select
              label="Source"
              name="source"
              value={values.source}
              onChange={handleChange}
              options={CANDIDATE_SOURCES}
              placeholder="How did they apply?"
            />
          </div>

          <div className="candidate-form-row">
            <Textarea
              label="Notes"
              name="notes"
              value={values.notes}
              onChange={handleChange}
              placeholder="Any additional notes about this candidate..."
              rows={3}
              hint="Optional"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
