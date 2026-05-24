# Lyvee

Shared life management for households and groups. Everything is an **Item** — tasks, activities, documents, and reminders unified under one model.

## Tech Stack

- **React Native** (Expo SDK 56)
- **Firebase** (Auth + Firestore)
- **Expo Notifications** (local push reminders)
- **Expo Router** (file-based navigation)

## Features

- Email/password authentication with session persistence
- Groups with invite codes for household members
- Unified Item system (task · activity · document)
- Calendar-centric month view with dot indicators
- Recurring items (daily, weekly, monthly, yearly)
- Visibility controls (everyone, private, custom)
- Real-time sync via Firestore listeners
- Local notifications for upcoming items

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Firestore** database
4. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Or manually paste `firestore.rules` and `firestore.indexes.json` in the Firebase Console.

### 4. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS simulator.

## Project Structure

```
app/                    # Expo Router screens
  (auth)/               # Login & signup
  (app)/                # Main tabs (calendar, items, groups, settings)
  (app)/item/           # Item create & detail modals
src/
  components/           # Reusable UI components
  config/               # Firebase initialization
  constants/            # Theme & design tokens
  context/              # Auth & app state providers
  services/             # Firebase service layer
  types/                # TypeScript data models
  utils/                # Date & recurrence helpers
```

## Data Model

### Item (unified)

| Field | Type | Description |
|-------|------|-------------|
| `type` | task · activity · document | What kind of item |
| `dateTime` | ISO string | When it happens |
| `recurringRule` | object | Repeat schedule |
| `visibility` | everyone · private · custom | Who can see it |
| `assignedTo` | userId[] | Assigned members |
| `notes` | string | Free-form details |

### Group

Shared workspace with invite codes. All items belong to a group.

## Architecture Notes

- **Single Item model** — no separate task/event/reminder systems
- **Real-time sync** — Firestore `onSnapshot` listeners in context providers
- **Client-side visibility** — items filtered by visibility rules after fetch
- **Local notifications** — scheduled on device when items sync

## License

Private — all rights reserved.
