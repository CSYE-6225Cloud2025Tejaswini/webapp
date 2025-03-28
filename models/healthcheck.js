module.exports = (sequelize, DataTypes) => {
    const HealthCheck = sequelize.define(
      "HealthCheck",
      {
        checkId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: "check_id",
        },
        datetime: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "datetime",
        },
      },
      {
        tableName: "health_check",
        timestamps: false,
      }
    );
  
    return HealthCheck;
  };
  