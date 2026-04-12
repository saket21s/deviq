#!/bin/bash
# Deploy to Firebase Cloud Run using Docker
# Make this executable: chmod +x deploy-cloud-run.sh

set -e

PROJECT_ID="developerintelligencedashboard"
SERVICE_NAME="deviq-api"
REGION="us-central1"

echo "🚀 Deploying to Firebase Cloud Run..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t "$SERVICE_NAME:latest" .

# Tag for Google Container Registry
GCR_IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
docker tag "$SERVICE_NAME:latest" "$GCR_IMAGE"

echo "✅ Docker image built: $GCR_IMAGE"
echo ""
echo "📤 To push to Firebase Cloud Run:"
echo "   1. Ensure you're authenticated: gcloud auth login"
echo "   2. Configure Docker: gcloud auth configure-docker"
echo "   3. Push image: docker push $GCR_IMAGE"
echo "   4. Deploy: gcloud run deploy $SERVICE_NAME --image $GCR_IMAGE --platform managed --region $REGION --allow-unauthenticated"
echo ""
echo "Or use Firebase Console directly:"
echo "   https://console.cloud.google.com/run"
