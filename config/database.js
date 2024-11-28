const mongoose = require("mongoose");
const TestSeries = require("../models/test-series");


exports.connectDatabase = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then((con) => {
      console.log(`database connected successfully ${con.connection.host}`);
    })
    .catch((err) => {
      console.log(err);
    });
};
