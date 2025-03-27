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

# Install CloudWatch Agent
echo "Installing CloudWatch Agent..."
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Create application user
useradd -m -s /bin/bash webapp || echo "User already exists"

# Set up application directory
echo "Setting up application directory..."
mkdir -p /opt/webapp
cd /opt/webapp

# Create log directory for application
sudo mkdir -p /var/log/webapp
sudo chown webapp:webapp /var/log/webapp
sudo chmod 755 /var/log/webapp

# Extract the uploaded zip file
rm -rf /opt/webapp/*
unzip -o /tmp/application.zip -d /opt/webapp/

# Create CloudWatch agent configuration
cat > /opt/webapp/cloudwatch-config.json << EOF
{
  "agent": {
    "metrics_collection_interval": 10,
    "run_as_user": "webapp"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/webapp/application.log",
            "log_group_name": "webapp-logs",
            "log_stream_name": "{instance_id}-application",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "webapp-system-logs",
            "log_stream_name": "{instance_id}-syslog",
            "retention_in_days": 7
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 10,
        "metrics_aggregation_interval": 60
      }
    }
  }
}
EOF

# Set up CloudWatch agent configuration
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
sudo cp /opt/webapp/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Create environment file with database credentials from RDS
cat > /opt/webapp/.env << EOF
# Database Credentials (passed from RDS)
DB_HOST=${db_host}
DB_USER=${db_username}
DB_PASSWORD=${db_password}
DB_NAME=${db_name}
DB_PORT=${db_port}

# S3 Configuration
S3_BUCKET=${s3_bucket_name}
AWS_REGION=${aws_region}

# Application Port 
PORT=8080
EOF

# Set the correct permissions
chown -R webapp:webapp /opt/webapp
chmod -R 755 /opt/webapp
chmod 600 /opt/webapp/.env

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

# Start CloudWatch Agent
echo "Starting CloudWatch agent..."
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent

# Enable and start the service
echo "Starting web application service..."
systemctl daemon-reload
systemctl enable webapp
systemctl start webapp

echo "Application deployment completed successfully!"