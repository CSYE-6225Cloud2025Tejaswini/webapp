#!/bin/bash

# Specify default deployment region; allows override
PRIMARY_REGION="us-east1-b"
DEPLOYMENT_ZONE=${1:-$PRIMARY_REGION}

# Define cloud authentication paths for GCP
DEV_CLOUD_CREDENTIALS="gcp-dev-credentials.json"
DEMO_CLOUD_CREDENTIALS="gcp-demo-credentials.json"

echo "Extracting project IDs from credentials..."

# Extract project IDs and service account emails from the credential files
DEV_CLOUD_PROJECT=$(cat $DEV_CLOUD_CREDENTIALS | jq -r '.project_id')
DEMO_CLOUD_PROJECT=$(cat $DEMO_CLOUD_CREDENTIALS | jq -r '.project_id')

DEV_CLOUD_ACCOUNT=$(cat $DEV_CLOUD_CREDENTIALS | jq -r '.client_email')
DEMO_CLOUD_ACCOUNT=$(cat $DEMO_CLOUD_CREDENTIALS | jq -r '.client_email')

echo "DEV Project ID: $DEV_CLOUD_PROJECT"
echo "DEMO Project ID: $DEMO_CLOUD_PROJECT"
echo "DEV Service Account: $DEV_CLOUD_ACCOUNT"
echo "DEMO Service Account: $DEMO_CLOUD_ACCOUNT"
echo "Using Zone: $DEPLOYMENT_ZONE"

echo "🔍 Finding the latest compute image in DEV project..."

# Authenticate with DEV project
gcloud auth activate-service-account --key-file=$DEV_CLOUD_CREDENTIALS
gcloud config set project $DEV_CLOUD_PROJECT

# Get the latest compute image name with "custom-nodejs-mysql" prefix
LATEST_COMPUTE_IMAGE=$(gcloud compute images list --project=$DEV_CLOUD_PROJECT \
  --filter="name~'custom-nodejs-mysql'" \
  --sort-by=~creationTimestamp --limit=1 \
  --format="value(name)")

if [ -z "$LATEST_COMPUTE_IMAGE" ]; then
  echo "No compute image found with prefix 'custom-nodejs-mysql'. Exiting..."
  exit 1
fi

echo "Found latest compute image: $LATEST_COMPUTE_IMAGE"

# Image & Machine Image Details
TIMESTAMP=$(date +%s)
COPIED_LATEST_COMPUTE_IMAGE="copy-${LATEST_COMPUTE_IMAGE}-${TIMESTAMP}"
DATA_STORAGE_REGION="us"

echo "Authenticating with GCP DEV Project ($DEV_CLOUD_PROJECT)..."
gcloud auth activate-service-account --key-file=$DEV_CLOUD_CREDENTIALS
gcloud config set project $DEV_CLOUD_PROJECT

echo "Granting DEV service account permission to access DEMO project..."
gcloud projects add-iam-policy-binding $DEMO_CLOUD_PROJECT \
  --member="serviceAccount:$DEV_CLOUD_ACCOUNT" \
  --role="roles/compute.admin" \
  --quiet

echo "Granting DEMO service account permission to access DEV project resources..."
gcloud projects add-iam-policy-binding $DEV_CLOUD_PROJECT \
  --member="serviceAccount:$DEMO_CLOUD_ACCOUNT" \
  --role="roles/compute.imageUser" \
  --quiet

echo "🔄 Granting DEMO Project ($DEMO_CLOUD_PROJECT) access to Compute Image ($LATEST_COMPUTE_IMAGE)..."
gcloud compute images add-iam-policy-binding $LATEST_COMPUTE_IMAGE \
    --project=$DEV_CLOUD_PROJECT \
    --member="serviceAccount:$DEMO_CLOUD_ACCOUNT" \
    --role="roles/compute.imageUser"

echo "Authenticating with GCP DEMO Project ($DEMO_CLOUD_PROJECT)..."
gcloud auth activate-service-account --key-file=$DEMO_CLOUD_CREDENTIALS
gcloud config set project $DEMO_CLOUD_PROJECT

echo "Copying Compute Image ($LATEST_COMPUTE_IMAGE) to DEMO Project ($DEMO_CLOUD_PROJECT)..."
gcloud compute images create "$COPIED_LATEST_COMPUTE_IMAGE" \
    --source-image="$LATEST_COMPUTE_IMAGE" \
    --source-image-project="$DEV_CLOUD_PROJECT" \
    --project="$DEMO_CLOUD_PROJECT"

echo "🔍 Verifying Compute Image in DEMO ($COPIED_LATEST_COMPUTE_IMAGE)..."
gcloud compute images list --project=$DEMO_CLOUD_PROJECT --filter="name=$COPIED_LATEST_COMPUTE_IMAGE"

WAIT_TIME=10
MAX_RETRIES=12
retry=0
while ! gcloud compute images describe $COPIED_LATEST_COMPUTE_IMAGE --project=$DEMO_CLOUD_PROJECT &>/dev/null; do
    if [[ $retry -ge $MAX_RETRIES ]]; then
        echo "Compute Image copy failed to appear in DEMO project. Exiting..."
        exit 1
    fi
    echo "⏳ Waiting for Compute Image to be available in DEMO ($WAIT_TIME seconds)..."
    sleep $WAIT_TIME
    ((retry++))
done

echo "✅ GCP Image Migration Complete! Image copied to DEMO project: $COPIED_LATEST_COMPUTE_IMAGE"