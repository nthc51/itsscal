const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'calendar',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    dialect: 'mysql',
    logging: false,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    // Ensure models are registered and tables exist
    // Require models so they register with sequelize
    require('../models/User');
    require('../models/Event');
    require('../models/RecurrenceSeries');
    await sequelize.sync({ alter: true });
    console.log('MySQL connected and models synced successfully.');
    return sequelize;
  } catch (error) {
    console.error('MySQL connection failed:', error.message || error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
