const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const User      = require('../models/User');

const register = async ({ full_name, email, password }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error('Email đã được sử dụng');

  const password_hash = await bcrypt.hash(password, 10);
  const newUser = await User.create({ full_name, email, password_hash });

  return {
    user_id:   newUser.id,
    full_name: newUser.full_name,
    email:     newUser.email,
  };
};

const login = async ({ email, password }) => {
  const found = await User.findOne({ where: { email } });
  if (!found) throw new Error('Email không tồn tại');

  const isMatch = await bcrypt.compare(password, found.password_hash);
  if (!isMatch) throw new Error('Mật khẩu không chính xác');

  const payload      = { user_id: found.id, email: found.email };
  const token        = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
  const refreshToken = jwt.sign({ user_id: found.id }, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn });

  return {
    token,
    refreshToken,
    user: {
      user_id:   found.id,
      full_name: found.full_name,
      email:     found.email,
    },
  };
};

const refresh = async (refreshToken) => {
  if (!refreshToken) throw new Error('Không có refresh token');

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch {
    throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
  }

  const found = await User.findByPk(decoded.user_id);
  if (!found) throw new Error('Tài khoản không tồn tại');

  const payload = { user_id: found.id, email: found.email };
  const token   = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

  return {
    token,
    user: {
      user_id:   found.id,
      full_name: found.full_name,
      email:     found.email,
    },
  };
};

const getProfile = async (user_id) => {
  const found = await User.findByPk(user_id, { attributes: ['id', 'full_name', 'email', 'created_at'] });
  if (!found) throw new Error('Tài khoản không tồn tại');

  return {
    user_id: found.id,
    full_name: found.full_name,
    email: found.email,
    created_at: found.created_at,
  };
};

const updateProfile = async (user_id, { full_name, email }) => {
  const found = await User.findByPk(user_id);
  if (!found) throw new Error('Tài khoản không tồn tại');

  if (email && email !== found.email) {
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) throw new Error('Email đã được sử dụng');
  }

  await found.update({
    full_name: full_name?.trim() || found.full_name,
    email: email?.trim() || found.email,
  });

  return {
    user_id: found.id,
    full_name: found.full_name,
    email: found.email,
  };
};

const changePassword = async (user_id, current_password, new_password) => {
  const found = await User.findByPk(user_id);
  if (!found) throw new Error('Tài khoản không tồn tại');

  const isMatch = await bcrypt.compare(current_password, found.password_hash);
  if (!isMatch) throw new Error('Mật khẩu hiện tại không chính xác');

  const password_hash = await bcrypt.hash(new_password, 10);
  await found.update({ password_hash });

  return { user_id: found.id, full_name: found.full_name, email: found.email };
};

module.exports = { register, login, refresh, getProfile, updateProfile, changePassword };
