#!/bin/bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl unzip jq

# Install AWS CLI manually (because awscli is missing in apt-get)
echo "Installing AWS CLI manually..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# ---------------------
# Install Node.js
# ---------------------
echo "Installing Node.js runtime..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

sudo apt-get install -y nodejs

# ---------------------
# Retrieve Database Credentials from Secrets Manager
# ---------------------
echo "Retrieving database credentials from Secrets Manager..."
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id db-password-${environment} \
  --region ${region} \
  --query SecretString \
  --output text)

# Parse the secret JSON
DB_HOST=$(echo $SECRET_JSON | jq -r '.host')
DB_PORT=$(echo $SECRET_JSON | jq -r '.port')
DB_USER=$(echo $SECRET_JSON | jq -r '.username')
DB_PASSWORD=$(echo $SECRET_JSON | jq -r '.password')
DB_NAME=$(echo $SECRET_JSON | jq -r '.dbname')

# ------------------------------
# Database Note (No MySQL)
# ------------------------------
# Skipping local MySQL setup – using Amazon RDS instead

# ------------------------------------
# Create Application User
# ------------------------------------
useradd -m -s /bin/bash webapp || echo "User already exists"

# ----------------------------
# Setup Application Directory
# ----------------------------
echo "Setting up application directory..."
mkdir -p /opt/webapp
cd /opt/webapp

# ----------------------------
# Install CloudWatch Agent
# ----------------------------
echo "Installing CloudWatch Agent..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# Create directory for log files
mkdir -p /opt/webapp/logs
chown webapp:webapp /opt/webapp/logs
chmod 755 /opt/webapp/logs

# ----------------------------
# Configure CloudWatch Agent
# ----------------------------
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWAGENTCONFIG'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/webapp/logs/application.log",
            "log_group_name": "webapp-logs",
            "log_stream_name": "{instance_id}-application",
            "retention_in_days": 7
          },
          {
            "file_path": "/opt/webapp/logs/error.log",
            "log_group_name": "webapp-logs",
            "log_stream_name": "{instance_id}-error",
            "retention_in_days": 7
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "WebApp",
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 10,
        "metrics_aggregation_interval": 60
      }
    }
  }
}
CWAGENTCONFIG

# Start CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# ----------------------------------
# Deploy Application Code
# ----------------------------------
# Clean up any existing files and unzip the new ones
rm -rf /opt/webapp/*
unzip -o /tmp/application.zip -d /opt/webapp/

# Create .env file with retrieved credentials
cat > /opt/webapp/.env << EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
AWS_REGION=${region}
S3_BUCKET=${s3_bucket}
PORT=8080
NODE_ENV=production
LOG_DIRECTORY=/opt/webapp/logs
AWS_CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=webapp-logs
EOF

# Set appropriate permissions
chown -R webapp:webapp /opt/webapp
chmod -R 755 /opt/webapp
chmod 600 /opt/webapp/.env  # Restrict access to .env file containing credentials

# ----------------------------------
# Install Node.js Dependencies
# ----------------------------------
echo "Fetching application dependencies..."
cd /opt/webapp
if [ -f "package-lock.json" ]; then
  sudo -u webapp npm ci
else
  sudo -u webapp npm install
fi

# ----------------------------------
# Create systemd Service Definition
# ----------------------------------
cat > /etc/systemd/system/webapp.service << EOF
[Unit]
Description=Node.js Web Application
After=network.target

[Service]
Environment=NODE_ENV=production
Type=simple
User=webapp
WorkingDirectory=/opt/webapp
ExecStart=/usr/bin/node /opt/webapp/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set correct permissions
chmod 644 /etc/systemd/system/webapp.service

# ----------------------------
# Start Application Service
# ----------------------------
echo "RDS will be used for database functionality"
echo "Starting web application service..."
systemctl daemon-reload
systemctl enable webapp
systemctl start webapp

echo "Application deployment completed successfully!"