const mongoose = require("mongoose");
const AttemptedTest = require("../models/attempted-test");

const groupTestQuestionsBySubject = async (
  userId,
  testSeriesId,
  testPaperId
) => {
  try {
    const groupedQuestions = await AttemptedTest.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          testSeriesId: new mongoose.Types.ObjectId(testSeriesId),
          attemptedTestId: new mongoose.Types.ObjectId(testPaperId),
          testSubmitted: false
        },
      },
      {
        $unwind: "$questionArr",
      },
      {
        $lookup: {
          from: "questions",
          localField: "questionArr.questionId",
          foreignField: "questionId",
          as: "questionDetails",
        },
      },
      {
        $unwind: "$questionDetails",
      },
      {
        $group: {
          _id: "$questionDetails.subject",
          questions: {
            $push: {
              questionId: "$questionDetails.questionId",
              questionType: "$questionDetails.questionType",
              questionFormat: "$questionDetails.questionFormat",
              question: "$questionDetails.question",
              options: "$questionDetails.options",
              marks: "$questionDetails.marks",
              negativeMarking: "$questionDetails.negativeMarking",
              selectedAnswer: "$questionArr.selectedAnswer",
              markedForReview: "$questionArr.markedForReview",
              isSaved: "$questionArr.isSaved",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          subject: "$_id",
          questions: 1,
        },
      },
    ]);

    return groupedQuestions;
  } catch (error) {
    console.error("Error grouping questions by subject:", error);
    throw new Error("Failed to group questions by subject.");
  }
};

module.exports = groupTestQuestionsBySubject;