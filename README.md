# Web-Application
A cloud-native application is an application that is specifically designed for cloud computing architecture. It takes advantage of cloud computing frameworks composed of loosely coupled cloud services.

# Health Check API

## Description
A lightweight Node.js application designed to monitor the health of a backend service instance. The `/healthz` endpoint verifies database connectivity and downstream API availability, returning appropriate HTTP status codes.

## Prerequisites
To build and deploy the application locally, ensure you have the following installed:
1. **Node.js** (v14 or higher): [Install Node.js](https://nodejs.org/)
2. **MySQL** (running locally or remotely):
   - Ensure MySQL is accessible on `localhost` (or your specified host).
   - Create a database named `healthcheck_db`.
3. **Git**: For version control and cloning the repository.

API Endpoints
/healthz
Method: GET
Description: Verifies the health of the service by:
Checking database connectivity.
Monitoring downstream API availability.
Responses
200 OK: Health check successful.
503 Service Unavailable: Health check failed (database or downstream API issue).
400 Bad Request: Payload included in the GET request.
405 Method Not Allowed: Unsupported HTTP method.


## Environment Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/health-check-api.git
   cd health-check-api

2. Install dependencies:
   ```bash
   npm install

4. Create a .env file in the project root with the following variables:
    ```bash
    DB_NAME=healthcheck_db
    DB_USER=root
    DB_PASSWORD=your_root_password
    DB_HOST=localhost
    PORT=8080

6. Ensure your MySQL server is running and the healthcheck_db database exists:
    ```bash
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS healthcheck_db;"

## Build and Deploy Instructions

## Build Instructions

The application is backend-only (API-focused) and does not require any additional build steps. All dependencies are managed via npm.

To prepare the application:

1. Ensure the .env file is properly configured.
2. Install dependencies:
   ```bash
   npm install

## Deploy Instructions

1. Start the Application: To run the application locally, execute:
   ```bash
   node app.js

3. Access the API: The application will be available at:
    ```bash
   http://localhost:8080/healthz

5. Test the Endpoint: Use curl or a tool like Postman to verify functionality:
   ```bash
   curl -X GET http://localhost:8080/healthz
