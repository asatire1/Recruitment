# Allied Recruitment Portal

Multi-entity recruitment management system for Allied Pharmacies built with React, Firebase, and Algolia.

## Features

- ✅ **Multi-entity Support** - Allied, Sharief Healthcare, Core Pharmaceuticals
- ✅ **Role-based Access** - Super Admin, Recruiter, Regional Manager, Branch Manager, Viewer
- ✅ **Candidate Pipeline** - Track candidates through 8 stages
- ✅ **Job Management** - Create and manage job postings
- ✅ **WhatsApp Integration** - Templates with 18 dynamic placeholders
- ✅ **Calendar System** - Month/Week/Day views with event management
- ✅ **Self-service Booking** - Public booking pages for candidates
- ✅ **AI CV Parsing** - Claude-powered resume extraction
- ✅ **Algolia Search** - Instant search with filters and facets
- ✅ **Branch Manager PWA** - Mobile-first app with offline support

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Algolia account (for search)
- Anthropic API key (for CV parsing)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd allied-portal-app
npm install
cd functions && npm install && cd ..
```

### 2. Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

2. Enable these services:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Functions (Blaze plan required)
   - Hosting

3. Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init
```

4. Get your Firebase config from Project Settings → General → Your Apps → Web App

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123:web:abc123

REACT_APP_ALGOLIA_APP_ID=your_algolia_app_id
REACT_APP_ALGOLIA_SEARCH_KEY=your_search_only_key
```

### 4. Algolia Setup (Optional - for search)

1. Create account at [algolia.com](https://www.algolia.com)
2. Create an index named `allied_candidates`
3. Create replica indexes for sorting:
   - `allied_candidates_created_desc`
   - `allied_candidates_experience_desc`
   - `allied_candidates_experience_asc`
   - `allied_candidates_name_asc`
   - `allied_candidates_name_desc`

### 5. Firebase Functions Config (for CV parsing)

```bash
firebase functions:config:set \
  anthropic.api_key="your_claude_api_key" \
  algolia.app_id="your_algolia_app_id" \
  algolia.admin_key="your_algolia_admin_key"
```

### 6. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 7. Create Initial Admin User

1. Run the app: `npm start`
2. Go to Firebase Console → Authentication → Add User
3. Create user with email/password
4. Go to Firestore → Create collection `users`
5. Add document with ID = user's UID:

```json
{
  "email": "admin@allied.com",
  "displayName": "Admin User",
  "role": "super_admin",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 8. Run Development Server

```bash
npm start
```

App runs at [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy Everything

```bash
npm run deploy
```

### Deploy Individually

```bash
# Hosting only
npm run deploy:hosting

# Functions only
npm run deploy:functions

# Firestore rules
firebase deploy --only firestore:rules
```

## Project Structure

```
allied-portal-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   ├── offline.html
│   └── icons/
├── src/
│   ├── components/      # Reusable components
│   ├── contexts/        # React contexts (Auth)
│   ├── hooks/           # Custom hooks
│   ├── layouts/         # Page layouts
│   ├── pages/           # Route pages
│   │   └── manager/     # PWA manager pages
│   ├── config/          # Firebase & Algolia config
│   ├── styles/          # Global CSS
│   ├── App.jsx
│   └── index.js
├── functions/           # Firebase Cloud Functions
├── firebase.json
├── firestore.rules
└── package.json
```

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Full access to everything |
| `recruiter` | Candidates, Jobs, Templates, Calendar |
| `regional_manager` | View all, manage assigned region |
| `branch_manager` | PWA access, manage assigned branch |
| `viewer` | Read-only access |

## Routes

### Main Portal
- `/dashboard` - Overview stats
- `/candidates` - Candidate list
- `/candidates/:id` - Candidate detail
- `/search` - Advanced search (Algolia)
- `/jobs` - Job listings
- `/jobs/:id` - Job detail
- `/calendar` - Event calendar
- `/templates` - WhatsApp templates
- `/settings` - Admin settings

### Manager PWA
- `/manager` - Manager dashboard
- `/manager/reviews` - Pending candidate reviews
- `/manager/schedule` - Today's schedule

### Public
- `/login` - Authentication
- `/book/:slug` - Public booking page

## PWA Features

The Branch Manager portal is a Progressive Web App:

1. **Install on Device**
   - iOS: Safari → Share → Add to Home Screen
   - Android: Chrome → Menu → Install App

2. **Offline Support**
   - Cached pages work offline
   - Actions queue for sync

3. **Push Notifications** (requires setup)
   - New candidate alerts
   - Upcoming events

## Tech Stack

- **Frontend**: React 18, React Router 6
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Search**: Algolia
- **AI**: Claude API (CV parsing)
- **Styling**: CSS Custom Properties

## Scripts

```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
npm run deploy     # Deploy to Firebase
npm run emulators  # Run Firebase emulators
```

## Troubleshooting

### "Permission denied" errors
- Check Firestore rules are deployed
- Verify user has correct role in `users` collection

### Search not working
- Verify Algolia credentials in `.env`
- Check Algolia dashboard for index status

### CV parsing fails
- Verify Claude API key in Functions config
- Check Functions logs: `firebase functions:log`

### PWA not installing
- Must be served over HTTPS
- Check manifest.json is valid

## Support

For issues, create a GitHub issue or contact the development team.

## License

© 2024 Allied Pharmacies. All rights reserved.
