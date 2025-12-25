import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { storage, db, functions } from '../config/firebase';

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': { ext: 'pdf', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', label: 'Word (DOCX)' },
  'application/msword': { ext: 'doc', label: 'Word (DOC)' },
  'text/plain': { ext: 'txt', label: 'Text' }
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Parse status
export const PARSE_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PARSING: 'parsing',
  COMPLETE: 'complete',
  ERROR: 'error'
};

// Skill categories
export const SKILL_CATEGORIES = {
  CLINICAL: 'clinical',
  TECHNICAL: 'technical',
  SOFT: 'soft',
  LANGUAGE: 'language',
  CERTIFICATION: 'certification'
};

// Common pharmacy skills for matching
export const PHARMACY_SKILLS = {
  clinical: [
    'Dispensing', 'Medicines Management', 'Clinical Checks', 'Patient Counselling',
    'MURs', 'NMS', 'Flu Vaccinations', 'Travel Health', 'Minor Ailments',
    'Controlled Drugs', 'Methadone Supervision', 'EPS', 'eRD', 'Hub & Spoke',
    'Blister Packing', 'Care Home Services', 'Palliative Care'
  ],
  technical: [
    'PMR Systems', 'Pharmacy Manager', 'ProScript', 'Titan', 'RxWeb',
    'Microsoft Office', 'NHS BSA', 'NHSBSA', 'SCR', 'Summary Care Record',
    'PharmOutcomes', 'Sonar'
  ],
  soft: [
    'Leadership', 'Team Management', 'Customer Service', 'Communication',
    'Problem Solving', 'Time Management', 'Attention to Detail', 'Multitasking'
  ],
  certifications: [
    'GPhC Registered', 'Pre-Registration', 'ACT Qualified', 'NVQ Level 2',
    'NVQ Level 3', 'BTEC', 'Accuracy Checking Technician', 'Dispensing Assistant',
    'DBS Checked', 'Right to Work'
  ]
};

// Hook for CV file validation and upload
export function useCVUpload() {
  const [status, setStatus] = useState(PARSE_STATUS.IDLE);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const validateFile = useCallback((file) => {
    // Check file type
    if (!SUPPORTED_FILE_TYPES[file.type]) {
      return {
        valid: false,
        error: `Unsupported file type. Please upload ${Object.values(SUPPORTED_FILE_TYPES).map(t => t.label).join(', ')}`
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    return { valid: true };
  }, []);

  const uploadCV = useCallback(async (file, candidateId) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return null;
    }

    setStatus(PARSE_STATUS.UPLOADING);
    setProgress(0);
    setError(null);

    try {
      // Generate unique filename
      const ext = SUPPORTED_FILE_TYPES[file.type].ext;
      const filename = `${candidateId}_${Date.now()}.${ext}`;
      const filePath = `cvs/${candidateId}/${filename}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      setProgress(50);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      setProgress(100);

      // Update candidate record with CV URL
      await updateDoc(doc(db, 'candidates', candidateId), {
        cvUrl: downloadURL,
        cvFileName: file.name,
        cvUploadedAt: serverTimestamp(),
        cvParsed: false
      });

      setStatus(PARSE_STATUS.COMPLETE);
      
      return {
        url: downloadURL,
        path: filePath,
        filename: file.name
      };
    } catch (err) {
      console.error('CV upload error:', err);
      setError(err.message);
      setStatus(PARSE_STATUS.ERROR);
      return null;
    }
  }, [validateFile]);

  const reset = useCallback(() => {
    setStatus(PARSE_STATUS.IDLE);
    setProgress(0);
    setError(null);
  }, []);

  return {
    uploadCV,
    validateFile,
    reset,
    status,
    progress,
    error
  };
}

// Hook for CV parsing with AI
export function useCVParser() {
  const [status, setStatus] = useState(PARSE_STATUS.IDLE);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const parseCV = useCallback(async (candidateId, cvUrl) => {
    setStatus(PARSE_STATUS.PARSING);
    setError(null);
    setParsedData(null);

    try {
      // Call Firebase Cloud Function for CV parsing
      const parseCVFunction = httpsCallable(functions, 'parseCV');
      const result = await parseCVFunction({ candidateId, cvUrl });

      const parsed = result.data;
      setParsedData(parsed);

      // Update candidate with parsed data
      await updateDoc(doc(db, 'candidates', candidateId), {
        cvParsed: true,
        cvParsedAt: serverTimestamp(),
        parsedCV: parsed,
        // Update searchable fields
        skills: parsed.skills || [],
        experience: parsed.experience || [],
        education: parsed.education || [],
        qualifications: parsed.qualifications || []
      });

      setStatus(PARSE_STATUS.COMPLETE);
      return parsed;
    } catch (err) {
      console.error('CV parse error:', err);
      setError(err.message);
      setStatus(PARSE_STATUS.ERROR);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus(PARSE_STATUS.IDLE);
    setParsedData(null);
    setError(null);
  }, []);

  return {
    parseCV,
    reset,
    status,
    parsedData,
    error
  };
}

// Hook for manual CV data entry/editing
export function useCVDataEditor(candidateId) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveData = useCallback(async (data) => {
    if (!candidateId) return;

    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        parsedCV: data,
        skills: data.skills || [],
        experience: data.experience || [],
        education: data.education || [],
        qualifications: data.qualifications || [],
        cvEditedAt: serverTimestamp()
      });
      setSaving(false);
      return true;
    } catch (err) {
      setError(err.message);
      setSaving(false);
      return false;
    }
  }, [candidateId]);

  return { saveData, saving, error };
}

// Utility: Extract skills from text
export function extractSkills(text) {
  if (!text) return [];
  
  const foundSkills = [];
  const lowerText = text.toLowerCase();

  Object.entries(PHARMACY_SKILLS).forEach(([category, skills]) => {
    skills.forEach(skill => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push({
          name: skill,
          category,
          confidence: 1.0
        });
      }
    });
  });

  return foundSkills;
}

// Utility: Calculate skill match score
export function calculateSkillMatch(candidateSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  if (!candidateSkills || candidateSkills.length === 0) return 0;

  const candidateSkillNames = candidateSkills.map(s => 
    (typeof s === 'string' ? s : s.name).toLowerCase()
  );

  let matches = 0;
  requiredSkills.forEach(required => {
    const reqLower = required.toLowerCase();
    if (candidateSkillNames.some(s => s.includes(reqLower) || reqLower.includes(s))) {
      matches++;
    }
  });

  return Math.round((matches / requiredSkills.length) * 100);
}

// Utility: Format experience duration
export function formatExperienceDuration(months) {
  if (!months || months < 1) return 'Less than 1 month';
  if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  }
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}

// Utility: Calculate total experience
export function calculateTotalExperience(experiences) {
  if (!experiences || experiences.length === 0) return 0;

  let totalMonths = 0;
  
  experiences.forEach(exp => {
    if (exp.startDate) {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                    (end.getMonth() - start.getMonth());
      totalMonths += Math.max(0, months);
    } else if (exp.durationMonths) {
      totalMonths += exp.durationMonths;
    }
  });

  return totalMonths;
}

export default useCVParser;
