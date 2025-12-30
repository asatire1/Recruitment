// ============================================================================
// Allied Recruitment Portal - Firestore Rules for Feedback (R10.1)
// Add these rules to your firestore.rules file
// ============================================================================

/*
Add to your existing firestore.rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... your existing rules ...

    // ========================================================================
    // INTERVIEW FEEDBACK COLLECTION (R10.1)
    // ========================================================================
    
    match /interviewFeedback/{feedbackId} {
      // Allow read for authenticated users with recruiter+ role
      allow read: if isAuthenticated() && hasAnyRole(['super_admin', 'recruiter', 'regional_manager']);
      
      // Allow branch managers to read feedback for their branches
      allow read: if isAuthenticated() 
        && hasRole('branch_manager') 
        && resource.data.branchId in getUserBranches();
      
      // Allow create for recruiters and admins
      allow create: if isAuthenticated() 
        && hasAnyRole(['super_admin', 'recruiter'])
        && request.resource.data.submittedBy == request.auth.uid;
      
      // Allow update for the submitter (before final submission) or admins
      allow update: if isAuthenticated() 
        && (
          // Submitter can update their own draft
          (resource.data.submittedBy == request.auth.uid && resource.data.status in ['pending', 'draft'])
          // Admins can update any
          || hasRole('super_admin')
          // Recruiters can update submitted feedback for review
          || (hasRole('recruiter') && resource.data.status == 'submitted')
        );
      
      // Only admins can delete
      allow delete: if isAuthenticated() && hasRole('super_admin');
    }
    
    // ========================================================================
    // SCORECARD TEMPLATES COLLECTION (R10.3)
    // ========================================================================
    
    match /scorecardTemplates/{templateId} {
      // Anyone authenticated can read templates
      allow read: if isAuthenticated();
      
      // Only admins can create/update/delete templates
      allow create, update, delete: if isAuthenticated() && hasRole('super_admin');
    }
    
    // ========================================================================
    // FEEDBACK CRITERIA COLLECTION (optional - for custom criteria library)
    // ========================================================================
    
    match /feedbackCriteria/{criterionId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && hasAnyRole(['super_admin', 'recruiter']);
    }

    // ========================================================================
    // HELPER FUNCTIONS (add if not already present)
    // ========================================================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function hasAnyRole(roles) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }
    
    function getUserBranches() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchIds;
    }
  }
}
*/

// ============================================================================
// Firestore Indexes for Feedback Queries
// Add to firestore.indexes.json
// ============================================================================

/*
Add these indexes to your firestore.indexes.json:

{
  "indexes": [
    // ... your existing indexes ...
    
    // Feedback by candidate
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "candidateId", "order": "ASCENDING" },
        { "fieldPath": "interviewDate", "order": "DESCENDING" }
      ]
    },
    
    // Feedback by status (for pending queue)
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    
    // Feedback by submitter
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "submittedBy", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    },
    
    // Feedback by interview
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "interviewId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // Pending feedback by branch (for branch managers)
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    
    // Overdue feedback
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isOverdue", "order": "ASCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    
    // Feedback by job for comparison
    {
      "collectionGroup": "interviewFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "jobId", "order": "ASCENDING" },
        { "fieldPath": "scores.weightedAverage", "order": "DESCENDING" }
      ]
    }
  ]
}
*/
