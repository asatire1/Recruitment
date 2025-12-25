import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Template categories
export const TEMPLATE_CATEGORIES = [
  { value: 'initial_contact', label: 'Initial Contact', icon: '👋', description: 'First outreach to candidates' },
  { value: 'interview_invite', label: 'Interview Invite', icon: '📅', description: 'Schedule interview appointments' },
  { value: 'interview_reminder', label: 'Interview Reminder', icon: '⏰', description: 'Remind about upcoming interviews' },
  { value: 'trial_invite', label: 'Trial Invite', icon: '🏥', description: 'Invite to trial shifts' },
  { value: 'trial_reminder', label: 'Trial Reminder', icon: '📋', description: 'Remind about upcoming trials' },
  { value: 'offer', label: 'Job Offer', icon: '🎉', description: 'Extend job offers' },
  { value: 'rejection', label: 'Rejection', icon: '📝', description: 'Politely decline candidates' },
  { value: 'follow_up', label: 'Follow Up', icon: '🔄', description: 'General follow-up messages' },
  { value: 'document_request', label: 'Document Request', icon: '📄', description: 'Request documents or information' },
  { value: 'onboarding', label: 'Onboarding', icon: '🚀', description: 'Welcome new hires' },
  { value: 'custom', label: 'Custom', icon: '✏️', description: 'Custom templates' }
];

// Available placeholders with descriptions
export const PLACEHOLDERS = [
  { key: 'firstName', label: 'First Name', example: 'John', description: 'Candidate first name' },
  { key: 'lastName', label: 'Last Name', example: 'Smith', description: 'Candidate last name' },
  { key: 'fullName', label: 'Full Name', example: 'John Smith', description: 'Candidate full name' },
  { key: 'jobTitle', label: 'Job Title', example: 'Pharmacist', description: 'Position being applied for' },
  { key: 'branchName', label: 'Branch Name', example: 'Manchester Central', description: 'Branch location' },
  { key: 'branchAddress', label: 'Branch Address', example: '123 High Street, Manchester', description: 'Full branch address' },
  { key: 'interviewDate', label: 'Interview Date', example: 'Monday, 15th January', description: 'Scheduled interview date' },
  { key: 'interviewTime', label: 'Interview Time', example: '10:00 AM', description: 'Scheduled interview time' },
  { key: 'trialDate', label: 'Trial Date', example: 'Wednesday, 17th January', description: 'Scheduled trial date' },
  { key: 'trialTime', label: 'Trial Time', example: '9:00 AM', description: 'Scheduled trial time' },
  { key: 'trialDuration', label: 'Trial Duration', example: '4 hours', description: 'Length of trial shift' },
  { key: 'recruiterName', label: 'Recruiter Name', example: 'Sarah Johnson', description: 'Name of recruiter' },
  { key: 'recruiterPhone', label: 'Recruiter Phone', example: '07123 456789', description: 'Recruiter contact number' },
  { key: 'companyName', label: 'Company Name', example: 'Allied Pharmacies', description: 'Company/entity name' },
  { key: 'salary', label: 'Salary', example: '£35,000', description: 'Offered salary' },
  { key: 'startDate', label: 'Start Date', example: '1st February 2025', description: 'Employment start date' },
  { key: 'deadline', label: 'Deadline', example: 'Friday, 20th January', description: 'Response deadline' },
  { key: 'documentList', label: 'Document List', example: 'Passport, DBS Certificate', description: 'Required documents' }
];

// Default templates for each category
export const DEFAULT_TEMPLATES = {
  initial_contact: {
    name: 'Initial Contact',
    content: `Hi {{firstName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}}.

We've reviewed your application and would love to learn more about you. Are you available for a quick chat this week?

Best regards,
{{recruiterName}}`
  },
  interview_invite: {
    name: 'Interview Invitation',
    content: `Hi {{firstName}},

Great news! We'd like to invite you for an interview for the {{jobTitle}} position at our {{branchName}} branch.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please confirm your availability by replying to this message.

Looking forward to meeting you!
{{recruiterName}}`
  },
  interview_reminder: {
    name: 'Interview Reminder',
    content: `Hi {{firstName}},

Just a friendly reminder about your interview tomorrow:

📅 {{interviewDate}} at {{interviewTime}}
📍 {{branchAddress}}

Please bring a form of ID. If you need to reschedule, please let us know as soon as possible.

See you soon!
{{recruiterName}}`
  },
  trial_invite: {
    name: 'Trial Shift Invitation',
    content: `Hi {{firstName}},

We're pleased to invite you for a trial shift at {{branchName}}!

📅 Date: {{trialDate}}
⏰ Time: {{trialTime}}
⏱️ Duration: {{trialDuration}}
📍 Location: {{branchAddress}}

Please wear smart casual attire and bring your ID. Let me know if you have any questions.

{{recruiterName}}`
  },
  offer: {
    name: 'Job Offer',
    content: `Hi {{firstName}},

🎉 Congratulations! We're delighted to offer you the {{jobTitle}} position at {{branchName}}.

💰 Salary: {{salary}} per annum
📅 Start Date: {{startDate}}

Please confirm your acceptance by {{deadline}}.

Welcome to the team!
{{recruiterName}}`
  },
  rejection: {
    name: 'Application Update',
    content: `Hi {{firstName}},

Thank you for taking the time to apply for the {{jobTitle}} position and meeting with our team.

After careful consideration, we've decided to move forward with another candidate whose experience more closely matches our current needs.

We appreciate your interest in {{companyName}} and wish you the best in your job search.

Best regards,
{{recruiterName}}`
  }
};

// Hook for fetching templates
export function useWhatsAppTemplates(options = {}) {
  const { category = null, searchQuery = '' } = options;
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q = query(
      collection(db, 'whatsappTemplates'),
      orderBy('name', 'asc')
    );

    if (category && category !== 'all') {
      q = query(
        collection(db, 'whatsappTemplates'),
        where('category', '==', category),
        orderBy('name', 'asc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Client-side search
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          docs = docs.filter(t =>
            t.name?.toLowerCase().includes(search) ||
            t.content?.toLowerCase().includes(search)
          );
        }

        setTemplates(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching templates:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [category, searchQuery]);

  return { templates, loading, error };
}

// Hook for a single template
export function useWhatsAppTemplate(templateId) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!templateId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'whatsappTemplates', templateId),
      (doc) => {
        if (doc.exists()) {
          setTemplate({ id: doc.id, ...doc.data() });
        } else {
          setTemplate(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [templateId]);

  return { template, loading, error };
}

// Hook for template CRUD operations
export function useWhatsAppTemplateActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create template
  const createTemplate = async (templateData) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'whatsappTemplates'), {
        ...templateData,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setLoading(false);
      return docRef.id;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update template
  const updateTemplate = async (templateId, data) => {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'whatsappTemplates', templateId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'whatsappTemplates', templateId));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Duplicate template
  const duplicateTemplate = async (template) => {
    setLoading(true);
    setError(null);
    try {
      const newTemplateData = {
        name: `${template.name} (Copy)`,
        content: template.content,
        category: template.category,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'whatsappTemplates'), newTemplateData);
      setLoading(false);
      return docRef.id;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Increment usage count
  const incrementUsage = async (templateId) => {
    try {
      const templateRef = doc(db, 'whatsappTemplates', templateId);
      await updateDoc(templateRef, {
        usageCount: increment(1),
        lastUsedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error incrementing usage:', err);
    }
  };

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    incrementUsage,
    loading,
    error
  };
}

// Utility: Replace placeholders in template content
export function replacePlaceholders(content, data = {}) {
  if (!content) return '';
  
  let result = content;
  
  // Replace each placeholder with actual data or example
  PLACEHOLDERS.forEach(({ key, example }) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    const value = data[key] || `[${key}]`;
    result = result.replace(regex, value);
  });
  
  return result;
}

// Utility: Replace placeholders with examples for preview
export function replaceWithExamples(content) {
  if (!content) return '';
  
  let result = content;
  
  PLACEHOLDERS.forEach(({ key, example }) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, example);
  });
  
  return result;
}

// Utility: Extract placeholders from content
export function extractPlaceholders(content) {
  if (!content) return [];
  
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const placeholder = PLACEHOLDERS.find(p => p.key.toLowerCase() === key.toLowerCase());
    if (placeholder && !matches.find(m => m.key === placeholder.key)) {
      matches.push(placeholder);
    }
  }
  
  return matches;
}

// Utility: Generate WhatsApp Web URL
export function generateWhatsAppUrl(phoneNumber, message) {
  // Clean phone number (remove spaces, dashes, etc.)
  let cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Add UK country code if not present
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '44' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('+') && !cleanNumber.startsWith('44')) {
    cleanNumber = '44' + cleanNumber;
  }
  
  // Remove + if present
  cleanNumber = cleanNumber.replace('+', '');
  
  // Encode message
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

// Utility: Open WhatsApp Web with message
export function openWhatsApp(phoneNumber, message) {
  const url = generateWhatsAppUrl(phoneNumber, message);
  window.open(url, '_blank');
}

export default useWhatsAppTemplates;
