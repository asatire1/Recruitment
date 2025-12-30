/**
 * Job Application Component
 * Public page for candidates to apply for jobs
 * 
 * Flow:
 * 1. View available jobs
 * 2. Select a job
 * 3. Upload CV (AI parses it)
 * 4. Review/edit details
 * 5. Submit application
 */

import { useState, useEffect, useRef } from 'react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage'
import { db } from '../lib/firebase'
import app from '../lib/firebase'

// Initialize storage
const storage = getStorage(app)

// ============================================================================
// TYPES
// ============================================================================

interface Job {
  id: string
  title: string
  branchName: string
  branchAddress?: string
  entity: string
  employmentType: string
  salaryMin?: number
  salaryMax?: number
  salaryPeriod?: string
  hoursPerWeek?: number
  description?: string
  category?: string
}

interface ParsedCVData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  summary?: string
  skills?: string[]
  qualifications?: string[]
  totalYearsExperience?: number
  pharmacyYearsExperience?: number
  confidence?: {
    overall: number
  }
}

/**
 * Client-side CV text parsing using regex patterns
 */
function parseCVText(text: string): ParsedCVData {
  // Email pattern
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
  const email = emailMatch ? emailMatch[0].toLowerCase() : undefined

  // UK Phone patterns
  const phonePatterns = [
    /(?:(?:\+44\s?|0)7\d{3}\s?\d{3}\s?\d{3})/,
    /(?:(?:\+44\s?|0)\d{2,4}\s?\d{3}\s?\d{4})/,
    /07\d{9}/,
    /(?:\+44|0)\s*\d[\d\s]{9,}/,
  ]
  
  let phone: string | undefined = undefined
  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      phone = match[0].replace(/\s+/g, ' ').trim()
      break
    }
  }

  // Name extraction
  let firstName: string | undefined = undefined
  let lastName: string | undefined = undefined

  // Words to skip - common CV headers and non-name words
  const skipWords = [
    'curriculum', 'vitae', 'resume', 'cv', 'profile', 'contact', 'email', 'phone',
    'address', 'summary', 'objective', 'experience', 'education', 'skills',
    'personal', 'details', 'statement', 'professional', 'work', 'history',
    'media', 'based', 'lens', 'digital', 'creative', 'design', 'designer',
    'developer', 'manager', 'assistant', 'analyst', 'engineer', 'specialist',
    'coordinator', 'consultant', 'executive', 'director', 'officer', 'lead'
  ]

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)
  
  // First try: Look for "Name:" pattern
  const namePatterns = [
    /(?:full\s*name|name)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/m,
  ]
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match) {
      const nameParts = (match[1] || match[0]).trim().split(/\s+/)
      const isValidName = !nameParts.some(p => skipWords.includes(p.toLowerCase()))
      if (isValidName && nameParts.length >= 2) {
        firstName = nameParts[0]
        lastName = nameParts.slice(1).join(' ')
        break
      }
    }
  }

  // Second try: Look at first few lines for a name
  if (!firstName) {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i]
      
      // Skip lines with common headers or symbols
      if (line.match(/^(curriculum|resume|cv|profile|contact|email|phone|address|summary|objective|experience|education|skills)/i)) continue
      if (line.includes('@') || line.includes(':')) continue
      if (line.match(/^\d/) || line.match(/^[\+\(\|•·]/) || line.match(/[|•·]/)) continue
      if (line.length > 40 || line.length < 4) continue
      
      const words = line.split(/\s+/).filter(w => w.length > 1)
      
      // Should be 2-3 words, each capitalized, and not skip words
      if (words.length >= 2 && words.length <= 3) {
        const looksLikeName = words.every(w => /^[A-Z][a-z]+$/.test(w))
        const notSkipWords = !words.some(w => skipWords.includes(w.toLowerCase()))
        
        if (looksLikeName && notSkipWords) {
          firstName = words[0]
          lastName = words.slice(1).join(' ')
          break
        }
      }
    }
  }

  // Third try: Extract name from email (e.g., john.smith@gmail.com -> John Smith)
  if (!firstName && email) {
    const emailName = email.split('@')[0]
    // Try common patterns: john.smith, johnsmith, john_smith, john-smith
    const emailParts = emailName.split(/[._\-]/).filter(p => p.length > 1 && !/\d/.test(p))
    
    if (emailParts.length >= 2) {
      firstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1).toLowerCase()
      lastName = emailParts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
    } else if (emailParts.length === 1 && emailParts[0].length > 3) {
      // Try to split camelCase or guess
      const name = emailParts[0]
      // Check for camelCase
      const camelMatch = name.match(/^([a-z]+)([A-Z][a-z]+)/)
      if (camelMatch) {
        firstName = camelMatch[1].charAt(0).toUpperCase() + camelMatch[1].slice(1)
        lastName = camelMatch[2]
      }
    }
  }

  // Calculate confidence
  const foundFields = [firstName, lastName, email, phone].filter(f => f !== undefined).length
  const confidence = { overall: Math.round((foundFields / 4) * 100) }

  return {
    firstName,
    lastName,
    email,
    phone,
    confidence,
  }
}

interface ApplicationForm {
  firstName: string
  lastName: string
  email: string
  phone: string
}

type AppState = 
  | 'loading-jobs'
  | 'selecting-job'
  | 'uploading-cv'
  | 'parsing'
  | 'reviewing'
  | 'submitting'
  | 'success'
  | 'error'

// ============================================================================
// COMPONENT
// ============================================================================

export function JobApplication() {
  // State
  const [appState, setAppState] = useState<AppState>('loading-jobs')
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedCVData | null>(null)
  const [form, setForm] = useState<ApplicationForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [formErrors, setFormErrors] = useState<Partial<ApplicationForm>>({})
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ========================================
  // LOAD JOBS
  // ========================================

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      setAppState('loading-jobs')
      const jobsRef = collection(db, 'jobs')
      const q = query(jobsRef, where('status', '==', 'active'))
      const snapshot = await getDocs(q)
      
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
      
      setJobs(jobsData)
      setAppState('selecting-job')
    } catch (err) {
      console.error('Error loading jobs:', err)
      setError('Failed to load available positions. Please try again.')
      setAppState('error')
    }
  }

  // ========================================
  // FILE HANDLING
  // ========================================

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setCvFile(file)
    setError(null)
    await uploadAndParseCV(file)
  }

  const uploadAndParseCV = async (file: File) => {
    if (!selectedJob) return

    try {
      setAppState('parsing')
      setUploadProgress('Analysing your CV...')

      let extractedText = ''
      
      // Extract text based on file type
      if (file.type === 'application/pdf') {
        // Use pdf.js to extract text from PDF
        try {
          const pdfjsLib = await import('pdfjs-dist')
          // For pdfjs-dist 5.x, use unpkg CDN with correct version
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
          
          const arrayBuffer = await file.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          
          const textParts: string[] = []
          for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) { // First 3 pages
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
            textParts.push(pageText)
          }
          extractedText = textParts.join('\n')
          console.log('PDF text extracted:', extractedText.substring(0, 200))
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError)
        }
      } else if (file.type === 'text/plain') {
        extractedText = await file.text()
      } else {
        // For Word docs, we can't easily parse client-side
        // Try reading as text anyway
        try {
          extractedText = await file.text()
        } catch {
          extractedText = ''
        }
      }

      console.log('Extracted text length:', extractedText.length)
      
      // Parse the extracted text
      let parsed: ParsedCVData | null = null
      if (extractedText.length > 20) {
        parsed = parseCVText(extractedText)
        console.log('Parsed data:', parsed)
        
        if (parsed.firstName || parsed.email || parsed.phone) {
          setParsedData(parsed)
          setForm({
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            email: parsed.email || '',
            phone: parsed.phone || ''
          })
        }
      }

      // Now upload to storage
      setUploadProgress('Saving your CV...')
      
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const path = `applications/${timestamp}_${safeName}`
      
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)
      setCvUrl(downloadUrl)
      
      // Show message based on parsing success
      if (!parsed || (!parsed.firstName && !parsed.email && !parsed.phone)) {
        setError('We couldn\'t automatically read your CV. Please fill in your details below.')
      }
      
      setAppState('reviewing')
    } catch (err: any) {
      console.error('Error processing CV:', err)
      setAppState('reviewing')
      setError('We couldn\'t automatically read your CV. Please fill in your details below.')
    } finally {
      setUploadProgress('')
    }
  }

  // ========================================
  // FORM HANDLING
  // ========================================

  const handleFormChange = (field: keyof ApplicationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<ApplicationForm> = {}

    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required'
    }

    if (!form.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ========================================
  // SUBMIT APPLICATION
  // ========================================

  const handleSubmit = async () => {
    if (!validateForm() || !selectedJob) return
    
    // Check if CV was uploaded
    if (!cvUrl) {
      setError('Please upload your CV first.')
      return
    }

    try {
      setAppState('submitting')

      // Create candidate record
      const candidateData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        jobTitle: selectedJob.title || '',
        branchName: selectedJob.branchName || '',
        entity: selectedJob.entity || 'allied',
        source: 'website',
        status: 'new',
        cvUrl,
        cvFileName: cvFile?.name || 'CV',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      console.log('Submitting candidate data:', candidateData)

      await addDoc(collection(db, 'candidates'), candidateData)
      setAppState('success')
    } catch (err: any) {
      console.error('Error submitting application:', err)
      console.error('Error code:', err.code)
      console.error('Error message:', err.message)
      setError(`Failed to submit application: ${err.message || 'Please try again.'}`)
      setAppState('error')
    }
  }

  // ========================================
  // RENDER HELPERS
  // ========================================

  const formatSalary = (job: Job): string => {
    if (!job.salaryMin && !job.salaryMax) return ''
    const formatNum = (n: number) => n >= 1000 ? `£${(n / 1000).toFixed(0)}k` : `£${n}`
    const suffix = job.salaryPeriod === 'hourly' ? '/hr' : '/yr'
    
    if (job.salaryMin && job.salaryMax) {
      return `${formatNum(job.salaryMin)} - ${formatNum(job.salaryMax)}${suffix}`
    }
    if (job.salaryMin) return `From ${formatNum(job.salaryMin)}${suffix}`
    if (job.salaryMax) return `Up to ${formatNum(job.salaryMax)}${suffix}`
    return ''
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="job-application">
      {/* Loading Jobs */}
      {appState === 'loading-jobs' && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading available positions...</p>
        </div>
      )}

      {/* Job Selection */}
      {appState === 'selecting-job' && (
        <div className="job-selection">
          <div className="page-header">
            <h1>Join Our Team</h1>
            <p>Browse our available positions and apply today</p>
          </div>

          {jobs.length === 0 ? (
            <div className="no-jobs">
              <div className="no-jobs-icon">📋</div>
              <h2>No Positions Available</h2>
              <p>We don't have any open positions at the moment. Please check back later.</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {jobs.map(job => (
                <div 
                  key={job.id} 
                  className="job-card"
                  onClick={() => {
                    setSelectedJob(job)
                    setAppState('uploading-cv')
                  }}
                >
                  <div className="job-card-header">
                    <h3>{job.title}</h3>
                    <span className="employment-type">{job.employmentType}</span>
                  </div>
                  <div className="job-card-location">
                    <LocationIcon />
                    <span>{job.branchName}</span>
                  </div>
                  {formatSalary(job) && (
                    <div className="job-card-salary">
                      <SalaryIcon />
                      <span>{formatSalary(job)}</span>
                    </div>
                  )}
                  {job.hoursPerWeek && (
                    <div className="job-card-hours">
                      <ClockIcon />
                      <span>{job.hoursPerWeek} hrs/week</span>
                    </div>
                  )}
                  <button className="apply-btn">
                    Apply Now <ArrowRightIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CV Upload */}
      {appState === 'uploading-cv' && selectedJob && (
        <div className="cv-upload">
          <button className="btn-back" onClick={() => {
            setSelectedJob(null)
            setCvFile(null)
            setAppState('selecting-job')
          }}>
            <ChevronLeftIcon /> Back to Jobs
          </button>

          <div className="selected-job-banner">
            <h2>Applying for: {selectedJob.title}</h2>
            <p>{selectedJob.branchName}</p>
          </div>

          <div className="upload-section">
            <h3>Upload Your CV</h3>
            <p>We'll automatically extract your details to make applying quick and easy</p>

            <div 
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('dragover')
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('dragover')
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('dragover')
                const file = e.dataTransfer.files[0]
                if (file) {
                  const input = fileInputRef.current
                  if (input) {
                    const dt = new DataTransfer()
                    dt.items.add(file)
                    input.files = dt.files
                    handleFileSelect({ target: input } as any)
                  }
                }
              }}
            >
              <UploadIcon />
              <p><strong>Click to upload</strong> or drag and drop</p>
              <p className="file-types">PDF or Word document (max 10MB)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {error && (
              <div className="error-message">
                <AlertIcon />
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parsing */}
      {appState === 'parsing' && (
        <div className="parsing-container">
          <div className="spinner large"></div>
          <h2>{uploadProgress || 'Processing your CV...'}</h2>
          <p>This usually takes a few seconds</p>
        </div>
      )}

      {/* Review & Edit */}
      {appState === 'reviewing' && selectedJob && (
        <div className="review-form">
          <button className="btn-back" onClick={() => {
            setCvFile(null)
            setCvUrl(null)
            setParsedData(null)
            setForm({ firstName: '', lastName: '', email: '', phone: '' })
            setAppState('uploading-cv')
          }}>
            <ChevronLeftIcon /> Upload Different CV
          </button>

          <div className="selected-job-banner">
            <h2>Applying for: {selectedJob.title}</h2>
            <p>{selectedJob.branchName}</p>
          </div>

          {parsedData && parsedData.confidence && (
            <div className="parsed-success">
              <CheckCircleIcon />
              <span>CV analysed successfully</span>
            </div>
          )}

          {error && (
            <div className="error-message warning">
              <AlertIcon />
              {error}
            </div>
          )}

          <div className="form-section">
            <h3>Your Details</h3>
            <p>Please confirm your information is correct</p>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                  className={formErrors.firstName ? 'error' : ''}
                />
                {formErrors.firstName && (
                  <span className="field-error">{formErrors.firstName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                  className={formErrors.lastName ? 'error' : ''}
                />
                {formErrors.lastName && (
                  <span className="field-error">{formErrors.lastName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={formErrors.email ? 'error' : ''}
                />
                {formErrors.email && (
                  <span className="field-error">{formErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className={formErrors.phone ? 'error' : ''}
                />
                {formErrors.phone && (
                  <span className="field-error">{formErrors.phone}</span>
                )}
              </div>
            </div>

            <button 
              className="btn btn-primary btn-large"
              onClick={handleSubmit}
            >
              Submit Application
            </button>
          </div>
        </div>
      )}

      {/* Submitting */}
      {appState === 'submitting' && (
        <div className="submitting-container">
          <div className="spinner large"></div>
          <h2>Submitting your application...</h2>
        </div>
      )}

      {/* Success */}
      {appState === 'success' && selectedJob && (
        <div className="success-container">
          <div className="success-icon">
            <CheckCircleIcon />
          </div>
          <h1>Application Submitted!</h1>
          <p>Thank you for applying for <strong>{selectedJob.title}</strong> at <strong>{selectedJob.branchName}</strong>.</p>
          <p>We'll review your application and be in touch soon.</p>
          
          <button 
            className="btn btn-outline"
            onClick={() => {
              setSelectedJob(null)
              setCvFile(null)
              setCvUrl(null)
              setParsedData(null)
              setForm({ firstName: '', lastName: '', email: '', phone: '' })
              setError(null)
              setAppState('selecting-job')
            }}
          >
            View More Positions
          </button>
        </div>
      )}

      {/* Error */}
      {appState === 'error' && (
        <div className="error-container">
          <div className="error-icon">
            <AlertIcon />
          </div>
          <h1>Something Went Wrong</h1>
          <p>{error || 'An unexpected error occurred. Please try again.'}</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setError(null)
              loadJobs()
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ICONS
// ============================================================================

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function SalaryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default JobApplication
