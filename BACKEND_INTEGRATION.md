# Backend Integration Guide

## Frontend Authentication Flow

### 1. Session-Based Authentication (via Cookies)

The frontend now supports **session-based authentication** with your backend using HTTP-only cookies. This is more secure than token-based auth.

#### Key Features:
- ✅ All API requests automatically include credentials (`credentials: 'include'`)
- ✅ Backend sets session cookies on successful login
- ✅ Frontend automatically reads session on app load via `GET /auth/me`
- ✅ Works with localhost:8000 and production backends
- ✅ Automatic fallback to localStorage when backend is unavailable

### 2. Authentication Endpoints

#### Email/Password Auth
```javascript
// Signup
POST /auth/signup
Body: { name, email, password, avatar?, provider? }

// Login
POST /auth/login
Body: { email, password }

// Logout
POST /auth/logout

// Get current user (with credentials cookie)
GET /auth/me
```

#### Gmail Direct Login (New!)
```javascript
// Direct Gmail login via backend
POST /auth/gmail/login
Credentials: included in request
Returns: { name, email, avatar, provider: "google" }
```

#### OAuth Callback
```javascript
// After OAuth popup closes with code
POST /auth/oauth
Body: { name, email, avatar, provider: "google" | "github" }
```

### 3. Profile Sync Endpoints

#### Get Profile
```javascript
GET /profile
Credentials: included
Returns: UserProfile object
```

#### Save Profile
```javascript
PUT /profile
Credentials: included
Body: UserProfile
```

#### Sync Profile (Real-time cross-device sync)
```javascript
// NEW: Dedicated endpoint for immediate cross-device sync
POST /sync/profile
Credentials: included
Body: UserProfile
Returns: Updated UserProfile with server-side changes
```

### 4. Data Flow

#### On App Load:
1. `GET /auth/me` (with credentials cookie)
   - If successful → User is logged in
   - If fails → Check localStorage for session

2. `GET /profile` (with credentials cookie)
   - Loads user's profile from backend
   - Falls back to localStorage if backend unavailable

#### On Login/Signup:
1. `POST /auth/login` or `POST /auth/signup`
   - Backend sets session cookie
   - Frontend saves user to localStorage as backup
   - Frontend loads profile from backend or localStorage

#### On Profile Update:
1. Frontend saves to localStorage immediately (instant UI update)
2. Calls `POST /sync/profile` to backend asynchronously
3. If `/sync/profile` not available, falls back to `PUT /profile`
4. Updates localStorage with server response

#### On Analysis Complete:
1. Increments `analysesRun` counter locally
2. Calls `POST /sync/profile` to backend
3. Updates UI with latest profile data

### 5. Required Backend Setup

Your backend needs to support:

1. **Session Cookies**
   - Set `Set-Cookie` header on login with `HttpOnly`, `SameSite=Lax`
   - Validate session cookie on protected endpoints
   - Clear cookie on logout

2. **CORS Settings** (if frontend and backend on different ports)
   ```python
   CORSMiddleware(
       allow_origins=["http://localhost:3000", "your-domain.com"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Endpoints**
   - ✅ POST /auth/signup
   - ✅ POST /auth/login
   - ✅ POST /auth/logout
   - ✅ GET /auth/me (validate cookie)
   - ✅ POST /auth/gmail/login (optional, new)
   - ✅ POST /auth/oauth (optional)
   - ✅ GET /profile
   - ✅ PUT /profile
   - ⏳ POST /sync/profile (optional, for real-time sync)

### 6. Frontend Functions

```javascript
// Login with email/password
await apiLogin(email, password)

// Signup
await apiSignup(name, email, password)

// OAuth login
await apiOAuth({ name, email, avatar, provider })

// Gmail direct login (uses backend session)
await apiGmailLogin()

// Fetch current session
await apiFetchSession()

// Save profile (to localStorage + backend)
await syncProfile(email, profile)

// Logout
await apiLogout()
```

### 7. Testing the Integration

```bash
# 1. Start your backend
cd backend
uvicorn main:app --port 8000 --reload

# 2. In another terminal, start frontend
cd frontend
npm run dev

# 3. Test login flow:
# - Click "Sign In" → Enter credentials → Submit
# - Browser should send cookies
# - Profile data should persist across refresh
# - Clear browser storage → Still work with backend

# 4. Test profile sync:
# - Login on device A
# - Update profile
# - Login on device B → Should see updated profile from backend
```

### 8. What's Working Now

✅ **With Backend (localhost:8000 running)**
- Email/Password login & signup
- Session persists via cookies
- Profile syncs across devices
- Analysis history syncs to cloud

✅ **Without Backend (localStorage fallback)**
- Email/Password login works locally
- Profile data persists in browser
- Analysis history stored locally
- Perfect for development/demo

✅ **OAuth (Google/GitHub)**
- Popup flow works
- Falls back to localStorage if backend unavailable
- Profile images cached locally

### 9. Future Enhancements

When backend is ready:
- [ ] Real-time notifications for profile changes
- [ ] Collaborative features
- [ ] Advanced analytics sync
- [ ] Export user data
- [ ] Account deletion with data cleanup
