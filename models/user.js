const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter a Name"],
  },
  role: {
    type: String,
    default: "user",
    enum: ["user", "admin"],
  },
  phone: {
    type: String,
    required: [true, "Please enter a Phone Number"],
    unique: [true, "Mobile number already exists"],
  },
  email: {
    type: String,
    required: [true, "Please enter a Email"],
    unique: [true, "Email already exists"],
  },
  imageUrl: {
    type: String,
    required: [true, "Please enter a Image Url"],
  },
  standard: {
    type: String,
    default: "11th",
    enum: ["8th", "9th", "10th", "11th", "12th", "dropper"],
  },
  streams: [
    {
      type: String,
      required: [true, "Please provide your Stream"],
      enum: ["jee", "neet", "foundation"],
    },
  ],
  password: {
    type: String,
    required: [true, "Please enter a Password"],
    unique: [true, "Email already exists"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  otp: {
    type: String,
    maxLength: 4,
  },
  refreshToken: {
    type: String,
    required: false,
  },
  isUserVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  purchasedCourses: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: false,
      },
      completedLectures: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Lecture",
          required: false,
        },
      ],
    },
  ],
  purchasedTestSeries: [
    {
      testSeriesId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TestSeries",
        required: false,
        index: true,
      },
      attemptedTestPapers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TestPaper",
          required: false,
          index: true,
        },
      ],
    },
  ],
  purchasedMaterials: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Materials",
      required: false,
    },
  ],
  savedLectures: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: false,
    },
  ],

  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verifyToken: String,
  verifyTokenExpire: Date,
});
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = async function () {
  return await jwt.sign(
    { _id: this._id },
    process.env.JWT_SECRET_ACCESS_TOKEN,
    { expiresIn: "1h" }
  );
};

userSchema.methods.generateRefreshToken = async function () {
  return await jwt.sign(
    { _id: this._id },
    process.env.JWT_SECRET_REFRESH_TOKEN,
    { expiresIn: "4h" }
  );
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
userSchema.methods.getVerifyToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  this.verifyToken = crypto.createHash("sha256").update(token).digest("hex");
  this.verifyTokenExpire = Date.now() + 10 * 60 * 1000;
  return token;
};
module.exports = mongoose.model("User", userSchema);
