// Import the required DataTypes from Sequelize
const { DataTypes } = require('sequelize');

// Import the Sequelize instance from the database configuration
const { sequelize } = require('../config/database');

// Define the HealthCheck model
// This model represents a table in the database named "HealthChecks"
const HealthCheck = sequelize.define('HealthCheck', {
    CheckId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    // Define the DateTime column
    // This stores the date and time of each health check in UTC
    DateTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
}, {
    // Disable automatic creation of createdAt and updatedAt timestamps
    timestamps: false,
});

// Export the HealthCheck model for use in other parts of the application
module.exports = HealthCheck;
