const express = require('express');
const axios = require('axios');
const { connectToDatabase, sequelize } = require('./config/database');
const HealthCheck = require('./models/HealthCheck');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON body (optional, in case the app has other endpoints)
app.use(express.json());

// Middleware to reject payloads in GET requests
app.use((req, res, next) => {
    // Check if there is a payload by reading the content-length header
    if (req.headers['content-length'] && parseInt(req.headers['content-length'],10) > 0) {
         // Add headers to ensure the response is not cached
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Respond with 400 Bad Request if payload is found
        return res.status(400).send(); // Bad Request
    }
    next(); // Continue to the next middleware or route
});

// Health Check API: Checks the health of the application
app.get('/healthz', async (req, res) => {
    try {
        // Simulate a downstream API health check (always true in this example)
        const isDownstreamAPIHealthy = true; // Assuming downstream API is always healthy for simplicity

        // Insert a new record in the HealthCheck table
        await HealthCheck.create({});

        // Add headers to prevent caching of the response
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Respond with 200 OK to indicate the application is healthy
        return res.status(200).send(); // OK
    } catch (error) {

        console.error('Health check failed:', error.message);

        // Add headers to prevent caching of the response
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Respond with 503 Service Unavailable to indicate the application is unhealthy
        return res.status(503).send(); 
    }
});

// Catch-all for unsupported HTTP methods on /healthz
app.all('/healthz', (req, res) => {

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

     // Respond with 405 Method Not Allowed for unsupported methods
    return res.status(405).send(); // Method Not Allowed
});

// Initialize application
const initializeApp = async () => {
    try {

        // Connect to the database
        await connectToDatabase();
        // Sync the database schema (updates or creates tables)
        await sequelize.sync({ alter: true });
        // Start the server and listen on the specified port
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    } catch (error) {

        console.error('Failed to initialize application:', error);
         // Exit the process if the application fails to initialize
        process.exit(1);
    }
};

app.use((err, req, res, next)=> {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Invalid JSON');
        return res.status(400).send();
    }
    next(err);
});

// Start the application
initializeApp();
