import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import './FileUpload.css';

/**
 * FileUpload component with drag & drop support
 * @param {Object} props
 * @param {function} props.onFileSelect - Callback when file is selected
 * @param {string[]} props.accept - Accepted file types
 * @param {number} props.maxSize - Maximum file size in bytes
 * @param {File} props.currentFile - Currently selected file
 * @param {string} props.currentFileName - Name of existing file (for edit mode)
 * @param {string} props.label
 * @param {string} props.hint
 */
export default function FileUpload({
  onFileSelect,
  accept = ['.pdf', '.doc', '.docx'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  currentFile = null,
  currentFileName = null,
  label = 'Upload File',
  hint = 'PDF, DOC, or DOCX up to 10MB'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const acceptString = accept.join(',');
  const acceptMimes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  const validateFile = (file) => {
    // Check file type
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!accept.includes(ext)) {
      return `Invalid file type. Please upload ${accept.join(', ')} files only.`;
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  const handleFile = useCallback((file) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect, accept, maxSize]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayFileName = currentFile?.name || currentFileName;

  return (
    <div className="file-upload-wrapper">
      {label && <label className="file-upload-label">{label}</label>}
      
      <div
        className={`file-upload-zone ${isDragging ? 'file-upload-zone-dragging' : ''} ${displayFileName ? 'file-upload-zone-has-file' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleInputChange}
          className="file-upload-input"
        />

        {displayFileName ? (
          <div className="file-upload-preview">
            <div className="file-upload-file-icon">
              <File size={24} />
            </div>
            <div className="file-upload-file-info">
              <span className="file-upload-file-name">{displayFileName}</span>
              {currentFile && (
                <span className="file-upload-file-size">
                  {formatFileSize(currentFile.size)}
                </span>
              )}
            </div>
            <button
              type="button"
              className="file-upload-remove"
              onClick={handleRemove}
              aria-label="Remove file"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="file-upload-placeholder">
            <div className="file-upload-icon">
              <Upload size={24} />
            </div>
            <div className="file-upload-text">
              <span className="file-upload-text-primary">
                Click to upload or drag and drop
              </span>
              <span className="file-upload-text-secondary">{hint}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="file-upload-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
