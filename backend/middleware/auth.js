const jwt       = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token)
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    // decoded: { user_id, email }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

module.exports = { authenticate };
