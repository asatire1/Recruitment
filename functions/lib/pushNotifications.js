"use strict";
/**
 * Allied Recruitment Portal - Push Notification Cloud Functions
 * B4.3: New trial assigned notification
 * B4.4: Feedback reminder notification (24h after trial)
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
exports.onTrialCompleted = exports.sendFeedbackReminders = exports.onTrialCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const options_1 = require("firebase-functions/v2/options");
const admin = __importStar(require("firebase-admin"));
// Set global options
(0, options_1.setGlobalOptions)({
    region: 'europe-west2', // UK region for Allied Pharmacies
    maxInstances: 10,
});
const db = admin.firestore();
const messaging = admin.messaging();
// ============================================================================
// B4.3: NEW TRIAL ASSIGNED NOTIFICATION
// ============================================================================
/**
 * Triggered when a new trial is created
 * Sends push notification to branch managers of the assigned branch
 */
exports.onTrialCreated = (0, firestore_1.onDocumentCreated)('interviews/{interviewId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data in snapshot');
        return;
    }
    const interview = { id: event.params.interviewId, ...snapshot.data() };
    // Only process trials
    if (interview.type !== 'trial') {
        console.log('Not a trial, skipping');
        return;
    }
    // Only notify for scheduled trials
    if (interview.status !== 'scheduled') {
        console.log('Trial not scheduled, skipping');
        return;
    }
    const branchId = interview.branchId;
    if (!branchId) {
        console.log('No branchId, skipping');
        return;
    }
    console.log(`New trial created: ${interview.id} for branch ${branchId}`);
    try {
        // Find branch managers for this branch
        const usersSnapshot = await db
            .collection('users')
            .where('role', '==', 'branch_manager')
            .where('branchIds', 'array-contains', branchId)
            .get();
        if (usersSnapshot.empty) {
            console.log('No branch managers found for this branch');
            return;
        }
        const userIds = usersSnapshot.docs.map((doc) => doc.id);
        console.log(`Found ${userIds.length} branch managers to notify`);
        // Get FCM tokens for these users (handle Firestore 'in' limit of 10)
        const tokensSnapshot = await db
            .collection('fcmTokens')
            .where('userId', 'in', userIds.slice(0, 10))
            .get();
        if (tokensSnapshot.empty) {
            console.log('No FCM tokens found for branch managers');
            // Still create in-app notifications
        }
        const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
        console.log(`Found ${tokens.length} FCM tokens`);
        // Format scheduled date
        const scheduledDate = interview.scheduledAt.toDate();
        const formattedDate = scheduledDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
        // Send push notifications if we have tokens
        if (tokens.length > 0) {
            const notification = {
                tokens,
                notification: {
                    title: 'New Trial Scheduled',
                    body: `${interview.candidateName} - ${formattedDate}`,
                },
                data: {
                    type: 'trial_scheduled',
                    interviewId: interview.id,
                    candidateId: interview.candidateId,
                    candidateName: interview.candidateName,
                    branchId: branchId,
                    branchName: interview.branchName || '',
                    scheduledAt: interview.scheduledAt.toDate().toISOString(),
                    link: `/feedback/${interview.id}`,
                    tag: `trial-${interview.id}`,
                },
                webpush: {
                    fcmOptions: {
                        link: `/feedback/${interview.id}`,
                    },
                    notification: {
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/badge-72x72.png',
                    },
                },
            };
            const response = await messaging.sendEachForMulticast(notification);
            console.log(`Sent ${response.successCount} notifications, ${response.failureCount} failed`);
            // Clean up invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(tokens[idx]);
                        }
                    }
                });
                // Delete invalid tokens
                for (const token of invalidTokens) {
                    await db.collection('fcmTokens').doc(token).delete();
                    console.log(`Deleted invalid token: ${token.substring(0, 20)}...`);
                }
            }
        }
        // Create in-app notification records
        for (const userId of userIds) {
            await db.collection('notifications').add({
                userId,
                type: 'trial_scheduled',
                title: 'New Trial Scheduled',
                message: `${interview.candidateName} has a trial on ${formattedDate}`,
                entityType: 'interview',
                entityId: interview.id,
                link: `/feedback/${interview.id}`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        console.log('In-app notifications created');
    }
    catch (error) {
        console.error('Error sending trial notification:', error);
    }
});
// ============================================================================
// B4.4: FEEDBACK REMINDER NOTIFICATION (24h after trial)
// ============================================================================
/**
 * Scheduled function that runs every hour
 * Checks for completed trials that need feedback reminders
 */
exports.sendFeedbackReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 * * * *', // Every hour at minute 0
    timeZone: 'Europe/London',
    retryCount: 3,
}, async () => {
    console.log('Running feedback reminder check...');
    const now = new Date();
    // Look for trials completed 24-25 hours ago (1 hour window)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    try {
        // Find completed trials without feedback in the 24h window
        const trialsSnapshot = await db
            .collection('interviews')
            .where('type', '==', 'trial')
            .where('status', '==', 'completed')
            .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
            .where('scheduledAt', '>=', admin.firestore.Timestamp.fromDate(twentyFiveHoursAgo))
            .get();
        console.log(`Found ${trialsSnapshot.size} trials in the 24h window`);
        for (const doc of trialsSnapshot.docs) {
            const interview = { id: doc.id, ...doc.data() };
            // Skip if feedback already submitted
            if (interview.feedback) {
                console.log(`Trial ${interview.id} already has feedback, skipping`);
                continue;
            }
            // Check if reminder already sent
            const reminderSent = doc.data().feedbackReminderSent;
            if (reminderSent) {
                console.log(`Reminder already sent for ${interview.id}, skipping`);
                continue;
            }
            const branchId = interview.branchId;
            if (!branchId)
                continue;
            console.log(`Sending feedback reminder for trial ${interview.id}`);
            // Find branch managers
            const usersSnapshot = await db
                .collection('users')
                .where('role', '==', 'branch_manager')
                .where('branchIds', 'array-contains', branchId)
                .get();
            if (usersSnapshot.empty)
                continue;
            const userIds = usersSnapshot.docs.map((d) => d.id);
            // Get FCM tokens
            const tokensSnapshot = await db
                .collection('fcmTokens')
                .where('userId', 'in', userIds.slice(0, 10))
                .get();
            if (!tokensSnapshot.empty) {
                const tokens = tokensSnapshot.docs.map((d) => d.data().token);
                // Send push notification
                const notification = {
                    tokens,
                    notification: {
                        title: 'Feedback Required',
                        body: `Please submit feedback for ${interview.candidateName}'s trial`,
                    },
                    data: {
                        type: 'feedback_required',
                        interviewId: interview.id,
                        candidateId: interview.candidateId,
                        candidateName: interview.candidateName,
                        link: `/feedback/${interview.id}`,
                        tag: `feedback-${interview.id}`,
                        requireInteraction: 'true',
                    },
                    webpush: {
                        fcmOptions: {
                            link: `/feedback/${interview.id}`,
                        },
                        notification: {
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/badge-72x72.png',
                            requireInteraction: true,
                        },
                    },
                };
                const response = await messaging.sendEachForMulticast(notification);
                console.log(`Sent ${response.successCount} feedback reminders for ${interview.id}`);
            }
            // Create in-app notification
            for (const userId of userIds) {
                await db.collection('notifications').add({
                    userId,
                    type: 'feedback_required',
                    title: 'Feedback Required',
                    message: `Please submit feedback for ${interview.candidateName}'s trial`,
                    entityType: 'interview',
                    entityId: interview.id,
                    link: `/feedback/${interview.id}`,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            // Mark reminder as sent
            await doc.ref.update({
                feedbackReminderSent: true,
                feedbackReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        console.log('Feedback reminder check complete');
    }
    catch (error) {
        console.error('Error in feedback reminder job:', error);
        throw error;
    }
});
// ============================================================================
// HELPER: Trigger when trial status changes to completed
// ============================================================================
/**
 * Triggered when a trial is updated
 * Logs when status changes to completed
 */
exports.onTrialCompleted = (0, firestore_1.onDocumentUpdated)('interviews/{interviewId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    // Only process trials
    if (after.type !== 'trial')
        return;
    // Check if status changed to completed
    if (before.status === 'completed' || after.status !== 'completed')
        return;
    console.log(`Trial ${event.params.interviewId} marked as completed`);
    // The scheduled job will handle sending the 24h reminder
});
//# sourceMappingURL=pushNotifications.js.map