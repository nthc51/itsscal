const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RecurrenceSeries = sequelize.define(
  'RecurrenceSeries',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(256), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    type: { type: DataTypes.ENUM('hoc', 'deadline', 'lam_them'), allowNull: false },
    tag_label: { type: DataTypes.STRING(100), allowNull: true, defaultValue: '' },
    start_date: { type: DataTypes.STRING(10), allowNull: false },
    start_time: { type: DataTypes.STRING(8), allowNull: false },
    end_time: { type: DataTypes.STRING(8), allowNull: false },
    location: { type: DataTypes.STRING(256), allowNull: true, defaultValue: '' },
    recurrence_frequency: { type: DataTypes.ENUM('daily', 'weekly', 'monthly'), allowNull: false },
    recurrence_interval: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    recurrence_until_date: { type: DataTypes.STRING(10), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'recurrence_series',
    timestamps: false,
  }
);

module.exports = RecurrenceSeries;
