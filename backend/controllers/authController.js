const authService = require('../services/authService');
const { sendRes } = require('../utils/responseHelper');

const register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password)
      return sendRes(res, 400, 'Vui lòng nhập đầy đủ thông tin');

    const data = await authService.register({ full_name, email, password });
    sendRes(res, 201, 'Đăng ký thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Đăng ký thất bại', null, err.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return sendRes(res, 400, 'Vui lòng nhập đầy đủ thông tin');

    const result    = await authService.login({ email, password });
    const isProd    = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('auth_session', '1', {
      httpOnly: false,
      secure:   isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    sendRes(res, 200, 'Đăng nhập thành công', {
      token: result.token,
      user:  result.user,
    });
  } catch (err) {
    sendRes(res, 401, 'Đăng nhập thất bại', null, err.message);
  }
};

const me = async (req, res) => {
  try {
    const data = await authService.getProfile(req.user.user_id);
    sendRes(res, 200, 'Lấy thông tin tài khoản thành công', data);
  } catch (err) {
    sendRes(res, 404, 'Không tìm thấy tài khoản', null, err.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const data = await authService.updateProfile(req.user.user_id, { full_name, email });
    sendRes(res, 200, 'Cập nhật thông tin thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Cập nhật thông tin thất bại', null, err.message);
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return sendRes(res, 400, 'Vui lòng nhập đầy đủ thông tin');
    if (new_password.length < 6) return sendRes(res, 400, 'Mật khẩu mới tối thiểu 6 ký tự');

    const data = await authService.changePassword(req.user.user_id, current_password, new_password);
    sendRes(res, 200, 'Đổi mật khẩu thành công', data);
  } catch (err) {
    sendRes(res, 400, 'Đổi mật khẩu thất bại', null, err.message);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return sendRes(res, 401, 'Không tìm thấy refresh token');

    const result = await authService.refresh(refreshToken);
    sendRes(res, 200, 'Làm mới token thành công', result);
  } catch (err) {
    sendRes(res, 403, 'Refresh token không hợp lệ', null, err.message);
  }
};

const logout = async (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    res.clearCookie('auth_session', {
      secure:   isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    sendRes(res, 200, 'Đăng xuất thành công');
  } catch (err) {
    sendRes(res, 500, 'Lỗi đăng xuất', null, err.message);
  }
};

module.exports = { register, login, refresh, logout, me, updateProfile, changePassword };
