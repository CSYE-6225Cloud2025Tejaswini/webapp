const app = require("./app");
const { initializeDatabase, sequelize } = require("./utils/database");
const PORT = 8080;
 
async function launchServer() {
  try {
    // Ensure the database is initialized and synchronized
    await initializeDatabase();
    await sequelize.sync({force: false});
    console.log("Database initialized and synchronized successfully");
 
    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Application is live on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err);
    process.exit(1);
  }
}
 
launchServer();