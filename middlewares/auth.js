const User = require("../models/user");
const jwt = require("jsonwebtoken");


// exports.isAuthenticated = async (req, res, next) => {
//   try {
//     const { token } = req.cookies;
//     if (!token) {
//       return res.status(401).json({
//         success:false,
//         message: "Please Log in first",
//       });
//     }
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded._id);
//     if(!req.user){
//         return res.status(401).json({
//             success:false,
//             message: "Please Log in first",
//         });
//     }
//     next();
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.isAdmin = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({
        success:false,
        message: "Please Log in first",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded._id);
    if(!req.user){
        return res.status(401).json({
            success:false,
            message: "Please Log in first",
        });
    }
    if(req.user.role !== 'admin'){
        return res.status(403).json({
            success:false,
            message: "You are not authorized to access this route",
        });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(403).json({ success: false,message: "Authentication required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_REFRESH_TOKEN);
    req.user = { _id: decoded._id };
    req.token = token;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired refresh token" });
  }
};

exports.authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  console.log(token);

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS_TOKEN);
    console.log(decoded);
    req.user = decoded._id;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: "Invalid or expired access token" });
  }
};
