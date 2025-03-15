// require("dotenv").config();
 
// module.exports = {
//   development: {
//     url: process.env.DB_URL,
//     dialect: "mysql",
//     logging: false, // Disable logging for cleaner output
//   },
// };


require("dotenv").config({
    path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  });
   
  module.exports = {
    development: {
        url: process.env.DB_URL,
        dialect: "mysql",
        dialectModule: require('mysql2'),
      logging: false,
    },
    test: {
      url: process.env.DATABASE_URL,
      dialect: "mysql",
      dialectModule: require('mysql2'),
      logging: false,
    },
};

