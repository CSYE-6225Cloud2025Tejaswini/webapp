#!/bin/bash
# Refresh system package information
sudo apt update -y
sudo apt upgrade -y

# Install Database - MySQL
echo "Setting up MySQL..."
sudo apt-get install -y gnupg curl
curl -fsSL https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 | sudo gpg --dearmor -o /usr/share/keyrings/mysql-keyring.gpg
sudo apt-get update
sudo apt-get install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Install Unzip Utility
sudo apt install unzip -y

# Deploy Web Service
sudo mv /tmp/webapp.service /etc/systemd/system
sudo rm -rf /opt/webapp/*
sudo unzip /tmp/application.zip -d /opt/webapp

sudo mv /tmp/.env /opt/webapp

# Create Service-Specific User
sudo groupadd -f servicegroup
sudo useradd -r -M -g servicegroup -s /usr/sbin/nologin serviceuser || true
sudo useradd -r -s /usr/sbin/nologin -m serviceuser || true

# Install Node.js and Dependencies
echo "Installing Node.js runtime..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js and npm installation
node -v
npm -v

# Prepare webapp directory with proper permissions
echo "Setting up application directory..."
cd /opt/webapp
sudo chown -R ubuntu:ubuntu /opt/webapp
sudo chmod -R 755 /opt/webapp

# Install application dependencies
echo "Fetching application dependencies..."
npm ci
npm install dotenv express mysql2 sequelize

# Set permissions for service user after npm operations
sudo chown -R serviceuser:servicegroup /opt/webapp

# echo "Application dependencies successfully installed."

# Configure MySQL for Application Usage
echo "Setting up MySQL schema..."
sudo mysql -e 'CREATE DATABASE IF NOT EXISTS HealthCheck;'
sudo mysql -e "CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'Pass1234';"
sudo mysql -e "GRANT ALL PRIVILEGES ON HealthCheck.* TO 'root'@'localhost';"
sudo mysql -e 'FLUSH PRIVILEGES;'

# Restart Web Service
sudo systemctl daemon-reload
sudo systemctl enable webapp.service
sudo systemctl start webapp.service

# echo "Application deployment completed."
