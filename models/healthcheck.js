module.exports = (sequelize, DataTypes) => {
    const HealthCheck = sequelize.define(
      "HealthCheck",
      {
        // Primary key: auto-incrementing integer ID for each health check entry
        checkId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "check_id",
        },
  
        // Timestamp of when the health check was recorded
        datetime: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "datetime",
        },
      },
      {
        tableName: "health_check", // Name of the database table
        timestamps: false,         // Disable Sequelize's default timestamp fields
      }
    );
  
    return HealthCheck;
  };
  