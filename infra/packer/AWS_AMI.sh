#!/bin/bash

# Fetch AWS authentication details from environment
SRC_AWS_KEY="${DEV_AWS_ACCESS_KEY_ID}"
SRC_AWS_SECRET="${DEV_AWS_SECRET_ACCESS_KEY}"
DEST_AWS_KEY="${DEMO_AWS_ACCESS_KEY_ID}"
DEST_AWS_SECRET="${DEMO_AWS_SECRET_ACCESS_KEY}"
DEST_ACCOUNT_ID="${DEMO_ACCOUNT_ID}"

# Input Region Details
CLOUD_REGION="us-east-1"
DUPLICATED_AMI_NAME="Copied-custom-nodejs-mysql-$(date +%Y%m%d-%H%M%S)"


# Set AWS CLI Profiles for Both Accounts
aws configure set aws_access_key_id $SRC_AWS_KEY --profile source-account
aws configure set aws_secret_access_key $SRC_AWS_SECRET --profile source-account
aws configure set region $CLOUD_REGION --profile source-account

aws configure set aws_access_key_id $DEST_AWS_KEY --profile target-account
aws configure set aws_secret_access_key $DEST_AWS_SECRET --profile target-account
aws configure set region $CLOUD_REGION --profile target-account

echo "AWS CLI Profiles Configured"

# Retrieve ID for source AWS account
echo "Getting source account ID..."
SRC_ACCOUNT_ID=$(aws sts get-caller-identity \
    --profile source-account \
    --query 'Account' \
    --output text)
echo "Source Account ID: $SRC_ACCOUNT_ID"

# Identify latest AMI matching defined naming convention
echo "Getting latest AMI ID..."
SRC_AMI_ID=$(aws ec2 describe-images \
    --profile source-account \
    --owners $SRC_ACCOUNT_ID \
    --filters "Name=name,Values=custom-ubuntu-image*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)

if [ -z "$SRC_AMI_ID" ]; then
    echo "❌ No AMI found with name prefix 'custom-ubuntu-image'. Exiting."
    exit 1
fi

echo "Found latest AMI: $SRC_AMI_ID"

echo "Target Account ID (from environment): $DEST_ACCOUNT_ID"

# Share the AMI with the Target Account
echo "Sharing AMI ($SRC_AMI_ID) with target account ($DEST_ACCOUNT_ID)..."
aws ec2 modify-image-attribute \
    --profile source-account \
    --image-id $SRC_AMI_ID \
    --launch-permission "Add=[{UserId=$DEST_ACCOUNT_ID}]" \
    --region $CLOUD_REGION

# Get the Snapshot ID of the AMI
echo "Fetching Snapshot IDs..."
AMI_SNAPSHOT_IDS=$(aws ec2 describe-images \
    --profile source-account \
    --image-ids $SRC_AMI_ID \
    --region $CLOUD_REGION \
    --query 'Images[0].BlockDeviceMappings[*].Ebs.SnapshotId' \
    --output text)

for AMI_SNAPSHOT_ID in $AMI_SNAPSHOT_IDS; do
    echo "Found Snapshot ID: $AMI_SNAPSHOT_ID"
    
    # Allow target account access to snapshot for AMI duplication
    echo "Sharing Snapshot ($AMI_SNAPSHOT_ID) with target account ($DEST_ACCOUNT_ID)..."
    aws ec2 modify-snapshot-attribute \
        --profile source-account \
        --snapshot-id $AMI_SNAPSHOT_ID \
        --attribute createVolumePermission \
        --operation-type add \
        --user-ids $DEST_ACCOUNT_ID \
        --region $CLOUD_REGION
done

# Create a duplicate AMI within target AWS account
echo "Copying AMI to target account..."
DEST_AMI_ID=$(aws ec2 copy-image \
    --profile target-account \
    --source-image-id $SRC_AMI_ID \
    --source-region $CLOUD_REGION \
    --region $CLOUD_REGION \
    --name "$DUPLICATED_AMI_NAME" \
    --query 'ImageId' --output text)

echo "AMI Copy Started: $DEST_AMI_ID"

# Wait for AMI to be Available
echo "⏳ Waiting for AMI ($DEST_AMI_ID) to be available..."
WAIT_TIME=30
MAX_RETRIES=20
retry=0

while [ $retry -lt $MAX_RETRIES ]; do
    AMI_STATE=$(aws ec2 describe-images \
        --profile target-account \
        --image-ids $DEST_AMI_ID \
        --region $CLOUD_REGION \
        --query 'Images[0].State' \
        --output text 2>/dev/null)
    
    if [ "$AMI_STATE" = "available" ]; then
        echo "✅ AMI ($DEST_AMI_ID) is now available in target account!"
        break
    fi
    
    echo "AMI state: $AMI_STATE. Waiting for $WAIT_TIME seconds... (Attempt $((retry+1))/$MAX_RETRIES)"
    sleep $WAIT_TIME
    ((retry++))
done

if [ $retry -eq $MAX_RETRIES ]; then
    echo "Timed out waiting for AMI to become available."
    exit 1
fi

echo "AMI Migration has Completed"