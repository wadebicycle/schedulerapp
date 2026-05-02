# Scheduler App

A professional weekly planner built with React + Vite + TypeScript.

## Features

- Weekly schedule grid (Mon–Sun, 7:00–22:00)
- Add, edit, delete tasks with color coding
- Week navigation with color labels
- Year summary view (52 weeks)
- Dark/light theme toggle
- Language support (English & Vietnamese)
- Background chill music player
- **Google Sign-In** with Firestore cloud sync
  - Data synced across devices when logged in
  - Falls back to localStorage when not logged in

## Tech Stack

- React 19 + TypeScript
- Vite (port 5000)
- Tailwind CSS v4
- shadcn/ui components (base-ui)
- Firebase (Auth + Firestore)
- lucide-react icons
- date-fns, sonner

## Project Structure

```
src/
  App.tsx           - Main app with auth & sync logic
  types.ts          - TypeScript types
  components/
    ScheduleGrid.tsx - Weekly schedule grid component
  lib/
    firebase.ts     - Firebase auth & Firestore helpers
    storage.ts      - Local storage helpers
    i18n.ts         - Translations (en/vi)
components/ui/      - shadcn/ui components
```

## Firebase Setup

Requires secrets:
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_API_KEY`

Firebase project needs:
- Google Sign-In enabled in Authentication
- Firestore database enabled
- Replit domain added to Authorized Domains
