const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// We'll store deadline fields directly on the event row to keep parity with the
// embedded sub-document in the previous MongoDB model.
const Event = sequelize.define(
  'Event',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(256), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    type: { type: DataTypes.ENUM('hoc', 'deadline', 'lam_them', 'holiday'), allowNull: false },
    tag_label: { type: DataTypes.STRING(100), allowNull: true, defaultValue: '' },
    event_date: { type: DataTypes.STRING(10), allowNull: false },
    start_time: { type: DataTypes.STRING(8), allowNull: false },
    end_time: { type: DataTypes.STRING(8), allowNull: false },
    location: { type: DataTypes.STRING(256), allowNull: true, defaultValue: '' },
    recurrence_series_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    recurrence_frequency: { type: DataTypes.ENUM('none', 'daily', 'weekly', 'monthly'), allowNull: false, defaultValue: 'none' },
    recurrence_interval: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    recurrence_until_date: { type: DataTypes.STRING(10), allowNull: true },
    recurrence_group_key: { type: DataTypes.STRING(64), allowNull: true },
    // Deadline fields (nullable when not a deadline)
    deadline_due_datetime: { type: DataTypes.DATE, allowNull: true },
    deadline_priority: { type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: true },
    deadline_is_completed: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    deadline_completed_at: { type: DataTypes.DATE, allowNull: true },
    // General completion for all event types
    is_completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'events',
    timestamps: false,
    indexes: [{ fields: ['user_id', 'event_date'] }],
  }
);

module.exports = Event;
