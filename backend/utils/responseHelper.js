const sendRes = (res, statusCode, message, data = null, error = null) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
    error,
  });
};

module.exports = { sendRes };
