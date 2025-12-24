# Allied Pharmacies Recruitment Portal

A modern recruitment portal built with React + Vite + Firebase, designed to streamline the candidate journey from CV upload through to interview scheduling.

## Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** CSS with custom design system (Apple-inspired)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Icons:** Lucide React
- **Routing:** React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Enable Storage
   - Copy your config to `.env.local` (see `.env.example`)

4. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

Create a `.env.local` file with:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Project Structure

```
src/
├── components/
│   ├── layout/         # Layout components (Sidebar, Header)
│   ├── ui/             # Reusable UI components (Button, Card, etc.)
│   └── common/         # Shared components
├── pages/
│   ├── Dashboard/      # Main dashboard
│   ├── Candidates/     # Candidate management
│   ├── Jobs/           # Job listings
│   └── Settings/       # Settings pages
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── lib/                # Firebase and utility functions
├── config/             # Configuration files
└── styles/             # Global styles and design system
```

## Development Phases

See `PLAN.md` for the complete development roadmap.

### Phase 1: Foundation ✅
- Project setup (React + Firebase)
- Basic routing structure
- Navigation shell (sidebar/header)
- Static placeholder pages
- Design system (colours, typography, components)
- Mobile-responsive layout

### Next: Phase 2 - Authentication
- Firebase Authentication setup
- Login page
- Protected routes
- User roles

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Design System

The portal uses a custom CSS design system with:

- **Colors:** Pharmaceutical blue primary with warm neutral grays
- **Typography:** SF Pro inspired system font stack
- **Spacing:** 4px base unit scale
- **Components:** Button, Card, Badge, Input (with variants)
- **Shadows:** Apple-style subtle depth

See `src/styles/design-system.css` for all design tokens.

## License

Proprietary - Allied Pharmacies
