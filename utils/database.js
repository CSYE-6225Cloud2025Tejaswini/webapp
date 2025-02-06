const { Sequelize } = require("sequelize");

require("dotenv").config();

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, PORT } = process.env;

const sequelize = new Sequelize(
  //changed here
  DB_NAME,      
  DB_USER,     
  DB_PASSWORD,       
  {
      host: DB_HOST,
      port: PORT,
      dialect: "mysql",
      logging: false,
      dialectOptions: {
        // added this as I was getting error for the 200 OK response
        authPlugins: {
          mysql_clear_password: () => () =>
            Buffer.from(process.env.DB_PASSWORD + "\0"),
        },
      },
  }
  
);

async function initializeDatabase() {
  try {
    await sequelize.authenticate();  
    console.log('Connection has been established successfully.');
  } catch (error) {
      console.error('Unable to connect to the database:', error);
  }
}
 
module.exports = { initializeDatabase, sequelize };