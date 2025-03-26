// Import the required DataTypes from Sequelize
const { DataTypes } = require('sequelize');

// Import the Sequelize instance from the database configuration
const { sequelize } = require('../utils/database');

const File = sequelize.define(
      "File",
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          field: "id",
        },
        file_name: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "file_name",
        },
        url: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "url",
        },

        
        upload_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "upload_date",
        },
      },
      {
        tableName: "files",
        timestamps: false,
      }
    );

    module.exports = File;
  
