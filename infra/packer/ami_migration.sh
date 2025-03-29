#!/bin/bash
set -e

echo "Starting AMI sharing process..."

# Fetch AWS authentication details from environment
SRC_AWS_KEY="${DEV_AWS_ACCESS_KEY_ID}"
SRC_AWS_SECRET="${DEV_AWS_SECRET_ACCESS_KEY}"
DEST_AWS_KEY="${DEMO_AWS_ACCESS_KEY_ID}"
DEST_AWS_SECRET="${DEMO_AWS_SECRET_ACCESS_KEY}"
DEST_ACCOUNT_ID="${DEMO_ACCOUNT_ID_PKR}"

# Input Region Details
CLOUD_REGION="us-east-1"
DUPLICATED_AMI_NAME="Copied-custom-nodejs-mysql-$(date +%Y%m%d-%H%M%S)"

# Set AWS CLI Profiles for Both Accounts
aws configure set aws_access_key_id "${SRC_AWS_KEY}" --profile source-account
aws configure set aws_secret_access_key "${SRC_AWS_SECRET}" --profile source-account
aws configure set region "${CLOUD_REGION}" --profile source-account

aws configure set aws_access_key_id "${DEST_AWS_KEY}" --profile target-account
aws configure set aws_secret_access_key "${DEST_AWS_SECRET}" --profile target-account
aws configure set region "${CLOUD_REGION}" --profile target-account

echo "AWS CLI Profiles Configured"

# Retrieve ID for source AWS account
SRC_ACCOUNT_ID=$(aws sts get-caller-identity \
    --profile source-account \
    --query 'Account' \
    --output text)
echo "Source Account ID: ${SRC_ACCOUNT_ID}"

# Identify latest AMI matching defined naming convention
echo "Finding latest AMI..."
SRC_AMI_ID=$(aws ec2 describe-images \
    --profile source-account \
    --owners "${SRC_ACCOUNT_ID}" \
    --filters "Name=name,Values=custom-ubuntu-image*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)

if [ -z "${SRC_AMI_ID}" ] || [ "${SRC_AMI_ID}" == "None" ]; then
    echo "No AMI found with name prefix 'custom-ubuntu-image'. Exiting."
    exit 1
fi

echo "Found latest AMI: ${SRC_AMI_ID}"

# Share the AMI with the Target Account
echo "Sharing AMI with target account..."
aws ec2 modify-image-attribute \
    --profile source-account \
    --image-id "${SRC_AMI_ID}" \
    --launch-permission "Add=[{UserId=${DEST_ACCOUNT_ID}}]" \
    --region "${CLOUD_REGION}"

# Get the Snapshot IDs of the AMI
echo "Fetching Snapshot IDs..."
AMI_SNAPSHOT_IDS=$(aws ec2 describe-images \
    --profile source-account \
    --image-ids "${SRC_AMI_ID}" \
    --region "${CLOUD_REGION}" \
    --query 'Images[0].BlockDeviceMappings[*].Ebs.SnapshotId' \
    --output text)

# Share each snapshot with the target account
for AMI_SNAPSHOT_ID in ${AMI_SNAPSHOT_IDS}; do
    echo "Sharing Snapshot ${AMI_SNAPSHOT_ID}..."
    aws ec2 modify-snapshot-attribute \
        --profile source-account \
        --snapshot-id "${AMI_SNAPSHOT_ID}" \
        --attribute createVolumePermission \
        --operation-type add \
        --user-ids "${DEST_ACCOUNT_ID}" \
        --region "${CLOUD_REGION}"
done

# Allow permissions to propagate
echo "Waiting for permissions to propagate (15 seconds)..."
sleep 15

# Create a duplicate AMI within target AWS account
echo "Initiating AMI copy to target account..."
DEST_AMI_ID=$(aws ec2 copy-image \
    --profile target-account \
    --source-image-id "${SRC_AMI_ID}" \
    --source-region "${CLOUD_REGION}" \
    --region "${CLOUD_REGION}" \
    --name "${DUPLICATED_AMI_NAME}" \
    --query 'ImageId' --output text)

echo "AMI Copy process started successfully."
echo "Source AMI: ${SRC_AMI_ID}"
echo "Destination AMI: ${DEST_AMI_ID}"
echo "The AMI copy will continue in the background."
echo "You can check the status in the AWS console."
echo "AMI Migration initiated successfully!"

# Exit with success since the AMI copy process has been initiated properly
exit 0