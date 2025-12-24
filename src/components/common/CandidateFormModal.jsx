import { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, Modal, FileUpload } from '../ui';
import { CANDIDATE_SOURCES } from '../../lib/candidates';
import { getJobs } from '../../lib/jobs';
import './CandidateFormModal.css';

/**
 * CandidateFormModal - Modal for creating and editing candidates
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
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    postcode: '',
    jobId: '',
    source: '',
    notes: ''
  });
  
  const [cvFile, setCvFile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [errors, setErrors] = useState({});
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

  // Populate form when editing or when preSelectedJobId changes
  useEffect(() => {
    if (candidate) {
      setFormData({
        firstName: candidate.firstName || '',
        lastName: candidate.lastName || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        address: candidate.address || '',
        postcode: candidate.postcode || '',
        jobId: candidate.jobId || '',
        source: candidate.source || '',
        notes: candidate.notes || ''
      });
      setCvFile(null);
    } else {
      // Reset form for new candidate
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postcode: '',
        jobId: preSelectedJobId || '',
        source: '',
        notes: ''
      });
      setCvFile(null);
    }
    setErrors({});
  }, [candidate, isOpen, preSelectedJobId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileSelect = (file) => {
    setCvFile(file);
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // Get job title for denormalization
    const selectedJob = jobs.find(j => j.id === formData.jobId);
    
    const submitData = {
      ...formData,
      jobTitle: selectedJob?.title || null
    };
    
    await onSubmit(submitData, cvFile);
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      postcode: '',
      jobId: '',
      source: '',
      notes: ''
    });
    setCvFile(null);
    setErrors({});
    onClose();
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
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              error={errors.firstName}
              required
            />
            
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Smith"
              error={errors.lastName}
              required
            />
          </div>

          <div className="candidate-form-row candidate-form-row-2col">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john.smith@email.com"
              error={errors.email}
              required
            />
            
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="07123 456789"
              error={errors.phone}
              required
            />
          </div>

          <div className="candidate-form-row candidate-form-row-2col">
            <Input
              label="Address (optional)"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main Street, Manchester"
            />
            
            <Input
              label="Postcode (optional)"
              name="postcode"
              value={formData.postcode}
              onChange={handleChange}
              placeholder="M1 1AA"
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
              value={formData.jobId}
              onChange={handleChange}
              options={jobOptions}
              placeholder={loadingJobs ? 'Loading jobs...' : 'Select a job position'}
              disabled={loadingJobs}
            />
            
            <Select
              label="Source"
              name="source"
              value={formData.source}
              onChange={handleChange}
              options={CANDIDATE_SOURCES}
              placeholder="How did they apply?"
            />
          </div>

          <div className="candidate-form-row">
            <Textarea
              label="Notes (optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes about this candidate..."
              rows={3}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
