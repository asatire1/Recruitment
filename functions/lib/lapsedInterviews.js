"use strict";
/**
 * Lapsed Interviews Functions
 *
 * Handles marking interviews as lapsed when they pass their scheduled date
 * without being completed, and resolving them when appropriate.
 *
 * Updated: Auto-resolve lapsed interviews when candidate status changes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCandidateWithdrawnOrRejected = exports.onCandidateStatusChange = exports.resolveLapsedInterview = exports.markLapsedInterviews = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
// ============================================================================
// Statuses that should auto-resolve lapsed interviews
// ============================================================================
const AUTO_RESOLVE_STATUSES = [
    'withdrawn',
    'rejected',
    'trial_scheduled',
    'trial_complete',
    'approved',
    'hired'
];
// ============================================================================
// Mark Lapsed Interviews (Scheduled Function)
// Runs daily at 6 AM to mark overdue interviews as lapsed
// ============================================================================
exports.markLapsedInterviews = (0, scheduler_1.onSchedule)({
    schedule: '0 6 * * *', // Daily at 6 AM
    timeZone: 'Europe/London',
    region: 'europe-west2',
}, async () => {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Find interviews that are scheduled but past their date
        const interviewsSnapshot = await db
            .collection('interviews')
            .where('status', '==', 'scheduled')
            .where('scheduledDate', '<', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
            .get();
        if (interviewsSnapshot.empty) {
            logger.info('No lapsed interviews found');
            return;
        }
        const batch = db.batch();
        let count = 0;
        for (const doc of interviewsSnapshot.docs) {
            const interview = doc.data();
            // Check if candidate status should prevent lapsing
            if (interview.candidateId) {
                const candidateDoc = await db.collection('candidates').doc(interview.candidateId).get();
                if (candidateDoc.exists) {
                    const candidate = candidateDoc.data();
                    if (candidate && AUTO_RESOLVE_STATUSES.includes(candidate.status)) {
                        // Don't mark as lapsed, resolve it instead
                        batch.update(doc.ref, {
                            status: 'resolved',
                            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                            resolvedReason: `Auto-resolved: candidate status is ${candidate.status}`,
                        });
                        count++;
                        continue;
                    }
                }
            }
            // Mark as lapsed
            batch.update(doc.ref, {
                status: 'lapsed',
                lapsedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            count++;
        }
        await batch.commit();
        logger.info(`Processed ${count} interviews (marked lapsed or auto-resolved)`);
    }
    catch (error) {
        logger.error('Error marking lapsed interviews:', error);
        throw error;
    }
});
exports.resolveLapsedInterview = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const { interviewId, resolution, notes, newDate } = request.data;
    if (!interviewId || !resolution) {
        throw new https_1.HttpsError('invalid-argument', 'Missing interviewId or resolution');
    }
    try {
        const interviewRef = db.collection('interviews').doc(interviewId);
        const interviewDoc = await interviewRef.get();
        if (!interviewDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Interview not found');
        }
        const interview = interviewDoc.data();
        // Determine new status based on resolution
        let newStatus;
        const updateData = {
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolvedBy: request.auth?.uid || 'system',
            resolutionNotes: notes || '',
        };
        switch (resolution) {
            case 'rescheduled':
                if (!newDate) {
                    throw new https_1.HttpsError('invalid-argument', 'New date required for rescheduling');
                }
                newStatus = 'scheduled';
                updateData.scheduledDate = admin.firestore.Timestamp.fromDate(new Date(newDate));
                updateData.rescheduledFrom = interview?.scheduledDate;
                break;
            case 'completed':
                newStatus = 'completed';
                break;
            case 'cancelled':
                newStatus = 'cancelled';
                break;
            case 'no_show':
                newStatus = 'no_show';
                break;
            default:
                throw new https_1.HttpsError('invalid-argument', 'Invalid resolution type');
        }
        updateData.status = newStatus;
        await interviewRef.update(updateData);
        // If no_show, update candidate status
        if (resolution === 'no_show' && interview?.candidateId) {
            await db.collection('candidates').doc(interview.candidateId).update({
                lastInterviewNoShow: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        logger.info(`Lapsed interview ${interviewId} resolved as ${resolution}`);
        return { success: true, newStatus };
    }
    catch (error) {
        logger.error('Error resolving lapsed interview:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to resolve interview');
    }
});
// ============================================================================
// Auto-resolve lapsed interviews when candidate status changes
// ============================================================================
exports.onCandidateStatusChange = (0, firestore_1.onDocumentUpdated)({
    document: 'candidates/{candidateId}',
    region: 'europe-west2',
}, async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const candidateId = event.params.candidateId;
    if (!beforeData || !afterData)
        return;
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    // Only proceed if status changed to an auto-resolve status
    if (oldStatus === newStatus || !AUTO_RESOLVE_STATUSES.includes(newStatus)) {
        return;
    }
    logger.info(`Candidate ${candidateId} status changed from ${oldStatus} to ${newStatus}`);
    try {
        // Find all lapsed interviews for this candidate
        const lapsedInterviews = await db
            .collection('interviews')
            .where('candidateId', '==', candidateId)
            .where('status', '==', 'lapsed')
            .get();
        if (lapsedInterviews.empty) {
            logger.info(`No lapsed interviews found for candidate ${candidateId}`);
            return;
        }
        const batch = db.batch();
        let count = 0;
        for (const doc of lapsedInterviews.docs) {
            batch.update(doc.ref, {
                status: 'resolved',
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                resolvedBy: 'system',
                resolvedReason: `Auto-resolved: candidate status changed to ${newStatus}`,
            });
            count++;
        }
        await batch.commit();
        logger.info(`Auto-resolved ${count} lapsed interviews for candidate ${candidateId}`);
    }
    catch (error) {
        logger.error(`Error auto-resolving lapsed interviews for ${candidateId}:`, error);
    }
});
// ============================================================================
// Also resolve scheduled (not yet lapsed) interviews when candidate withdraws/rejected
// ============================================================================
exports.onCandidateWithdrawnOrRejected = (0, firestore_1.onDocumentUpdated)({
    document: 'candidates/{candidateId}',
    region: 'europe-west2',
}, async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const candidateId = event.params.candidateId;
    if (!beforeData || !afterData)
        return;
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    // Only proceed if status changed to withdrawn or rejected
    if (oldStatus === newStatus || !['withdrawn', 'rejected'].includes(newStatus)) {
        return;
    }
    try {
        // Find all scheduled interviews for this candidate
        const scheduledInterviews = await db
            .collection('interviews')
            .where('candidateId', '==', candidateId)
            .where('status', '==', 'scheduled')
            .get();
        if (scheduledInterviews.empty) {
            return;
        }
        const batch = db.batch();
        let count = 0;
        for (const doc of scheduledInterviews.docs) {
            batch.update(doc.ref, {
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancelledReason: `Candidate ${newStatus}`,
            });
            count++;
        }
        await batch.commit();
        logger.info(`Cancelled ${count} scheduled interviews for ${newStatus} candidate ${candidateId}`);
    }
    catch (error) {
        logger.error(`Error cancelling interviews for ${candidateId}:`, error);
    }
});
//# sourceMappingURL=lapsedInterviews.js.map