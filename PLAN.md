# Allied Pharmacies Recruitment Portal - Project Plan

## Document Version: 2.0 (December 2024)

---

## Overview

A new recruitment portal to streamline the candidate journey from Indeed application through to interview/trial scheduling, before handoff to the existing PHP onboarding portal.

---

## Current Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  NEW PORTAL (what we're building)                               │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │   CV    │ → │ Initial │ → │ Availability│ → │ Interview│     │
│  │ Upload  │   │ Contact │   │ Confirmed  │   │ Scheduled│      │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
│       ↓                                          ↓              │
│   AI Parsing                              Hand off to           │
│   WhatsApp links                          existing system       │
└─────────────────────────────────────────────────────────────────┘
                                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│  EXISTING PORTAL                                                │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │Interview│ → │  Offer  │ → │ Contract│ → │ Complete│         │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions Made

| Decision | Answer |
|----------|--------|
| Handoff to existing system | Manual for now (export/import later) |
| Trial stage | Added with branch manager feedback portal |
| Entity structure | Multiple entities (Allied, Sharief Healthcare, Core Pharmaceuticals, etc.) |
| Design style | Fresh, modern, Apple-style UI |

---

## Development Phases (Revised)

### Phase 1: Foundation & Static UI
**Goal:** Get the basic app structure and navigation in place

**Deliverables:**
- [ ] Project setup (React + Firebase)
- [ ] Basic routing structure
- [ ] Navigation shell (sidebar/header)
- [ ] Static placeholder pages for all main sections
- [ ] Design system basics (colours, typography, components)
- [ ] Mobile-responsive layout

**Pages to create (static):**
- Dashboard (placeholder)
- Candidates list (placeholder)
- Job Listings (placeholder)
- Settings (placeholder)

**Estimated effort:** 1-2 days

---

### Phase 2: Authentication & User Setup
**Goal:** Secure access with role-based permissions foundation

**Deliverables:**
- [ ] Firebase Authentication setup
- [ ] Login page (email/password)
- [ ] Password reset flow
- [ ] Basic user profile
- [ ] Protected routes
- [ ] User roles in Firestore (Recruiter, Admin for now)

**Estimated effort:** 1-2 days

---

### Phase 3: Job Listings Management
**Goal:** Create and manage job listings that CVs will be linked to

**Deliverables:**
- [ ] Job Listings page (list view)
- [ ] Create new job listing form
- [ ] Edit job listing
- [ ] Archive/delete job listing
- [ ] Job listing fields:
  - Title (e.g., "Dispenser")
  - Location/Branch (text for now)
  - Job category (dropdown)
  - Description
  - Status (Active/Paused/Closed)
  - Created date

**Job Categories (configurable):**
- Dispenser
- Counter Assistant
- Pharmacist
- Delivery Driver
- Pharmacy Technician
- Pre-reg Pharmacist
- Cleaner
- Head Office
- Other

**Estimated effort:** 2 days

---

### Phase 4: CV Upload & Basic Candidate Creation
**Goal:** Upload CVs and create candidate records (manual data entry)

**Deliverables:**
- [ ] CV upload component (drag & drop)
- [ ] Job listing selector on upload
- [ ] File storage in Firebase Storage
- [ ] Manual candidate form:
  - Name
  - Email
  - Phone
  - Address (optional)
  - Linked job listing
  - CV file reference
  - Notes
- [ ] Candidate created with status "New"

**Estimated effort:** 2 days

---

### Phase 5: Candidate List & Search
**Goal:** View and manage all candidates

**Deliverables:**
- [ ] Candidates table/list view
- [ ] Search by name, email, phone
- [ ] Filter by:
  - Status
  - Job listing
  - Date range
- [ ] Sort options (newest, name, status)
- [ ] Pagination or infinite scroll
- [ ] Click to view candidate detail

**Estimated effort:** 2 days

---

### Phase 6: Candidate Detail Page
**Goal:** Full candidate profile with all information

**Deliverables:**
- [ ] Candidate header (name, status badge, photo placeholder)
- [ ] Contact information section
- [ ] CV viewer/download
- [ ] Timeline/activity log (static for now)
- [ ] Edit candidate details
- [ ] Status change dropdown
- [ ] Notes section (add/view notes)

**Candidate Statuses:**
1. New
2. Contacted
3. Awaiting Response
4. Availability Confirmed
5. Interview Scheduled
6. Interview Complete
7. Trial Scheduled
8. Trial Complete
9. Awaiting Approval
10. Approved
11. Rejected
12. Withdrawn

**Estimated effort:** 2-3 days

---

### Phase 7: WhatsApp Integration (Basic)
**Goal:** Quick contact via WhatsApp with message templates

**Deliverables:**
- [ ] WhatsApp click-to-chat links (wa.me)
- [ ] Message templates library:
  - Initial contact
  - Availability check
  - Interview invite
  - Trial invite
  - Follow-up
- [ ] Template variable substitution ({{name}}, {{position}}, {{branch}})
- [ ] Copy to clipboard function
- [ ] Log when WhatsApp link clicked

**Estimated effort:** 1-2 days

---

### Phase 8: Interview Scheduling
**Goal:** Schedule and track interviews

**Deliverables:**
- [ ] Schedule interview form:
  - Date & time
  - Duration
  - Location (branch or video call)
  - Interviewer (text field for now)
  - Notes
- [ ] Interview status tracking
- [ ] WhatsApp template for interview invite
- [ ] Calendar view of upcoming interviews (simple)
- [ ] Mark interview as complete
- [ ] Interview outcome (Proceed to Trial / Reject / On Hold)

**Estimated effort:** 2-3 days

---

### Phase 9: Trial Shift Scheduling
**Goal:** Schedule trial shifts with time tracking

**Deliverables:**
- [ ] Schedule trial form:
  - Date
  - Planned start time
  - Planned end time
  - Branch
  - Contact person at branch
- [ ] Trial status tracking
- [ ] WhatsApp template for trial invite
- [ ] View scheduled trials

**Estimated effort:** 1-2 days

---

### Phase 10: Branch Manager Feedback Portal (Basic)
**Goal:** Allow branch managers to submit trial feedback

**Deliverables:**
- [ ] Separate login for branch managers (or magic link)
- [ ] View assigned trial candidates only
- [ ] Trial feedback form:
  - Actual arrival/departure times
  - Punctuality rating
  - Customer Service (1-5 stars + notes)
  - Team Fit (1-5 stars + notes)
  - Technical Skills (1-5 stars + notes)
  - Sales Ability (1-5 stars + notes)
  - BPs completed (optional number)
  - Overall recommendation
  - Would you want them in your branch?
  - Additional comments
- [ ] Submit feedback
- [ ] Feedback visible on candidate detail page

**Estimated effort:** 3-4 days

---

### Phase 11: AI CV Parsing
**Goal:** Automatically extract candidate info from uploaded CVs

**Deliverables:**
- [ ] Integrate AI API (Claude or similar)
- [ ] Parse uploaded CV for:
  - Name
  - Email
  - Phone
  - Address
  - Work experience summary
  - Qualifications
  - Skills
- [ ] Auto-populate candidate form
- [ ] Allow manual corrections
- [ ] Confidence indicators on parsed fields

**Estimated effort:** 2-3 days

---

### Phase 12: Entity & Branch Structure
**Goal:** Support multiple entities and their branches

**Deliverables:**
- [ ] Entities management (Admin only):
  - Allied Pharmacies
  - Sharief Healthcare
  - Core Pharmaceuticals
  - etc.
- [ ] Branches/Sites management:
  - Name
  - Address
  - Entity it belongs to
  - Region
  - Branch manager (link to user)
- [ ] Job listings linked to specific branch
- [ ] Candidates filtered by entity/branch

**Estimated effort:** 2-3 days

---

### Phase 13: Regional Structure & User Roles
**Goal:** Full role-based access control

**Deliverables:**
- [ ] Regions setup (North West, Wales, etc.)
- [ ] Branches assigned to regions
- [ ] User roles:
  - Admin (full access)
  - Recruiter (manage candidates, jobs)
  - Regional Manager (view region only)
  - Branch Manager (feedback only)
  - Director (approvals)
- [ ] User management page (Admin)
- [ ] Invite new users

**Estimated effort:** 3-4 days

---

### Phase 14: Approval Workflow
**Goal:** Configurable approval routing for hiring decisions

**Deliverables:**
- [ ] Approval routing rules setup:
  - By entity
  - By region
  - By role type
  - Assigned approver
- [ ] Submit for approval action
- [ ] Approver dashboard (pending approvals)
- [ ] Approve/Reject with comments
- [ ] Email/notification to approver
- [ ] Status updates on approval

**Estimated effort:** 3-4 days

---

### Phase 15: Activity Timeline & Logging
**Goal:** Full audit trail of candidate journey

**Deliverables:**
- [ ] Activity log for each candidate:
  - Status changes
  - Notes added
  - WhatsApp sent
  - Interview scheduled/completed
  - Trial scheduled/completed
  - Feedback submitted
  - Approval actions
- [ ] Timestamps and user who performed action
- [ ] Filter activity by type

**Estimated effort:** 2 days

---

### Phase 16: Dashboard & Analytics
**Goal:** Overview of recruitment pipeline and metrics

**Deliverables:**
- [ ] Dashboard widgets:
  - Candidates by status (pipeline view)
  - New candidates this week
  - Interviews scheduled today/this week
  - Trials scheduled today/this week
  - Pending approvals count
  - Time-to-hire average
- [ ] Filter by entity/region/date range
- [ ] Quick actions from dashboard

**Estimated effort:** 2-3 days

---

### Phase 17: Bulk Operations & Export
**Goal:** Efficiency features for managing large volumes

**Deliverables:**
- [ ] Bulk CV upload
- [ ] Bulk status update
- [ ] Export candidates to CSV/Excel
- [ ] Export for handoff to existing PHP system
- [ ] Bulk assign to job listing

**Estimated effort:** 2 days

---

### Phase 18: Notifications & Reminders
**Goal:** Keep recruiters informed and candidates engaged

**Deliverables:**
- [ ] Email notifications:
  - New feedback submitted
  - Approval required
  - Approval decision made
- [ ] In-app notifications
- [ ] Reminder system:
  - Follow up on candidates not contacted
  - Candidates awaiting response too long
  - Upcoming interviews/trials today

**Estimated effort:** 2-3 days

---

### Phase 19: Polish & Refinements
**Goal:** Production-ready quality

**Deliverables:**
- [ ] Loading states throughout
- [ ] Error handling & user feedback
- [ ] Empty states design
- [ ] Mobile optimisation
- [ ] Performance optimisation
- [ ] Accessibility review
- [ ] Cross-browser testing

**Estimated effort:** 2-3 days

---

### Phase 20: Future Integrations (Later)
**Goal:** Connect to external systems

**Deliverables:**
- [ ] WhatsApp Business API (automated messaging)
- [ ] API for PHP portal integration
- [ ] Indeed job board sync
- [ ] Calendar integrations (Google/Outlook)

**Estimated effort:** TBD

---

## Summary: Phase Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Auth)
    ↓
Phase 3 (Job Listings) ←──────────────────────┐
    ↓                                         │
Phase 4 (CV Upload) ──────────────────────────┤
    ↓                                         │
Phase 5 (Candidate List)                      │
    ↓                                         │
Phase 6 (Candidate Detail)                    │
    ↓                                         │
┌───┴───┬───────────┬───────────┐            │
↓       ↓           ↓           ↓            │
Ph 7    Ph 8        Ph 9        Ph 11        │
(WhatsApp)(Interview)(Trial)    (AI Parse)   │
        ↓           ↓                        │
        └─────┬─────┘                        │
              ↓                              │
        Phase 10 (Branch Feedback)           │
              ↓                              │
        Phase 12 (Entities/Branches) ────────┘
              ↓
        Phase 13 (Regions/Roles)
              ↓
        Phase 14 (Approvals)
              ↓
┌─────────────┼─────────────┐
↓             ↓             ↓
Ph 15         Ph 16         Ph 17
(Activity)    (Dashboard)   (Bulk Ops)
              ↓
        Phase 18 (Notifications)
              ↓
        Phase 19 (Polish)
              ↓
        Phase 20 (Integrations)
```

---

## Quick Reference: What Each Phase Delivers

| Phase | Standalone Value |
|-------|------------------|
| 1-2 | App shell with secure login |
| 3 | Can create and manage job listings |
| 4-6 | Can upload CVs and track candidates manually |
| 7 | Can contact candidates via WhatsApp |
| 8-9 | Can schedule interviews and trials |
| 10 | Branch managers can submit feedback |
| 11 | CVs auto-parsed (time saver) |
| 12-13 | Multi-entity, multi-branch support |
| 14 | Proper approval workflow |
| 15-16 | Visibility and reporting |
| 17-18 | Efficiency and automation |
| 19 | Production quality |
| 20 | Full ecosystem integration |

---

## Recommended MVP Scope

**Phases 1-7** give you a functional recruitment tool:
- Secure login
- Job listings
- CV upload and candidate tracking
- Search and filter candidates
- WhatsApp contact with templates
- Manual workflow through statuses

This MVP can be used immediately while building out the remaining features.

---

## Next Steps

1. ✅ Plan finalised (v2.0)
2. Begin Phase 1 - Foundation & Static UI
3. Review after each phase
4. Iterate based on feedback

---

*Document updated: December 2024*
*Version: 2.0 - Granular Phases*
