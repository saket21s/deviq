# Firebase Cloud Run Deployment Guide

Deploy your Python FastAPI backend to Firebase Cloud Run.

## Prerequisites

1. **Google Cloud SDK**: [Install gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. **Firebase Project**: Already set up (developerintelligencedashboard)
3. **Docker**: Optional (gcloud will build for you)

## Deployment Steps

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project developerintelligencedashboard
```

### 2. Set Environment

Get your Firebase service account key JSON:

```bash
# Convert your existing firebase-key.json to base64
cat firebase-key.json | base64 -w 0
# Copy the output
```

Or download from Firebase Console:
- Settings → Service Accounts → Generate New Private Key
- Copy the entire JSON content

### 3. Deploy to Cloud Run

```bash
# Build and deploy in one command
gcloud run deploy deviq-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "FRONTEND_ORIGINS=http://localhost:3000,https://deviq.online,https://developerintelligencedashboard.web.app" \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_JSON={YOUR_BASE64_JSON_HERE}" \
  --set-env-vars "GROQ_API_KEY={YOUR_GROQ_KEY}" \
  --set-env-vars "GITHUB_TOKEN={YOUR_GITHUB_TOKEN}"
```

Replace:
- `{YOUR_BASE64_JSON_HERE}` with the base64 encoded service account JSON
- `{YOUR_GROQ_KEY}` with your Groq API key
- `{YOUR_GITHUB_TOKEN}` with your GitHub token

### 4. Get Cloud Run URL

After deployment completes, you'll see:
```
Service URL: https://deviq-api-xxxxx.run.app
```

Copy this URL.

### 5. Update Frontend

Update `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://deviq-api-xxxxx.run.app
```

And rebuild/redeploy frontend:
```bash
npm run predeploy
npx firebase deploy
```

### 6. Test API

```bash
curl https://deviq-api-xxxxx.run.app/
```

Should return:
```json
{"message":"Developer Portfolio Intelligence API Running"}
```

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `FRONTEND_ORIGINS` | Comma-separated list of allowed domains (CORS) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Base64 encoded Firebase service account |
| `GROQ_API_KEY` | Groq API key for AI features |
| `GITHUB_TOKEN` | GitHub API token for repo analysis |

## Troubleshooting

### Service fails to start
1. Check logs: `gcloud run logs read deviq-api --limit 50`
2. Verify environment variables are set correctly
3. Check Docker image built successfully

### CORS errors in browser
1. Verify `FRONTEND_ORIGINS` includes your domain
2. Redeploy with updated environment
3. Wait 30 seconds for Cloud Run to restart

### Firestore connection errors
1. Ensure `FIREBASE_SERVICE_ACCOUNT_JSON` is valid (not corrupted base64)
2. Verify service account has Firestore permissions in Firebase Console

## Cleanup

To remove the Cloud Run service:
```bash
gcloud run services delete deviq-api --region us-central1
```

## Local Testing

Before deploying, test locally:

```bash
# Set environment variables
export FRONTEND_ORIGINS="http://localhost:3000"
export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat firebase-key.json | jq -c . | base64 -w 0)"
export GROQ_API_KEY="your-key"
export GITHUB_TOKEN="your-token"

# Run with port 8080 (Cloud Run port)
uvicorn main:app --host 0.0.0.0 --port 8080
```

Visit: `http://localhost:8080/`
