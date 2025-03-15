#!/bin/bash

# Set database administrator access credentials
DB_ADMIN_SECRET="Pass1234"

echo "Establishing service account csye6225..."
sudo groupadd -f csye6225
sudo useradd -r -M -g csye6225 -s /usr/sbin/nologin csye6225

echo "Refreshing package repositories and installing required components..."
sudo apt-get update -y
sudo apt-get install -y mysql-server

echo "Configuring database service..."
sudo systemctl enable mysql
sudo systemctl start mysql
# Initialize database security
configure_database() {
    echo "Implementing database security measures..."
    sudo mysql <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH 'mysql_native_password' BY '$DB_ADMIN_SECRET';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF
}
configure_database

echo "Preparing application deployment location..."
sudo mkdir -p /opt/myapp
sudo mv /tmp/webapp /opt/myapp/webapp
sudo chmod +x /opt/myapp/webapp

echo "Generating configuration file..."
cat <<EOF | sudo tee /opt/myapp/.env > /dev/null
DB_URL=mysql://root:Pass1234@localhost:3306/healthcheck_db
DB_NAME=healthcheck_db
DB_USER=root
DB_PASSWORD=Pass1234
DB_HOST=localhost
PORT=8080
DB_PORT=3306
EOF

sudo chmod 600 /opt/myapp/.env

echo "Adjusting file permissions for application..."
sudo chown -R csye6225:csye6225 /opt/myapp
sudo chmod -R 777 /opt/myapp

echo "Registering application as system service..."
sudo mv /tmp/webapp.service /etc/systemd/system/webapp.service
sudo chmod 644 /etc/systemd/system/webapp.service

echo "Activating system service configuration..."
sudo systemctl daemon-reload
sudo systemctl enable webapp
# sudo systemctl start webapp

echo "Installation completed successfully!"