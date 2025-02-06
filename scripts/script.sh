#!/bin/bash
DATABASE_TITLE="system_monitor"       # Renamed database name
USER_GROUP="apiServiceGroup"
SERVICE_ACCOUNT="apiServiceUser"
LOCAL_ARCHIVE_PATH="./deployment.zip" # Updated local path variable
TARGET_INSTALL_DIR="/opt/deploy6225"
SQL_ROOT_PASS="SecurePass@1234!!"     # Root password for MySQL

# Function to verify 'unzip' installation
verify_unzip() {
    if ! command -v unzip &> /dev/null; then
        echo "'unzip' is missing. Proceeding with installation..."
        sudo apt update -y
        sudo apt install unzip -y
    else
        echo "'unzip' is available."
    fi
}

# Function to harden MySQL security settings
harden_mysql_security() {
    echo "Applying MySQL security configurations..."

    # Set root password and remove default security risks
    sudo mysql <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH 'mysql_native_password' BY '$SQL_ROOT_PASS';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF
}

echo "Refreshing package lists and updating installed packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing MySQL database server..."
sudo apt install mysql-server -y

echo "Enabling and starting MySQL service..."
sudo systemctl enable --now mysql

echo "Enhancing MySQL security settings..."
harden_mysql_security

echo "Initializing database $DATABASE_TITLE..."
sudo mysql -u root -p"$SQL_ROOT_PASS" -e "CREATE DATABASE IF NOT EXISTS $DATABASE_TITLE;"

echo "Setting up Linux group: $USER_GROUP..."
sudo groupadd -f $USER_GROUP

echo "Creating service account: $SERVICE_ACCOUNT and assigning to group $USER_GROUP..."
sudo useradd -m -g $USER_GROUP -s /bin/bash $SERVICE_ACCOUNT || echo "Service account already exists"

echo "Ensuring 'unzip' utility is installed..."
verify_unzip

echo "Extracting deployment package from $LOCAL_ARCHIVE_PATH..."
sudo mkdir -p "$TARGET_INSTALL_DIR"
sudo unzip -o "$LOCAL_ARCHIVE_PATH" -d "$TARGET_INSTALL_DIR"

echo "Updating ownership and permissions for the application directory..."
sudo chown -R "$SERVICE_ACCOUNT:$USER_GROUP" "$TARGET_INSTALL_DIR"
sudo chmod -R 750 "$TARGET_INSTALL_DIR"

echo "Deployment setup completed successfully!"
