# Firebase Migration - Next Steps

Your project is now ready for Firebase! Before running the app, you need to:

## 1. Create a Firebase Project (1 min)

1. Visit: https://console.firebase.google.com/
2. Click **Add Project**
3. Name: `deviq` (or your choice)
4. Click **Create Project**

## 2. Get Your Frontend Credentials (2 min)

1. In Firebase Console, click **Project Settings** (gear icon)
2. Under **Your apps**, click **Web** (or create a web app)
3. Copy this config:

```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

4. Create `.env.local` in project root:

```bash
cp .env.firebase.template .env.local
```

5. Edit `.env.local` and fill in your Firebase credentials from step 3

## 3. Get Your Backend Service Account Key (2 min)

1. In Firebase Console → **Project Settings**
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save JSON file as: `firebase-key.json` in project root
5. ⚠️ This file is automatically ignored by git (see .gitignore)

## 4. Set up Firestore Database (2 min)

1. Go to **Firestore Database** in Firebase Console
2. Click **Create Database**
3. Choose region (e.g., `us-central1`)
4. Select **Start in test mode**
5. Click **Create**

## 5. Configure OAuth Providers (2 min)

### Google OAuth:
1. Go to **Authentication** → **Sign-in method**
2. Enable **Google** - Firebase auto-configures this

### GitHub OAuth:
1. Still in **Sign-in method**, enable **GitHub**
2. **Client ID**: (from your `.env`)
3. **Client Secret**: (from your `.env`)
4. Click **Save**

## 6. Update Firestore Security Rules (1 min)

1. Go to **Firestore Database** → **Rules** tab
2. Replace rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

## 7. Install Python Dependencies

```bash
cd /home/saket/Desktop/deviq-main
source .venv/bin/activate
pip install firebase-admin
```

## 8. Restart Services

```bash
# In new terminal, make sure .env.local is created!
npm run dev

# In another terminal
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

## 9. Test It!

1. Open http://localhost:3000
2. Click "Sign in with Google" or "Sign in with GitHub"
3. Complete the OAuth flow
4. You should see your profile with avatar!

## Files Changed

- ✅ `lib/firebase.ts` - Flask initialization
- ✅ `lib/firebaseAuth.ts` - Auth utilities
- ✅ `main.py` - Backend uses Firebase instead of PostgreSQL
- ✅ `.env.local` - Create from template with your credentials
- ✅ `firebase-key.json` - Download from Firebase Console
- ✅ `.gitignore` - Protects sensitive files

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase config not found" | Run `cp .env.firebase.template .env.local` and fill in credentials |
| "firebase-key.json not found" | Download it from Firebase Console → Project Settings → Service Accounts |
| OAuth popup blocked | Check browser console; may need to allow popups |
| "Firestore permission denied" | Verify security rules are published (see step 6) |
| "Module not found: firebase" | Run `npm install firebase` |
| "Module not found: firebase_admin" | Run `pip install firebase-admin` |

## Document References

- Full setup guide: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- Environment template: [.env.firebase.template](./.env.firebase.template)
- Frontend auth utilities: [lib/firebaseAuth.ts](./lib/firebaseAuth.ts)
- Backend API: [main.py](./main.py)

---

**⏭️ Ready?** Start with step 1 above! It should take about 10-15 minutes total.
