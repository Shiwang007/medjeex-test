const { sendEmail } = require("../middlewares/sendEmail");
const { sendOTP } = require("../middlewares/sendOTP");
const {
  generateOTP,
  encryptRefreshToken,
} = require("../middlewares/otpGenerator");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const Avatar = require("../models/avatar");

exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      avatar,
      mobile,
      streams,
      standard,
      isUserVerified,
    } = req.body;

    if (
      !username ||
      !email ||
      !password ||
      !avatar ||
      streams.length === 0 ||
      !standard ||
      isUserVerified === undefined ||
      !mobile
    ) {
      return res.status(400).json({
        status: "error",
        message: "Failed to register user.",
        error: {
          code: "VALIDATION_ERROR",
          details: "One or more required fields are missing or invalid.",
        },
      });
    }

    if (!/^\d+$/.test(mobile) || !(mobile.length < 11)) {
      console.log(!/^\d+$/.test(mobile));
      return res.status(400).json({
        status: "error",
        message: "Failed to register user.",
        error: {
          code: "INVALID_FORMAT",
          details: "The phone number format is invalid.",
        },
      });
    }

    let user = await User.findOne({ phone: mobile, email: email });

    if (user) {
      if (user.isUserVerified) {
        return res.status(400).json({
          status: "error",
          message: "Failed to register user.",
          error: {
            code: "USER_ALREADY_EXISTS",
            details:
              "An account with this mobile number or email already exists.",
          },
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: "Failed to register user.",
          error: {
            code: "USER_ALREADY_EXISTS_BUT_USER_NOT_VERIFIED",
            details:
              "An account with this mobile number or email already exists. But user not verified.",
          },
        });
      }
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password) ||
      !/\d/.test(password)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Failed to register user.",
        error: {
          code: "WEAK_PASSWORD",
          details: "The provided password does not meet security requirements.",
        },
      });
    }
    user = new User({
      username,
      email,
      password,
      phone: mobile,
      imageUrl: avatar,
      standard,
      streams,
      isUserVerified,
    });

    await user.save();
    
    const newUser = await User.findOne({ phone: user.phone, email: user.email });

    if (newUser) {
      return res.status(200).json({
        status: "success",
        message: "User registered successfully.",
      });
    }
    return res.status(400).json({
      status: "failed",
      message: "Failed to register user.",
    });
    
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        details: "An unexpected error occurred. Please try again later.",
      },
    });
  }
};

exports.registerWithGoogle = async (req, res) => {
  try {
    let { username, email, password, imageUrl, phone, stream } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username,
        email,
        password,
        imageUrl,
        phone,
        stream,
        // isEmailVerified: true,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "user already exists" });
    }
    return res
      .status(201)
      .json({ success: true, message: "user is registered successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        status: "error",
        message: "Login failed.",
        error: {
          code: "EMPTY_FIELDS",
          details: "Mobile number and password cannot be empty.",
        },
      });
    }

    if (!/^\d+$/.test(mobile) || !(mobile.length < 11)) {
      console.log(!/^\d+$/.test(mobile));
      return res.status(400).json({
        status: "error",
        message: "Failed to register user.",
        error: {
          code: "INVALID_FORMAT",
          details: "The phone number format is invalid.",
        },
      });
    }

    const user = await User.findOne({ phone: mobile }).select("+password");

    if (!user)
      return res.status(404).json({
        status: "error",
        message: "Login failed.",
        error: {
          code: "USER_NOT_FOUND",
          details: "User does not exist.",
        },
      });

    if (!user.isUserVerified) {
      return res.status(400).json({
        status: "error",
        message: "Login failed.",
        error: {
          code: "ACCOUNT_NOT_ACTIVATED",
          details: "Your account is not activated.",
        },
      });
    }
    const isMatch = await user.matchPassword(password);

    if (!isMatch)
      res.status(400).json({
        status: "error",
        message: "Login failed.",
        error: {
          code: "INVALID_CREDENTIALS",
          details: "The phone number or password is incorrect.",
        },
      });

    const accesstoken = await user.generateToken();
    const refreshtoken = await user.generateRefreshToken();

    user.refreshToken = await encryptRefreshToken(refreshtoken);
    await user.save();

    user.password = undefined;
    user.otp = undefined;
    user.refreshToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPassword = undefined;
    user.verifyToken = undefined;
    user.verifyTokenExpire = undefined;
    return res.status(200).json({
      status: "success",
      message: "Login successful.",
      data: {
        user,
        accesstoken,
        refreshtoken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        details: "An unexpected error occurred. Please try again later.",
      },
    });
  }
};

exports.loginWithGoogle = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "user does not exist",
      });
    }
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: "incorrect password",
      });
    }

    const token = await user.generateToken();
    console.log(token);
    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
    res.status(200).cookie("token", token, options).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findOne({ _id: userId });

    const isMatch = await bcrypt.compare(req.token, user.refreshToken);
    if (!isMatch)
      return res.status(403).json({ message: "Invalid refresh token" });

    user.refreshToken = null;
    await user.save();

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({
        success: false,
        message: "Please provide old and new password",
      });
    if (oldPassword === newPassword)
      return res.status(400).json({
        success: false,
        message: "Old and new password cannot be same",
      });
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old Password is Incorrect",
      });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { username, email, imageUrl } = req.body;
    if (username) {
      user.username = username;
    }
    if (email) {
      user.email = email;
    }
    if (imageUrl) {
      user.imageUrl = imageUrl;
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user });

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    user.refreshToken = undefined;
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({
        status: "error",
        message: "Failed to send OTP.",
        error: {
          code: "EMPTY_PHONE_NUMBER",
          details: "Mobile number cannot be empty.",
        },
      });
    }

    if (!/^\d+$/.test(mobile) || !(mobile.length < 11)) {
      console.log(!/^\d+$/.test(mobile));
      return res.status(400).json({
        status: "error",
        message: "Failed to register user.",
        error: {
          code: "INVALID_FORMAT",
          details: "The phone number format is invalid.",
        },
      });
    }

    // const otp = generateOTP();
    // const message = "OTP is \n\n" + otp;

    const otp = "4637"

    const encryptedOTP = await bcrypt.hash(otp, 10);
    try {
      // await sendOTP(mobile, message);
      res.status(200).json({
        status: "success",
        message: "OTP sent successfully.",
        data: {
          otp: encryptedOTP,
        },
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Failed to send OTP.",
        error: {
          code: "INVALID_PHONE_NUMBER",
          details: "The phone number provided is not valid.",
        },
      });
    }
    
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        details: "An unexpected error occurred. Please try again later.",
      },
    });
  }
};

// exports.verifyOtp = async (req, res) => {
//   try {
//     const user = await User.findOne({ phone: req.body.phone });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }
//     if (req.body.otp !== user.otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }
//     user.isUserVerified = true;
//     user.otp = undefined;
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Otp Verified.",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

exports.resetPassword = async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    if (!newPassword || !mobile) {
      return res.status(400).json({
        status: "error",
        message: "Password reset failed.",
        error: {
          code: "EMPTY_FIELDS",
          details: "Mobile number and new password cannot be empty.",
        },
      });
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Password reset failed.",
        error: {
          code: "INVALID_PASSWORD_FORMAT",
          details:
            "The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
      });
    }

    if (!/^\d+$/.test(mobile) || !(mobile.length < 11)) {
      console.log(!/^\d+$/.test(mobile));
      return res.status(400).json({
        status: "error",
        message: "Failed to register user.",
        error: {
          code: "INVALID_FORMAT",
          details: "The phone number format is invalid.",
        },
      });
    }

    const user = await User.findOne({ phone: mobile });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Password reset failed.",
        error: {
          code: "USER_NOT_FOUND",
          details: "No user found with the provided mobile number.",
        },
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password reset successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        details: "An unexpected error occurred. Please try again later.",
      },
    });
  }
};

exports.contactUs = async (req, res) => {
  try {
    const { name, email, mobileNumber, message } = req.body;
    const messageToSend = `Name: ${name} \nEmail: ${email} \nMobile Number: ${mobileNumber} \nMessage: ${message}`;
    await sendEmail({
      email: "adityasiremail@gmail.com",
      subject: "Dear Sir I am interested in MEDJEEX",
      message: messageToSend,
    });
    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.joinWishlist = async (req, res) => {
  try {
    const { name, email, mobileNumber, course, stream } = req.body;
    const messageToSend = `Name: ${name} \nEmail: ${email} \nMobile Number: ${mobileNumber} \nCourse: ${course} \nStream: ${stream}`;
    const wish = await TempWishList.findOne({ email, course, stream });
    if (wish) {
      res.status(400).json({
        success: false,
        message: "You are already in the wishlist for this course",
      });
    } else {
      await sendEmail({
        email: "adityasiremail@gmail.com",
        subject:
          "Dear Sir I am Interested in pursuing a course from MEDJEEX, Please add me to the wishlist",
        message: messageToSend,
      });
      await TempWishList.create({
        name: name,
        email: email,
        phone: mobileNumber,
        course: course,
        stream: stream,
      });
      res.status(200).json({
        success: true,
        message: "Message sent successfully",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.newAccessToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findOne({ _id: userId });

    const isMatch = await bcrypt.compare(req.token, user.refreshToken);
    if (!isMatch)
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });

    // Generate a new access token
    const accesstoken = await user.generateToken();

    return res
      .status(200)
      .json({ success: true, message: "new access token", data: accesstoken });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res
      .status(403)
      .json({ success: false, message: "Invalid or expired refresh token" });
  }
};

exports.getAvatar = async (req, res) => {
  try {
    const avatars = await Avatar.find();

    if (avatars.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No avatars available.",
        error: {
          code: "NO_AVATARS",
          details: "Currently, there are no avatars available on the server.",
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Avatar URLs fetched successfully.",
      data: {
        avatars: avatars,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        details:
          "An unexpected error occurred while fetching avatars. Please try again later.",
      },
    });
  }
};
