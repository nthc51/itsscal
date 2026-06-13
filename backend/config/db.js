const { Sequelize } = require('sequelize');

const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'calendar';
const username = process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
const port = Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306);

const sequelize = new Sequelize(
  database,
  username,
  password,
  {
    host,
    port,
    dialect: 'mysql',
    logging: false,
  }
);

const connectDB = async () => {
  try {
    console.log(`Connecting to MySQL at ${host}:${port}/${database} as ${username}`);
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
