module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    "File",
    {
      // Unique identifier for the file (UUID v4)
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        field: "id",
      },

      // Original file name
      file_name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "file_name",
      },

      // URL where the file is stored (typically on S3)
      url: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "url",
      },

      // Timestamp when the file was uploaded
      upload_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "upload_date",
      },
    },
    {
      tableName: "files",     // Name of the database table
      timestamps: false,      // Disables Sequelize's automatic `createdAt`/`updatedAt`
    }
  );

  return File;
};
