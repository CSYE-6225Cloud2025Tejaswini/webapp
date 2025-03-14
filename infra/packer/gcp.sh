#!/bin/bash

### ================================
### Parameter Handling
### ================================

# Default zone value - can be overridden with command line parameter
DEFAULT_ZONE="us-east1-b"
ZONE=${1:-$DEFAULT_ZONE}

# Paths to GCP Service Account JSON Keys using GitHub Actions secrets
DEV_GCP_KEY="gcp-dev-credentials.json"
DEMO_GCP_KEY="gcp-demo-credentials.json"

### ================================
### Extract Project IDs from Credentials
### ================================
echo "Extracting project IDs from credentials..."

# Extract project IDs from credential files
DEV_PROJECT_ID=$(cat $DEV_GCP_KEY | jq -r '.project_id')
DEMO_PROJECT_ID=$(cat $DEMO_GCP_KEY | jq -r '.project_id')

# Extract service account emails
DEV_SERVICE_ACCOUNT=$(cat $DEV_GCP_KEY | jq -r '.client_email')
DEMO_SERVICE_ACCOUNT=$(cat $DEMO_GCP_KEY | jq -r '.client_email')

echo "DEV Project ID: $DEV_PROJECT_ID"
echo "DEMO Project ID: $DEMO_PROJECT_ID"
echo "DEV Service Account: $DEV_SERVICE_ACCOUNT"
echo "DEMO Service Account: $DEMO_SERVICE_ACCOUNT"
echo "Using Zone: $ZONE"

### ================================
### Get Latest Compute Image
### ================================
echo "Finding the latest compute image in DEV project..."

# Authenticate with DEV project
gcloud auth activate-service-account --key-file=$DEV_GCP_KEY
gcloud config set project $DEV_PROJECT_ID

# Get the latest compute image name with "custom-nodejs-mysql" prefix
COMPUTE_IMAGE_NAME=$(gcloud compute images list --project=$DEV_PROJECT_ID \
  --filter="name~'custom-nodejs-mysql'" \
  --sort-by=~creationTimestamp --limit=1 \
  --format="value(name)")

if [ -z "$COMPUTE_IMAGE_NAME" ]; then
  echo "No compute image found with prefix 'custom-nodejs-mysql'. Exiting..."
  exit 1
fi

echo "Found latest compute image: $COMPUTE_IMAGE_NAME"

# Compute Instance Details
MACHINE_TYPE="e2-medium"

# Image & Machine Image Details
TIMESTAMP=$(date +%s)
TEMP_INSTANCE_DEV="temp-vm-dev-${TIMESTAMP}"
TEMP_INSTANCE_DEMO="temp-vm-demo-${TIMESTAMP}"
MACHINE_IMAGE_NAME_DEV="mi-${COMPUTE_IMAGE_NAME}"
MACHINE_IMAGE_NAME_DEMO="mi-demo-${COMPUTE_IMAGE_NAME}"
COPIED_COMPUTE_IMAGE_NAME="copy-${COMPUTE_IMAGE_NAME}"
STORAGE_LOCATION="us"

### ================================
### Step 1: Authenticate with DEV Project
### ================================
echo "Authenticating with GCP DEV Project ($DEV_PROJECT_ID)..."
gcloud auth activate-service-account --key-file=$DEV_GCP_KEY
gcloud config set project $DEV_PROJECT_ID

### ================================
### Step 2: Create a VM from Compute Image in DEV
### ================================
echo "Creating a temporary VM ($TEMP_INSTANCE_DEV) from Compute Image ($COMPUTE_IMAGE_NAME)..."
gcloud compute instances create $TEMP_INSTANCE_DEV \
  --image=$COMPUTE_IMAGE_NAME \
  --image-project=$DEV_PROJECT_ID \
  --machine-type=$MACHINE_TYPE \
  --zone=$ZONE \
  --tags=allow-ssh

echo "Waiting for VM to initialize..."
sleep 15  # Adjust wait time if needed

### ================================
### Step 3: Create a Machine Image in DEV from VM
### ================================
echo "Creating Machine Image ($MACHINE_IMAGE_NAME_DEV) from VM ($TEMP_INSTANCE_DEV)..."
gcloud compute machine-images create $MACHINE_IMAGE_NAME_DEV \
    --source-instance=$TEMP_INSTANCE_DEV \
    --source-instance-zone=$ZONE \
    --project=$DEV_PROJECT_ID \
    --storage-location=$STORAGE_LOCATION

echo "Verifying Machine Image in DEV ($MACHINE_IMAGE_NAME_DEV)..."
gcloud compute machine-images list --project=$DEV_PROJECT_ID --filter="name=$MACHINE_IMAGE_NAME_DEV"

### ================================
### Step 4: Delete Temporary VM in DEV
### ================================
echo "Deleting temporary VM ($TEMP_INSTANCE_DEV)..."
gcloud compute instances delete $TEMP_INSTANCE_DEV --zone=$ZONE --quiet

