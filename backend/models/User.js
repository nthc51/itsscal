const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    full_name: { type: DataTypes.STRING(256), allowNull: false },
    email: { type: DataTypes.STRING(320), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'users',
    timestamps: false,
  }
);

module.exports = User;
