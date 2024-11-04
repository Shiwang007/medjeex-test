const bcrypt = require('bcrypt');

exports.generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
}

exports.encryptRefreshToken = async (token) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(token, salt);
};