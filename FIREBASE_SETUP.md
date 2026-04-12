# Firebase Migration Setup Guide

This guide walks you through migrating from PostgreSQL to Firebase.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name it (e.g., `deviq`)
4. Choose your region (e.g., `us-central1`)
5. Enable Google Analytics (optional)
6. Click "Create Project"

## Step 2: Get Your Firebase Credentials

### For Frontend (NEXT_PUBLIC_* variables):

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Click on your project
3. Scroll to **Your apps** section
4. Click **Web** icon (or create a new app if needed)
5. Copy the `firebaseConfig` object:

```javascript
{
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### For Backend (Service Account Key):

1. In Firebase Console, go to **Project Settings**
2. Click **Service Accounts** tab
3. Click **Generate new private key**
4. Save the JSON file to: `/home/saket/Desktop/deviq-main/firebase-key.json`
5. ⚠️ Add `firebase-key.json` to `.gitignore` (keep it secret!)

## Step 3: Update Environment Variables

1. Copy `.env.firebase.template` to `.env.local`:
   ```bash
   cp .env.firebase.template .env.local
   ```

2. Fill in your Firebase credentials:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
   ```

## Step 4: Set up OAuth Providers

### Google OAuth:
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Google**
3. Select your Google Cloud project (or create one)
4. Firebase will auto-configure the OAuth consent screen

### GitHub OAuth:
1. Go to **Authentication** > **Sign-in method**
2. Enable **GitHub**
3. Add your GitHub credentials:
   - **Client ID**: `Ov23ligVWTQz0CtoQVzc` (from `.env`)
   - **Client Secret**: (from `.env`)

## Step 5: Set up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose region (same as your project)
4. Select **Start in test mode** (for development)
5. Click **Create**

## Step 6: Create Firestore Security Rules

Once Firestore is created, update the Security Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Public analytics data
    match /analytics/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Step 7: Install Backend Dependencies

```bash
source .venv/bin/activate
pip install firebase-admin
```

## Step 8: Restart Services

```bash
# Frontend will automatically pick up new .env.local
npm run dev

# Backend with Firebase
python -m uvicorn main:app --reload --port 8000
```

## Migration Checklist

- [ ] Firebase project created
- [ ] Credentials copied to `.env.local`
- [ ] OAuth providers configured
- [ ] Firestore database created
- [ ] Security rules updated
- [ ] Backend dependencies installed
- [ ] Services restarted
- [ ] Test login with Google
- [ ] Test login with GitHub
- [ ] Test portfolio data persistence

## File Changes

- `lib/firebase.ts` - Firebase initialization
- `lib/firebaseAuth.ts` - Firebase authentication utilities
- `main.py` - Updated to use Firebase Admin SDK
- `.env.local` - New Firebase credentials (create from template)

## What Gets Replaced

- ❌ PostgreSQL database → ✅ Firestore
- ❌ Backend session management → ✅ Firebase Authentication
- ❌ Custom auth endpoints → ✅ Firebase Auth SDK (frontend)
- ✅ GitHub analytics (stays the same)
- ✅ Frontend UI (mostly stays the same, just uses new auth)

## Troubleshooting

**"Firebase config not found"** → Make sure `.env.local` is created with Firebase credentials

**"OAuth popup blocked"** → Check browser console for errors, may need to allow popups

**"Firestore permission denied"** → Check security rules in Firebase Console

**"Service account not found"** → Make sure `firebase-key.json` is in the project root
