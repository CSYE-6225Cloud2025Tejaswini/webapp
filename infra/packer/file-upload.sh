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

# Create application user
useradd -m -s /bin/bash webapp || echo "User already exists"

# Set up application directory
echo "Setting up application directory..."
mkdir -p /opt/webapp
cd /opt/webapp

# Extract the uploaded zip file
rm -rf /opt/webapp/*
unzip -o /tmp/application.zip -d /opt/webapp/

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

# Enable and start the service
echo "Starting web application service..."
systemctl daemon-reload
systemctl enable webapp
systemctl start webapp

echo "Application deployment completed successfully!"