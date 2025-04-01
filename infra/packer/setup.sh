#!/bin/bash

# Refresh system package information and upgrade installed packages
sudo apt update -y
sudo apt upgrade -y

# ------------------------
# Install and Setup MySQL
# ------------------------
echo "Setting up MySQL..."

# Install required tools for MySQL repo configuration
sudo apt-get install -y gnupg curl

# Add MySQL GPG key
curl -fsSL https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 | sudo gpg --dearmor -o /usr/share/keyrings/mysql-keyring.gpg

# Update package list and install MySQL server
sudo apt-get update
sudo apt-get install -y mysql-server

# Enable and start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# -------------------------
# Install Unzip Utility
# -------------------------
sudo apt install unzip -y

# -----------------------------
# Deploy Node.js Web Service
# -----------------------------
# Move systemd service unit file into place
sudo mv /tmp/webapp.service /etc/systemd/system

# Clean any previous application files
sudo rm -rf /opt/webapp/*

# Extract new application code to the deployment directory
sudo unzip /tmp/application.zip -d /opt/webapp

# Move .env configuration file
sudo mv /tmp/.env /opt/webapp

# -------------------------------------
# Create Service-Specific Linux User
# -------------------------------------
# Ensure group exists
sudo groupadd -f servicegroup

# Add non-login user to servicegroup
sudo useradd -r -M -g servicegroup -s /usr/sbin/nologin serviceuser || true
sudo useradd -r -s /usr/sbin/nologin -m serviceuser || true

# ------------------------------
# Install Node.js & Dependencies
# ------------------------------
echo "Installing Node.js runtime..."

# Add Node.js 18.x repo and install
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Confirm installation
node -v
npm -v

# -------------------------------
# Set Up Application Environment
# -------------------------------
echo "Setting up application directory..."

cd /opt/webapp

# Set initial permissions
sudo chown -R ubuntu:ubuntu /opt/webapp
sudo chmod -R 755 /opt/webapp

# Install dependencies from package-lock.json
echo "Fetching application dependencies..."
npm ci

# Explicitly install critical dependencies (if not listed in package.json)
npm install dotenv express mysql2 sequelize

# Set ownership to service user after installations
sudo chown -R serviceuser:servicegroup /opt/webapp

# -------------------------------------
# Configure MySQL for the Application
# -------------------------------------
echo "Setting up MySQL schema..."

# Create application-specific DB and user
sudo mysql -e 'CREATE DATABASE IF NOT EXISTS HealthCheck;'
sudo mysql -e "CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'Pass1234';"
sudo mysql -e "GRANT ALL PRIVILEGES ON HealthCheck.* TO 'root'@'localhost';"
sudo mysql -e 'FLUSH PRIVILEGES;'

# -------------------------------
# Start Web Application Service
# -------------------------------
# Register and start the systemd service
sudo systemctl daemon-reload
sudo systemctl enable webapp.service
sudo systemctl start webapp.service

# echo "Application deployed successfully"
