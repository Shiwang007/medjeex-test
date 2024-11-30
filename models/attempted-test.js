const mongoose = require("mongoose");

const attemptedTestSchema = new mongoose.Schema(
  {
    attemptedTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestPaper",
      required: true,
      index: true,
    },
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSeries",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionArr: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Question",
          index: true,
        },
        selectedAnswer: {
          type: String,
          required: true,
          default: "",
        },
        markedForReview: {
          type: Boolean,
          required: true,
          default: false,
        },
        isSaved: {
          type: Boolean,
          required: true,
          default: false,
        },
      },
    ],
    testStartedAt: {
      type: Date,
      required: true,
    },
    testSubmittedAt: {
      type: Date,
      required: false,
    },
    testSubmitted: {
      type: Boolean,
      required: true,
      default: false,
    },
    attemptedCount: {
      type: Number,
      required: false,
      default: 0
    },
  },
  {
    timestamps: true,
  }
);

const AttemptedTest = mongoose.model("AttemptedTest", attemptedTestSchema);

module.exports = AttemptedTest;
