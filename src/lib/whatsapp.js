import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firestore WhatsApp Template Schema
 * Collection: whatsappTemplates
 * 
 * Fields:
 * - name: string (required) - template name
 * - category: string (required) - from TEMPLATE_CATEGORIES
 * - content: string (required) - message content with placeholders
 * - placeholders: string[] - list of placeholder keys
 * - isDefault: boolean - whether this is a system default
 * - createdBy: string (user ID)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * 
 * Placeholders use {{placeholder}} syntax:
 * - {{firstName}} - candidate's first name
 * - {{lastName}} - candidate's last name
 * - {{fullName}} - candidate's full name
 * - {{jobTitle}} - applied job title
 * - {{companyName}} - company name (Allied Pharmacies)
 * - {{interviewDate}} - scheduled interview date
 * - {{interviewTime}} - scheduled interview time
 * - {{branchAddress}} - interview/trial location
 * - {{contactName}} - recruiter/manager name
 * - {{contactPhone}} - recruiter/manager phone
 */

export const TEMPLATE_CATEGORIES = [
  { value: 'initial_contact', label: 'Initial Contact' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'interview_invite', label: 'Interview Invitation' },
  { value: 'interview_reminder', label: 'Interview Reminder' },
  { value: 'trial_invite', label: 'Trial Invitation' },
  { value: 'trial_reminder', label: 'Trial Reminder' },
  { value: 'offer', label: 'Job Offer' },
  { value: 'rejection', label: 'Rejection' },
  { value: 'general', label: 'General' }
];

export const AVAILABLE_PLACEHOLDERS = [
  { key: 'firstName', label: 'First Name', example: 'John' },
  { key: 'lastName', label: 'Last Name', example: 'Smith' },
  { key: 'fullName', label: 'Full Name', example: 'John Smith' },
  { key: 'jobTitle', label: 'Job Title', example: 'Dispenser' },
  { key: 'companyName', label: 'Company Name', example: 'Allied Pharmacies' },
  { key: 'interviewDate', label: 'Interview Date', example: '15th January' },
  { key: 'interviewTime', label: 'Interview Time', example: '10:00 AM' },
  { key: 'branchAddress', label: 'Branch Address', example: '123 High Street, Manchester' },
  { key: 'contactName', label: 'Contact Name', example: 'Sarah Johnson' },
  { key: 'contactPhone', label: 'Contact Phone', example: '07123 456789' }
];

// Default templates to seed the database
export const DEFAULT_TEMPLATES = [
  {
    name: 'Initial Contact',
    category: 'initial_contact',
    content: `Hi {{firstName}},

Thank you for your application for the {{jobTitle}} position at {{companyName}}.

We've reviewed your CV and would like to discuss this opportunity with you. Are you available for a quick call this week?

Best regards`,
    isDefault: true
  },
  {
    name: 'Follow Up - No Response',
    category: 'follow_up',
    content: `Hi {{firstName}},

I wanted to follow up on my previous message regarding the {{jobTitle}} position at {{companyName}}.

Are you still interested in this opportunity? Please let me know if you'd like to discuss further.

Thanks`,
    isDefault: true
  },
  {
    name: 'Interview Invitation',
    category: 'interview_invite',
    content: `Hi {{firstName}},

Great news! We'd like to invite you for an interview for the {{jobTitle}} position.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please confirm if this works for you. If not, let me know your availability and we can arrange an alternative.

Looking forward to meeting you!`,
    isDefault: true
  },
  {
    name: 'Interview Reminder',
    category: 'interview_reminder',
    content: `Hi {{firstName}},

Just a friendly reminder about your interview tomorrow:

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please bring a form of ID with you. If you have any questions or need to reschedule, please let me know ASAP.

See you soon!`,
    isDefault: true
  },
  {
    name: 'Trial Day Invitation',
    category: 'trial_invite',
    content: `Hi {{firstName}},

Following your successful interview, we'd like to invite you for a trial day as a {{jobTitle}}.

📅 Date: {{interviewDate}}
⏰ Time: {{interviewTime}}
📍 Location: {{branchAddress}}

Please wear smart casual attire and bring ID. You'll be working alongside our team to get a feel for the role.

Please confirm your attendance.`,
    isDefault: true
  },
  {
    name: 'Availability Check',
    category: 'general',
    content: `Hi {{firstName}},

We have an opening for a {{jobTitle}} position that might interest you.

Could you let me know your current availability and if you'd be interested in discussing this opportunity?

Thanks`,
    isDefault: true
  }
];

const TEMPLATES_COLLECTION = 'whatsappTemplates';

/**
 * Create a new template
 */
export async function createTemplate(templateData, userId) {
  const templatesRef = collection(db, TEMPLATES_COLLECTION);
  
  const template = {
    name: templateData.name,
    category: templateData.category,
    content: templateData.content,
    placeholders: extractPlaceholders(templateData.content),
    isDefault: false,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(templatesRef, template);
  return { id: docRef.id, ...template };
}

/**
 * Get all templates
 */
export async function getTemplates() {
  const templatesRef = collection(db, TEMPLATES_COLLECTION);
  const q = query(templatesRef, orderBy('category'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to templates (real-time)
 */
export function subscribeToTemplates(callback) {
  const templatesRef = collection(db, TEMPLATES_COLLECTION);
  const q = query(templatesRef, orderBy('category'), orderBy('name'));
  
  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(templates);
  }, (error) => {
    console.error('Error subscribing to templates:', error);
  });
}

/**
 * Get a single template
 */
export async function getTemplate(templateId) {
  const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
  const templateSnap = await getDoc(templateRef);
  
  if (templateSnap.exists()) {
    return { id: templateSnap.id, ...templateSnap.data() };
  }
  return null;
}

/**
 * Update a template
 */
export async function updateTemplate(templateId, updates) {
  const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
  
  const updateData = {
    ...updates,
    placeholders: extractPlaceholders(updates.content || ''),
    updatedAt: serverTimestamp()
  };

  await updateDoc(templateRef, updateData);
  return { id: templateId, ...updateData };
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId) {
  const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
  await deleteDoc(templateRef);
}

/**
 * Seed default templates (call once on setup)
 */
export async function seedDefaultTemplates(userId) {
  const existing = await getTemplates();
  
  // Only seed if no templates exist
  if (existing.length > 0) {
    return existing;
  }

  const templatesRef = collection(db, TEMPLATES_COLLECTION);
  const created = [];

  for (const template of DEFAULT_TEMPLATES) {
    const docData = {
      ...template,
      placeholders: extractPlaceholders(template.content),
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(templatesRef, docData);
    created.push({ id: docRef.id, ...docData });
  }

  return created;
}

/**
 * Extract placeholder keys from content
 */
export function extractPlaceholders(content) {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  
  return matches;
}

/**
 * Replace placeholders in template with actual values
 */
export function fillTemplate(content, values) {
  let filled = content;
  
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    filled = filled.replace(regex, value || '');
  }
  
  return filled;
}

/**
 * Build placeholder values from candidate data
 */
export function buildPlaceholderValues(candidate, additionalData = {}) {
  return {
    firstName: candidate.firstName || '',
    lastName: candidate.lastName || '',
    fullName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
    jobTitle: candidate.jobTitle || '',
    companyName: 'Allied Pharmacies',
    interviewDate: additionalData.interviewDate || '',
    interviewTime: additionalData.interviewTime || '',
    branchAddress: additionalData.branchAddress || '',
    contactName: additionalData.contactName || '',
    contactPhone: additionalData.contactPhone || '',
    ...additionalData
  };
}

/**
 * Generate WhatsApp URL with pre-filled message
 */
export function generateWhatsAppUrl(phoneNumber, message) {
  // Clean phone number (remove spaces, dashes, etc.)
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Handle UK numbers
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '44' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('44') && cleanNumber.length === 10) {
    cleanNumber = '44' + cleanNumber;
  }
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

/**
 * Get category label
 */
export function getCategoryLabel(value) {
  const category = TEMPLATE_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
}
