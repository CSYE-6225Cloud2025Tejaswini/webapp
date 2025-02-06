module.exports = (sequelize, DataTypes) => {
    const HealthStatus = sequelize.define(
      "HealthChecks",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "CheckId",  
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "DateTime",
        },
      },
      {
        tableName: "HealthChecks",
        timestamps: false,
      }
    );
  
    return HealthStatus;
  };