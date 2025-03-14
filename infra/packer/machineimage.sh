#!/bin/bash

# Environment Settings
ORGANIZATION_ID="dev-project-451923"
REGION_CODE="us-east1-b"
COMPUTE_SPEC="e2-medium"
BASE_IMAGE_ID="custom-nodejs-mysql-1740455384"   # Update this to match your source image
STAGING_INSTANCE="nodejs-staging-server"
TEMPLATE_EXPORT_NAME="nodejs-mysql-snapshot"
BACKUP_REGION="us"

echo "Phase 1: Provisioning temporary server from base image..."
gcloud compute instances create $STAGING_INSTANCE \
  --image=$BASE_IMAGE_ID \
  --image-project=$ORGANIZATION_ID \
  --machine-type=$COMPUTE_SPEC \
  --zone=$REGION_CODE \
  --tags=allow-ssh

echo "Allowing server initialization time..."
sleep 30  # Pause for complete provisioning

echo "Phase 2: Generating system snapshot from server..."
gcloud compute machine-images create $TEMPLATE_EXPORT_NAME \
  --source-instance=$STAGING_INSTANCE \
  --source-instance-zone=$REGION_CODE \
  --project=$ORGANIZATION_ID \
  --storage-location=$BACKUP_REGION

echo "Phase 3: Validating system snapshot creation..."
gcloud compute machine-images list --filter="name=$TEMPLATE_EXPORT_NAME"

echo "Phase 4: Removing temporary server..."
gcloud compute instances delete $STAGING_INSTANCE --zone=$REGION_CODE --quiet

echo "Process complete! System snapshot ready for deployment: $TEMPLATE_EXPORT_NAME"