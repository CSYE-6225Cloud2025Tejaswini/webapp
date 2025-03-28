#!/bin/bash
set -e

# Enable command echo for debugging
set -x

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

# Validate environment variables
if [[ -z "$SRC_AWS_KEY" || -z "$SRC_AWS_SECRET" || -z "$DEST_AWS_KEY" || -z "$DEST_AWS_SECRET" || -z "$DEST_ACCOUNT_ID" ]]; then
    echo "❌ ERROR: Required environment variables are not set. Please check your configuration."
    [[ -z "$SRC_AWS_KEY" ]] && echo "- DEV_AWS_ACCESS_KEY_ID is missing"
    [[ -z "$SRC_AWS_SECRET" ]] && echo "- DEV_AWS_SECRET_ACCESS_KEY is missing"
    [[ -z "$DEST_AWS_KEY" ]] && echo "- DEMO_AWS_ACCESS_KEY_ID is missing"
    [[ -z "$DEST_AWS_SECRET" ]] && echo "- DEMO_AWS_SECRET_ACCESS_KEY is missing"
    [[ -z "$DEST_ACCOUNT_ID" ]] && echo "- DEMO_ACCOUNT_ID_PKR is missing"
    exit 1
fi

echo "All required environment variables are set."

# Set AWS CLI Profiles for Both Accounts
aws configure set aws_access_key_id "$SRC_AWS_KEY" --profile source-account
aws configure set aws_secret_access_key "$SRC_AWS_SECRET" --profile source-account
aws configure set region "$CLOUD_REGION" --profile source-account

aws configure set aws_access_key_id "$DEST_AWS_KEY" --profile target-account
aws configure set aws_secret_access_key "$DEST_AWS_SECRET" --profile target-account
aws configure set region "$CLOUD_REGION" --profile target-account

echo "✅ AWS CLI Profiles Configured"

# Verify profiles
echo "Verifying source account access..."
SRC_ACCOUNT_ID=$(aws sts get-caller-identity \
    --profile source-account \
    --query 'Account' \
    --output text)

if [ -z "$SRC_ACCOUNT_ID" ]; then
    echo "❌ Failed to retrieve source account ID. Check credentials."
    exit 1
fi
echo "✅ Source Account ID: $SRC_ACCOUNT_ID"

echo "Verifying target account access..."
TARGET_ACCOUNT_VERIFY=$(aws sts get-caller-identity \
    --profile target-account \
    --query 'Account' \
    --output text)

if [ -z "$TARGET_ACCOUNT_VERIFY" ]; then
    echo "❌ Failed to verify target account access. Check credentials."
    exit 1
fi
echo "✅ Target Account ID (verified): $TARGET_ACCOUNT_VERIFY"
echo "Target Account ID (from environment): $DEST_ACCOUNT_ID"

# Validate that the accounts are different
if [ "$SRC_ACCOUNT_ID" == "$DEST_ACCOUNT_ID" ]; then
    echo "⚠️ Warning: Source and target account IDs are the same. Cross-account sharing may not be necessary."
fi

# Identify latest AMI matching defined naming convention
echo "Finding latest AMI in source account..."
SRC_AMI_ID=$(aws ec2 describe-images \
    --profile source-account \
    --owners "$SRC_ACCOUNT_ID" \
    --filters "Name=name,Values=custom-ubuntu-image*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)

if [ -z "$SRC_AMI_ID" ] || [ "$SRC_AMI_ID" == "None" ]; then
    echo "❌ No AMI found with name prefix 'custom-ubuntu-image'. Exiting."
    exit 1
fi

echo "✅ Found latest AMI: $SRC_AMI_ID"

# Get detailed information about the AMI
echo "Getting AMI details..."
AMI_DETAILS=$(aws ec2 describe-images \
    --profile source-account \
    --image-ids "$SRC_AMI_ID" \
    --output json)

echo "AMI Details: $AMI_DETAILS"

# Share the AMI with the Target Account
echo "Sharing AMI ($SRC_AMI_ID) with target account ($DEST_ACCOUNT_ID)..."
SHARE_RESULT=$(aws ec2 modify-image-attribute \
    --profile source-account \
    --image-id "$SRC_AMI_ID" \
    --launch-permission "Add=[{UserId=$DEST_ACCOUNT_ID}]" \
    --region "$CLOUD_REGION" 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to share AMI: $SHARE_RESULT"
    exit 1
fi
echo "✅ AMI sharing successful"

# Verify AMI sharing
echo "Verifying AMI sharing permissions..."
VERIFY_AMI_SHARE=$(aws ec2 describe-image-attribute \
    --profile source-account \
    --image-id "$SRC_AMI_ID" \
    --attribute launchPermission \
    --region "$CLOUD_REGION")

echo "AMI sharing permissions: $VERIFY_AMI_SHARE"

# Get all Snapshot IDs associated with the AMI
echo "Fetching Snapshot IDs..."
AMI_SNAPSHOT_IDS=$(aws ec2 describe-images \
    --profile source-account \
    --image-ids "$SRC_AMI_ID" \
    --region "$CLOUD_REGION" \
    --query 'Images[0].BlockDeviceMappings[*].Ebs.SnapshotId' \
    --output text)

if [ -z "$AMI_SNAPSHOT_IDS" ]; then
    echo "❌ No snapshots found for AMI $SRC_AMI_ID"
    exit 1
fi

echo "Found snapshots: $AMI_SNAPSHOT_IDS"

# Share each snapshot with the target account
for AMI_SNAPSHOT_ID in $AMI_SNAPSHOT_IDS; do
    echo "Processing Snapshot ID: $AMI_SNAPSHOT_ID"
    
    # Share the snapshot
    echo "Sharing Snapshot ($AMI_SNAPSHOT_ID) with target account ($DEST_ACCOUNT_ID)..."
    SNAPSHOT_SHARE_RESULT=$(aws ec2 modify-snapshot-attribute \
        --profile source-account \
        --snapshot-id "$AMI_SNAPSHOT_ID" \
        --attribute createVolumePermission \
        --operation-type add \
        --user-ids "$DEST_ACCOUNT_ID" \
        --region "$CLOUD_REGION" 2>&1)
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to share snapshot $AMI_SNAPSHOT_ID: $SNAPSHOT_SHARE_RESULT"
        exit 1
    fi
    
    # Verify snapshot sharing
    echo "Verifying snapshot sharing permissions..."
    VERIFY_SNAPSHOT_SHARE=$(aws ec2 describe-snapshot-attribute \
        --profile source-account \
        --snapshot-id "$AMI_SNAPSHOT_ID" \
        --attribute createVolumePermission \
        --region "$CLOUD_REGION")
    
    echo "Snapshot sharing permissions: $VERIFY_SNAPSHOT_SHARE"
    
    # Check if target account is in the permissions
    if ! echo "$VERIFY_SNAPSHOT_SHARE" | grep -q "$DEST_ACCOUNT_ID"; then
        echo "⚠️ Warning: Target account not found in snapshot permissions. Permissions may not have propagated yet."
    else
        echo "✅ Snapshot sharing confirmed for $AMI_SNAPSHOT_ID"
    fi
done

# Add a delay to ensure permissions propagate
echo "Waiting for permissions to propagate (30 seconds)..."
sleep 30

# Check if AMI is visible to target account
echo "Verifying AMI visibility in target account..."
TARGET_AMI_CHECK=$(aws ec2 describe-images \
    --profile target-account \
    --image-ids "$SRC_AMI_ID" \
    --region "$CLOUD_REGION" 2>&1)

if [ $? -ne 0 ]; then
    echo "⚠️ AMI not yet visible in target account or permissions not propagated: $TARGET_AMI_CHECK"
    echo "Waiting additional time (30 seconds)..."
    sleep 30
else
    echo "✅ AMI is visible in target account"
fi

# Create a duplicate AMI within target AWS account
echo "Copying AMI to target account..."
COPY_RESULT=$(aws ec2 copy-image \
    --profile target-account \
    --source-image-id "$SRC_AMI_ID" \
    --source-region "$CLOUD_REGION" \
    --region "$CLOUD_REGION" \
    --name "$DUPLICATED_AMI_NAME" \
    --output json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy AMI: $COPY_RESULT"
    # Try to diagnose the issue
    echo "Checking for specific error messages..."
    if echo "$COPY_RESULT" | grep -q "InvalidRequest"; then
        echo "This is likely a permissions issue with the snapshots."
        echo "Checking snapshot permissions again..."
        for AMI_SNAPSHOT_ID in $AMI_SNAPSHOT_IDS; do
            PERM_CHECK=$(aws ec2 describe-snapshot-attribute \
                --profile source-account \
                --snapshot-id "$AMI_SNAPSHOT_ID" \
                --attribute createVolumePermission \
                --region "$CLOUD_REGION")
            echo "Snapshot $AMI_SNAPSHOT_ID permissions: $PERM_CHECK"
        done
    fi
    exit 1
fi

# Extract AMI ID from the copy result
DEST_AMI_ID=$(echo "$COPY_RESULT" | grep -o '"ImageId": "[^"]*"' | cut -d'"' -f4)

if [ -z "$DEST_AMI_ID" ]; then
    echo "❌ Failed to extract destination AMI ID from copy result"
    exit 1
fi

echo "✅ AMI Copy Started: $DEST_AMI_ID"

# Wait for AMI to be Available
echo "⏳ Waiting for AMI ($DEST_AMI_ID) to be available..."
WAIT_TIME=30
MAX_RETRIES=20
retry=0

while [ $retry -lt $MAX_RETRIES ]; do
    AMI_STATE=$(aws ec2 describe-images \
        --profile target-account \
        --image-ids "$DEST_AMI_ID" \
        --region "$CLOUD_REGION" \
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
    echo "❌ Timed out waiting for AMI to become available."
    exit 1
fi

# Final verification
echo "Verifying final AMI in target account..."
FINAL_AMI_CHECK=$(aws ec2 describe-images \
    --profile target-account \
    --image-ids "$DEST_AMI_ID" \
    --region "$CLOUD_REGION" \
    --query 'Images[0].[ImageId, State, Name]' \
    --output text)

echo "Final AMI details: $FINAL_AMI_CHECK"
echo "✅ AMI Migration Complete!"

# Set to non-verbose mode
set +x

# Summary
echo "========== AMI SHARING SUMMARY =========="
echo "Source Account: $SRC_ACCOUNT_ID"
echo "Target Account: $DEST_ACCOUNT_ID"
echo "Source AMI: $SRC_AMI_ID"
echo "Target AMI: $DEST_AMI_ID"
echo "AMI Name: $DUPLICATED_AMI_NAME"
echo "Region: $CLOUD_REGION"
echo "========================================"

exit 0