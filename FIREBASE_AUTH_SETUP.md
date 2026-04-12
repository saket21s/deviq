# Firebase Authentication Setup Guide

## Error: `auth/configuration-not-found`

This error occurs when Firebase OAuth providers aren't properly configured. Follow these steps to fix it:

## Step 1: Enable OAuth Providers in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **developerintelligencedashboard**
3. Navigate to **Authentication** → **Sign-in method** tab

### Enable Google OAuth:
- Click **Google** in the sign-in methods list
- Toggle **Enable** to ON
- Select your Google Cloud project (or create one)
- Click **Save**

### Enable GitHub OAuth:
- Click **GitHub** in the sign-in methods list
- Toggle **Enable** to ON
- You'll see a field for "Client ID" and "Client Secret"
- Enter your GitHub OAuth credentials:
  - **Client ID**: `Ov23ligVWTQz0CtoQVzc` (from your `.env.local`)
  - **Client Secret**: (from your GitHub OAuth app settings)
- Click **Save**

## Step 2: Configure Authorized Redirect URIs

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Click **Authorized domains** tab
3. Add your domain:
   - For development: `localhost:3000`
   - For production: `saket21s.github.io`
   - For custom domain: `deviq.online`

## Step 3: Verify GitHub OAuth App Configuration

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Find your OAuth app and click **Edit**
3. Set **Authorization callback URL** to:
   ```
   https://developerintelligencedashboard.firebaseapp.com/__/auth/handler
   ```
4. Save changes

## Step 4: Check Your Environment Variables

Your `.env.local` should have:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBTIK-1Qh5IB4aIikaXVUZtgVFcslH1KHM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=developerintelligencedashboard.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=developerintelligencedashboard
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=developerintelligencedashboard.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=308007699591
NEXT_PUBLIC_FIREBASE_APP_ID=1:308007699591:web:1fe21b9bdd1bd9bab96422

NEXT_PUBLIC_GITHUB_CLIENT_ID=Ov23ligVWTQz0CtoQVzc
NEXT_PUBLIC_GOOGLE_CLIENT_ID=25241869105-48a4ta3lnco9pcc2osfu6s37pbn9uuef.apps.googleusercontent.com
```

## Step 5: Test Authentication

1. Restart your dev server:
   ```bash
   npm run dev
   ```
2. Go to http://localhost:3000
3. Click "Sign up" or "Log in"
4. Try "Continue with Google" or "Continue with GitHub"
5. Complete the OAuth flow

## Troubleshooting

### Still getting `auth/configuration-not-found`?

1. **Clear browser cache**: Delete localStorage/sessionStorage
   - Open DevTools → Application → Storage
   - Clear all data
   - Refresh page

2. **Check Network tab**: 
   - Open DevTools → Network
   - Click "Continue with Google/GitHub"
   - Look for errors in the requests
   - Check if you're getting CORS errors

3. **Verify Firebase initialization**:
   - Open DevTools → Console
   - Type: `firebase.auth()`
   - Should return Auth instance, not undefined

4. **Check localhost blocking**:
   - Try accessing from `http://127.0.0.1:3000` instead of `localhost:3000`
   - Some OAuth providers treat them differently

### Common Issues

| Error | Solution |
|-------|----------|
| `auth/operation-not-supported-in-this-environment` | Make sure you're using a browser environment, not SSR |
| `auth/popup-blocked` | Check browser popup settings; allow popups for your domain |
| `auth/invalid-api-key` | Verify `NEXT_PUBLIC_FIREBASE_API_KEY` is correct |
| `auth/invalid-user-token` | User session expired; clear cache and try again |

## Firebase Console Checklist

- [ ] Google OAuth enabled in Authentication → Sign-in method
- [ ] GitHub OAuth enabled in Authentication → Sign-in method
- [ ] Authorized domains include your development/production URLs
- [ ] GitHub OAuth app has correct redirect URI
- [ ] All environment variables are set correctly
- [ ] No typos in OAuth provider credentials

## Production Deployment

For **deviq.online** or **saket21s.github.io**:

1. Update `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to match production domain
2. Add production domain to authorized domains
3. Update GitHub OAuth app redirect URL to production
4. Rebuild and deploy:
   ```bash
   npm run build
   npm run deploy
   ```

---

If you're still getting errors after following these steps, check the [Firebase Auth Troubleshooting](https://firebase.google.com/docs/auth/troubleshoot) guide.
