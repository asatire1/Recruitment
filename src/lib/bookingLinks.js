/**
 * Booking Links Utility
 * 
 * Generates and manages unique booking links for candidates
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generate a unique booking token
 */
function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Create a booking link for a candidate
 * 
 * @param {Object} options
 * @param {string} options.candidateId - The candidate's ID
 * @param {string} options.candidateName - The candidate's name
 * @param {string} options.type - 'interview' or 'trial'
 * @param {string} options.jobId - Optional job ID
 * @param {string} options.jobTitle - Optional job title
 * @param {string} options.location - Optional location
 * @param {number} options.expiryDays - Days until link expires (default: 7)
 * @returns {Promise<Object>} The created booking link data
 */
export async function createBookingLink({
  candidateId,
  candidateName,
  type = 'interview',
  jobId = null,
  jobTitle = null,
  location = null,
  expiryDays = 7
}) {
  const token = generateToken();
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const linkData = {
    token,
    candidateId,
    candidateName,
    type,
    jobId,
    jobTitle,
    location,
    expiresAt,
    used: false,
    createdAt: serverTimestamp(),
  };

  // Store with token as document ID for easy lookup
  await addDoc(collection(db, 'bookingLinks'), linkData);

  // Also store by token for quick access
  const { setDoc, doc } = await import('firebase/firestore');
  await setDoc(doc(db, 'bookingLinks', token), linkData);

  return {
    token,
    url: getBookingUrl(token),
    expiresAt,
    type
  };
}

/**
 * Get the full booking URL for a token
 */
export function getBookingUrl(token) {
  // Use the GitHub Pages URL
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  return `${baseUrl}/book/${token}`;
}

/**
 * Generate WhatsApp message with booking link
 */
export function generateBookingMessage({
  candidateName,
  type,
  jobTitle,
  location,
  bookingUrl
}) {
  const firstName = candidateName.split(' ')[0];
  const typeLabel = type === 'interview' ? 'an interview' : 'a trial shift';
  
  let message = `Hi ${firstName},\n\n`;
  message += `Thanks for your application to Allied Pharmacies!\n\n`;
  
  if (type === 'interview') {
    message += `We'd like to invite you to an interview`;
  } else {
    message += `We'd like to invite you to a trial shift`;
  }
  
  if (jobTitle) {
    message += ` for the ${jobTitle} position`;
  }
  
  if (location) {
    message += ` at ${location}`;
  }
  
  message += `.\n\n`;
  message += `📅 Please choose a time that suits you:\n`;
  message += `${bookingUrl}\n\n`;
  message += `This link will expire in 7 days.\n\n`;
  message += `Looking forward to meeting you!\n\n`;
  message += `Allied Recruitment Team`;
  
  return message;
}

/**
 * Open WhatsApp with pre-filled booking message
 */
export function openWhatsAppWithBooking({
  phone,
  candidateName,
  type,
  jobTitle,
  location,
  bookingUrl
}) {
  const message = generateBookingMessage({
    candidateName,
    type,
    jobTitle,
    location,
    bookingUrl
  });
  
  // Format phone for WhatsApp
  let formattedPhone = phone.replace(/[^0-9+]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+44' + formattedPhone.substring(1);
  }
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }
  
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}
