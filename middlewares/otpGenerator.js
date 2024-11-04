const bcrypt = require('bcrypt');

exports.generateOTP = () => {
  otp = Math.floor(1000 + Math.random() * 9000);
  return "" + otp;
}

exports.encryptRefreshToken = async (token) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(token, salt);
};