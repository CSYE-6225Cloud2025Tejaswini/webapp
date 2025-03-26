// Import Sequelize, an ORM for working with relational databases
const { Sequelize } = require('sequelize');

// Import dotenv to load environment variables from a .env file
const dotenv = require('dotenv');

dotenv.config();

// Create a Sequelize instance to connect to the database
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,       // Disable query logging for a cleaner console
});

// Function to connect to the database and test the connection
const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();   // Test the database connection
        console.log('Connection has been established successfully.');
        await sequelize.sync({ alter: true });
    } catch (error) {
         // Log an error if the connection fails
        console.error('Unable to connect to the database:', error);
    }
};

// Export the Sequelize instance and the connection function
module.exports = { sequelize, connectToDatabase };
