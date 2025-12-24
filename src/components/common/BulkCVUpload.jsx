import { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  File, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader, 
  FileText,
  Users,
  Sparkles,
  ChevronDown,
  Settings,
  Zap
} from 'lucide-react';
import { Button, Modal } from '../ui';
import { useJobs } from '../../hooks/useJobs';
import { useAuth } from '../../context/AuthContext';
import { createCandidate, uploadCV, addActivity, updateCandidate } from '../../lib/candidates';
import { parseCVContent } from '../../lib/cvParser';
import { Link } from 'react-router-dom';
import './BulkCVUpload.css';

/**
 * BulkCVUpload - Drag and drop component for uploading multiple CVs
 * Features:
 * - Multi-file drag and drop
 * - Job selection (pre-select or choose from dropdown)
 * - AI-powered CV parsing for candidate details extraction
 * - Progress tracking with individual file status
 * - Error handling per file
 * - Batch candidate creation
 */
export default function BulkCVUpload({ 
  isOpen, 
  onClose, 
  preSelectedJobId = null,
  onSuccess 
}) {
  const { user } = useAuth();
  const { jobs } = useJobs({ status: 'active' });
  
  // State
  const [selectedJobId, setSelectedJobId] = useState(preSelectedJobId || '');
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({});
  const [completedCount, setCompletedCount] = useState(0);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Accepted file types
  const ACCEPTED_TYPES = ['.pdf', '.doc', '.docx'];
  const ACCEPTED_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Get selected job details
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Validate a single file
  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      return `Invalid file type. Only ${ACCEPTED_TYPES.join(', ')} files are accepted.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    return null;
  };

  // Handle file selection
  const handleFiles = useCallback((newFiles) => {
    const validFiles = [];
    const errors = [];

    Array.from(newFiles).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push({ name: file.name, error });
      } else {
        // Check for duplicates
        const isDuplicate = files.some(f => f.file.name === file.name && f.file.size === file.size);
        if (!isDuplicate) {
          validFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            status: 'pending', // pending, processing, success, error
            error: null,
            parsedData: null,
            candidateId: null
          });
        }
      }
    });

    if (errors.length > 0) {
      console.warn('Some files were rejected:', errors);
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [files]);

  // Drag handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone itself
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  // Handle file input change
  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input
    e.target.value = '';
  };

  // Remove a file from the list
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setProcessingStatus(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  // Process all files
  const processFiles = async () => {
    if (!selectedJobId || files.length === 0) return;
    
    setIsProcessing(true);
    setCompletedCount(0);
    
    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      
      // Skip already processed files
      if (fileItem.status === 'success') {
        setCompletedCount(prev => prev + 1);
        continue;
      }
      
      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'processing' } : f
      ));
      setProcessingStatus(prev => ({
        ...prev,
        [fileItem.id]: { step: 'parsing', message: 'Parsing CV...' }
      }));

      try {
        // Step 1: Parse CV content
        const parsedData = await parseCVContent(fileItem.file);
        
        setProcessingStatus(prev => ({
          ...prev,
          [fileItem.id]: { step: 'creating', message: 'Creating candidate...' }
        }));

        // Step 2: Create candidate record
        const candidateData = {
          firstName: parsedData.firstName || 'Unknown',
          lastName: parsedData.lastName || 'Candidate',
          email: parsedData.email || '',
          phone: parsedData.phone || '',
          address: parsedData.address || null,
          postcode: parsedData.postcode || null,
          jobId: selectedJobId,
          jobTitle: selectedJob?.title || null,
          entityId: selectedJob?.entityId || null,
          branchId: selectedJob?.branchId || null,
          source: 'cv_upload',
          notes: parsedData.summary || null,
          parsedData: {
            ...parsedData,
            originalFileName: fileItem.file.name,
            uploadedAt: new Date().toISOString()
          }
        };

        const newCandidate = await createCandidate(candidateData, user.uid);

        setProcessingStatus(prev => ({
          ...prev,
          [fileItem.id]: { step: 'uploading', message: 'Uploading CV...' }
        }));

        // Step 3: Upload CV file
        const cvData = await uploadCV(fileItem.file, newCandidate.id);
        
        // Step 4: Update candidate with CV URL
        await updateCandidate(newCandidate.id, cvData);

        // Step 5: Add activity log
        await addActivity(newCandidate.id, {
          type: 'cv_uploaded',
          description: `CV uploaded via bulk upload: ${fileItem.file.name}`,
          metadata: { fileName: fileItem.file.name, parsedData },
          createdBy: user.uid,
          createdByName: user.displayName || user.email
        });

        // Update file status to success
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'success', parsedData, candidateId: newCandidate.id } 
            : f
        ));
        setProcessingStatus(prev => ({
          ...prev,
          [fileItem.id]: { step: 'complete', message: 'Candidate created!' }
        }));

      } catch (error) {
        console.error('Error processing file:', fileItem.file.name, error);
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', error: error.message } 
            : f
        ));
        setProcessingStatus(prev => ({
          ...prev,
          [fileItem.id]: { step: 'error', message: error.message }
        }));
      }

      setCompletedCount(prev => prev + 1);
    }

    setIsProcessing(false);
    
    // Call success callback if any files were processed successfully
    const successCount = files.filter(f => f.status === 'success').length;
    if (successCount > 0 && onSuccess) {
      onSuccess(successCount);
    }
  };

  // Reset and close
  const handleClose = () => {
    if (isProcessing) return;
    setFiles([]);
    setProcessingStatus({});
    setCompletedCount(0);
    setSelectedJobId(preSelectedJobId || '');
    onClose();
  };

  // Get status icon for a file
  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Loader size={16} className="animate-spin status-icon-processing" />;
      case 'success':
        return <CheckCircle size={16} className="status-icon-success" />;
      case 'error':
        return <AlertCircle size={16} className="status-icon-error" />;
      default:
        return <FileText size={16} className="status-icon-pending" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calculate progress
  const progress = files.length > 0 ? (completedCount / files.length) * 100 : 0;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk CV Upload" size="lg">
      <div className="bulk-upload">
        {/* AI Status Banner - Always enabled (server-side) */}
        <div className="ai-status-banner ai-enabled">
          <Zap size={16} />
          <span><strong>AI Parsing Active</strong> — Claude will intelligently extract candidate details</span>
        </div>

        {/* Job Selection */}
        <div className="bulk-upload-job-select">
          <label>Link to Job Position</label>
          <div className="job-select-dropdown" onClick={() => setShowJobDropdown(!showJobDropdown)}>
            <div className="job-select-value">
              {selectedJob ? (
                <>
                  <span className="job-select-title">{selectedJob.title}</span>
                  <span className="job-select-location">{selectedJob.location}</span>
                </>
              ) : (
                <span className="job-select-placeholder">Select a job position...</span>
              )}
            </div>
            <ChevronDown size={18} className={showJobDropdown ? 'rotated' : ''} />
            
            {showJobDropdown && (
              <div className="job-select-options">
                {jobs.length === 0 ? (
                  <div className="job-select-empty">No active jobs found</div>
                ) : (
                  jobs.map(job => (
                    <div 
                      key={job.id}
                      className={`job-select-option ${job.id === selectedJobId ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJobId(job.id);
                        setShowJobDropdown(false);
                      }}
                    >
                      <span className="job-option-title">{job.title}</span>
                      <span className="job-option-location">{job.location}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          className={`bulk-upload-dropzone ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            onChange={handleInputChange}
            className="bulk-upload-input"
            disabled={isProcessing}
          />
          
          {files.length === 0 ? (
            <div className="bulk-upload-placeholder">
              <div className="bulk-upload-icon">
                <Upload size={28} />
              </div>
              <div className="bulk-upload-text">
                <span className="bulk-upload-text-primary">
                  Drop CVs here or click to browse
                </span>
                <span className="bulk-upload-text-secondary">
                  Supports PDF, DOC, DOCX • Up to 10MB each
                </span>
              </div>
              <div className="bulk-upload-ai-badge">
                <Sparkles size={14} />
                <span>AI will extract candidate details automatically</span>
              </div>
            </div>
          ) : (
            <div className="bulk-upload-add-more">
              <Upload size={18} />
              <span>Drop more files or click to add</span>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="bulk-upload-files">
            <div className="bulk-upload-files-header">
              <span className="files-count">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
              {!isProcessing && (
                <button 
                  className="files-clear"
                  onClick={() => setFiles([])}
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="bulk-upload-file-list">
              {files.map((fileItem) => (
                <div 
                  key={fileItem.id} 
                  className={`bulk-upload-file-item ${fileItem.status}`}
                >
                  <div className="file-item-icon">
                    {getStatusIcon(fileItem.status)}
                  </div>
                  <div className="file-item-info">
                    <span className="file-item-name">{fileItem.file.name}</span>
                    <span className="file-item-meta">
                      {fileItem.status === 'processing' && processingStatus[fileItem.id]?.message}
                      {fileItem.status === 'success' && (
                        <>
                          {fileItem.parsedData?.firstName} {fileItem.parsedData?.lastName}
                          {fileItem.parsedData?.email && ` • ${fileItem.parsedData.email}`}
                        </>
                      )}
                      {fileItem.status === 'error' && fileItem.error}
                      {fileItem.status === 'pending' && formatFileSize(fileItem.file.size)}
                    </span>
                  </div>
                  {!isProcessing && fileItem.status !== 'success' && (
                    <button 
                      className="file-item-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileItem.id);
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="bulk-upload-progress">
            <div className="progress-header">
              <span>Processing {completedCount} of {files.length} files...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Summary after processing */}
        {!isProcessing && (successCount > 0 || errorCount > 0) && (
          <div className="bulk-upload-summary">
            {successCount > 0 && (
              <div className="summary-item success">
                <CheckCircle size={16} />
                <span>{successCount} candidate{successCount !== 1 ? 's' : ''} created successfully</span>
              </div>
            )}
            {errorCount > 0 && (
              <div className="summary-item error">
                <AlertCircle size={16} />
                <span>{errorCount} file{errorCount !== 1 ? 's' : ''} failed to process</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="bulk-upload-actions">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isProcessing}
          >
            {successCount > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={processFiles}
            disabled={!selectedJobId || pendingCount === 0 || isProcessing}
            leftIcon={isProcessing ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
          >
            {isProcessing 
              ? 'Processing...' 
              : `Upload ${pendingCount > 0 ? pendingCount : ''} CV${pendingCount !== 1 ? 's' : ''}`
            }
          </Button>
        </div>
      </div>
    </Modal>
  );
}
