const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/.env" });
}

//using middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Importing routes
const userRouter = require("./routes/user");
const testSeriesRouter = require("./routes/test-series");


// using routes
app.use("/api/v1", userRouter);
app.use("/api/v1", testSeriesRouter);

module.exports = app;
