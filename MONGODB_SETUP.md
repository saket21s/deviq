# MongoDB + Firebase Cloud Run Deployment Guide

Use MongoDB Atlas for data storage + Firebase Cloud Run for backend.

## Prerequisites

1. **MongoDB Atlas Account**: Free tier available at https://www.mongodb.com/cloud/atlas
2. **Firebase Project**: Already set up (developerintelligencedashboard)
3. **Google Cloud SDK**: Optional (Firebase Console works too)

## Step-by-Step Setup

### 1. Create MongoDB Atlas Cluster

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create a **Free** cluster
4. Configure:
   - Cloud Provider: AWS (or your preference)
   - Region: auto-selected
   - Cluster Name: `deviq-cluster`
5. Click **Create**

### 2. Create MongoDB User

1. Go to **Database Access** → **Add New Database User**
2. Set:
   - Username: `deviq_user`
   - Password: Generate secure password (copy it!)
   - Role: **Read and write to any database**
3. Click **Add User**

### 3. Get Connection String

1. Go to **Databases** → Your cluster → **Connect**
2. Select **Drivers**
3. Copy the connection string:
   ```
   mongodb+srv://deviq_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password

### 4. Whitelist IP Address

1. In MongoDB Atlas, go to **Network Access**
2. Click **Add IP Address**
3. Enter `0.0.0.0/0` (allows from anywhere - for Cloud Run)
   - Or enter your specific IP for more security
4. Click **Confirm**

### 5. Update .env.local

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://deviq_user:PASSWORD@cluster0.xxxxx.mongodb.net/deviq?retryWrites=true&w=majority

# Firebase (still used for Auth)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=developerintelligencedashboard

#Frontend origins
FRONTEND_ORIGINS=http://localhost:3000,https://deviq.online,https://developerintelligencedashboard.web.app

# API Keys
GROQ_API_KEY=...
GITHUB_TOKEN=...
```

### 6. Deploy to Firebase Cloud Run

**Using Firebase Console (Easiest):**

1. Go to: https://console.firebase.google.com/project/developerintelligencedashboard/functions
2. Click **Create Function**
3. Or go to **Cloud Run** and deploy Docker container

**Using Docker & gcloud:**

```bash
cd /home/saket/Desktop/deviq-main

# Build
docker build -t deviq-api .

# Tag for Google Container Registry
docker tag deviq-api gcr.io/developerintelligencedashboard/deviq-api

# Push to GCR (requires authentication)
gcloud auth configure-docker
docker push gcr.io/developerintelligencedashboard/deviq-api

# Deploy
gcloud run deploy deviq-api \
  --image gcr.io/developerintelligencedashboard/deviq-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URI=YOUR_CONNECTION_STRING" \
  --set-env-vars "GROQ_API_KEY=YOUR_KEY" \
  --set-env-vars "GITHUB_TOKEN=YOUR_TOKEN" \
  --set-env-vars "FRONTEND_ORIGINS=http://localhost:3000,https://deviq.online"
```

### 7. Test Backend

```bash
curl https://deviq-api-xxxxx.run.app/
```

Should return:
```json
{"message":"Developer Portfolio Intelligence API Running"}
```

### 8. Update Frontend

In `app/page.tsx`, the API URL should already be set to:
```typescript
const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://deviq-api-default-us-central1.run.app'
```

Update `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=https://deviq-api-xxxxx.run.app
```

Then redeploy:
```bash
npm run predeploy
npx firebase deploy
```

## Troubleshooting

### Connection Refused
- Check MongoDB IP whitelist (add 0.0.0.0/0)
- Verify password is correct (no special character escaping needed)
- Test connection string locally first

### CORS Errors
- Verify `FRONTEND_ORIGINS` matches your domain
- Redeploy Cloud Run after changing env vars

### Cloud Run Deployment Issues
- Check logs: `gcloud run logs read deviq-api --limit 50`
- Verify Docker image built successfully
- Ensure `firebase-key.json` is NOT in .dockerignore

## Local Testing

```bash
export MONGODB_URI="mongodb+srv://deviq_user:PASSWORD@cluster.xxxxx.mongodb.net/deviq"
export GROQ_API_KEY="your-key"
export GITHUB_TOKEN="your-token"
export FRONTEND_ORIGINS="http://localhost:3000"

uvicorn main:app --host 0.0.0.0 --port 8080
```

Visit: `http://localhost:8080/`

## Database Schema

**users** collection:
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "name": "User Name",
  "avatar": "https://...",
  "provider": "google",
  "profile": {
    "bio": "...",
    "location": "...",
    "profile_picture_url: "..."
  },
  "createdAt": "2026-04-12T...",
  "updatedAt": "2026-04-12T..."
}
```

## Next Steps

1. Create MongoDB cluster (5 min)
2. Deploy backend to Cloud Run (5 min)
3. Test APIs work
4. Redeploy frontend with new API URL
5. Test authentication flow
