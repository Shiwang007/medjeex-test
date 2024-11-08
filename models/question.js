const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
      default: () => new mongoose.Types.ObjectId(),
    },
    questionType: {
      type: String,
      enum: ["single-correct", "integer", "multi-correct"],
      required: true,
    },
    testPaperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestPaper",
      required: true,
      index: true,
    },
    questionFormat: {
      type: String,
      required: true,
      enum: ["imageurl", "text"],
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        value: {
          type: String,
          required: false,
        },
        format: {
          type: String,
          required: false,
          enum: ["text", "imageurl"],
        },
      },
    ],
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Physics",
        "Chemistry",
        "Mathematics",
        "Botany",
        "Science",
        "Zoology",
      ],
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    negativeMarking: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
