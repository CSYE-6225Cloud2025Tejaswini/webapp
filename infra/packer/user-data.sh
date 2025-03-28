#!/bin/bash
set -e

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y curl unzip

# Install Node.js from NodeSource repository
echo "Installing Node.js runtime..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
sudo apt-get install -y nodejs

# No MySQL installation needed - using RDS for database

# Create application user
useradd -m -s /bin/bash webapp || echo "User already exists"

# Set up application directory
echo "Setting up application directory..."
mkdir -p /opt/webapp
cd /opt/webapp

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# Create log directory
mkdir -p /opt/webapp/logs
chown webapp:webapp /opt/webapp/logs
chmod 755 /opt/webapp/logs

# Configuring CloudWatch agent
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

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Extract the uploaded zip file
rm -rf /opt/webapp/*
unzip -o /tmp/application.zip -d /opt/webapp/

# Move environment file
mv /tmp/.env /opt/webapp/

# Set the correct permissions
chown -R webapp:webapp /opt/webapp
chmod -R 755 /opt/webapp

# Install application dependencies
echo "Fetching application dependencies..."
cd /opt/webapp
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

# Create systemd service file
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

# Set proper permissions for systemd service file
chmod 644 /etc/systemd/system/webapp.service

# No local MySQL configuration needed - using RDS for database
echo "RDS will be used for database functionality"

# Enable and start the service
echo "Starting web application service..."
systemctl daemon-reload
systemctl enable webapp
systemctl start webapp

echo "Application deployment completed successfully!"