module.exports = {
  secret:           process.env.JWT_SECRET          || 'your-secret-key',
  expiresIn:        '15m',
  refreshSecret:    process.env.JWT_REFRESH_SECRET   || 'your-refresh-secret-key',
  refreshExpiresIn: '7d',
};
