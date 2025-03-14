#!/bin/bash

# Fetch AWS credentials from environment variables
# SRC_AWS_ACCESS="${DEV_AWS_ACCESS_KEY_ID}"
#SRC_AWS_SECRET="${DEV_AWS_SECRET_ACCESS_KEY}"
#DEST_AWS_ACCESS="${DEMO_AWS_ACCESS_KEY_ID}"
#DEST_AWS_SECRET="${DEMO_AWS_SECRET_ACCESS_KEY}"

# Define AWS region and name format for new AMI
#AWS_REGION="us-east-1"
#NEW_AMI_TAG="Replica-NodeJS-MySQL-$(date +%Y%m%d-%H%M%S)"

# Configure AWS CLI profiles for both accounts
#aws configure set aws_access_key_id $SRC_AWS_ACCESS --profile source-profile
#aws configure set aws_secret_access_key $SRC_AWS_SECRET --profile source-profile
#aws configure set region $AWS_REGION --profile source-profile

#aws configure set aws_access_key_id $DEST_AWS_ACCESS --profile destination-profile
#aws configure set aws_secret_access_key $DEST_AWS_SECRET --profile destination-profile
#aws configure set region $AWS_REGION --profile destination-profile

#echo "AWS CLI Profiles Configured Successfully"

# Fetch Source Account ID
#echo "Retrieving Source Account ID..."
#SRC_ACCOUNT=$(aws sts get-caller-identity \
 #   --profile source-profile \
  #  --query 'Account' \
  #  --output text)
#echo "Source Account ID: $SRC_ACCOUNT"

# Get the most recent AMI with the specified pattern
#echo "Fetching the most recent AMI..."
#LATEST_AMI=$(aws ec2 describe-images \
#   --owners $SRC_ACCOUNT \
 ##  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
   # --output text)
#echo "Latest AMI ID: $LATEST_AMI"

# Retrieve Target Account ID
#echo "🔍 Retrieving Destination Account ID..."
#DEST_ACCOUNT=$(aws sts get-caller-identity \
 #   --profile destination-profile \
  #  --query 'Account' \
   # --output text)
#echo "Destination Account ID: $DEST_ACCOUNT"

# Step 1: Grant AMI permissions to the Target Account
#echo "Granting access to AMI ($LATEST_AMI) for destination account ($DEST_ACCOUNT)..."
#aws ec2 modify-image-attribute \
 #   --profile source-profile \
  #  --image-id $LATEST_AMI \
   # --launch-permission "Add=[{UserId=$DEST_ACCOUNT}]" \
    #--region $AWS_REGION

# Step 2: Retrieve the Snapshot ID linked to the AMI
#echo "Retrieving snapshot associated with AMI..."
#SNAPSHOT=$(aws ec2 describe-images \
#    --profile source-profile \
#    --image-ids $LATEST_AMI \
#   --region $AWS_REGION \
#    --query 'Images[0].BlockDeviceMappings[0].Ebs.SnapshotId' \
#   --output text)

#echo "Snapshot ID: $SNAPSHOT"

# Step 3: Grant Snapshot permissions to Target Account
#echo "Sharing snapshot ($SNAPSHOT) with destination account ($DEST_ACCOUNT)..."
#aws ec2 modify-snapshot-attribute \
#    --profile source-profile \
#    --snapshot-id $SNAPSHOT \
#    --attribute createVolumePermission \
#    --operation-type add \
#    --user-ids $DEST_ACCOUNT \
#    --region $AWS_REGION
# 
# Step 4: Copy AMI to the Target Account
#echo "Initiating AMI copy in destination account..."
#DEST_AMI=$(aws ec2 copy-image \
#    --profile destination-profile \
#    --source-image-id $LATEST_AMI \
#    --source-region $AWS_REGION \
#    --region $AWS_REGION \
#    --name "$NEW_AMI_TAG" \
#    --query 'ImageId' --output text)

#echo "Copy Operation Started for AMI: $DEST_AMI"

# Step 5: Monitor AMI availability
#echo "⏳ Waiting for AMI ($DEST_AMI) to be available..."
#aws ec2 wait image-available --profile destination-profile --image-ids $DEST_AMI --region $AWS_REGION

#echo "AMI ($DEST_AMI) is now accessible in destination account!"

#echo "Process Completed Successfully!"
