const express = require("express");
const { register, login, logout, updatePassword, updateProfile, deleteMyProfile, myProfile, resetPassword, verifyEmail, loginWithGoogle, registerWithGoogle, getOtp, verifyOtp, newAccessToken, getAvatar } = require("../controllers/user");
const { authMiddleware, authenticate } = require("../middlewares/auth");

const router = express.Router();

router.route("/register").post(register);

router.route("/login").post(login);

// router.route("/register/google").post(registerWithGoogle);

// router.route("/login/google").post(loginWithGoogle);

router.route("/logout").get(authMiddleware, logout);

router.route("/update/password").post(authenticate, updatePassword);

router.route("/update/profile").post(authenticate, updateProfile);

router.route("/delete/me").delete(authenticate, deleteMyProfile);

router.route("/me").get(authenticate,myProfile);

router.route("/password/forgot").post(getOtp);

router.route("/password/reset/").post(resetPassword);

router.route("/get-otp").post(getOtp);

router.route("/new-access-token").get( authMiddleware, newAccessToken);
router.route("/avatars").get(getAvatar);

module.exports = router;
