const cron = require("node-cron");
const TestSeries = require("../models/test-series");
const TestPaper = require("../models/test-paper");
const Question = require("../models/question");
const AttemptedTest = require("../models/attempted-test");
const User = require("../models/user");
const mongoose = require("mongoose");

exports.getPurchasedTestSeries = async (req, res) => {
  try {
    const { _id } = req.user;

    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Fetching Purchased Test Series Data Failed.",
        error: {
          code: "USER_NOT_FOUND",
          details: "User does not exist.",
        },
      });
    }

    const purchasedSeriesMap = user.purchasedTestSeries.reduce(
      (acc, series) => {
        acc[series.testSeriesId.toString()] = series.attemptedTestPapers || [];
        return acc;
      },
      {}
    );

    const testSeriesIds = Object.keys(purchasedSeriesMap);

    const testSeriesData = await TestSeries.find({
      testSeriesId: { $in: testSeriesIds },
    }).select(
      "testSeriesId title features tags imageUrls totalTest description testSeriesType"
    );

    if (testSeriesData.length <= 0) {
      return res.status(404).json({
        status: "error",
        message: "No purchased test series found.",
        error: {
          code: "NO_TEST_SERIES",
          details: "The user has not purchased any test series yet.",
        },
      });
    }

    const testPaperData = await TestPaper.find({
      testSeriesId: { $in: testSeriesIds },
    }).select("testSeriesId totalQuestions ");

    const totalQuestionsMap = testPaperData?.reduce((acc, item) => {
      acc[item.testSeriesId] = item.totalQuestions;
      return acc;
    }, {});

    const purchasedTestSeries = testSeriesData?.map((series) => {
      const testSeriesId = series.testSeriesId.toString();
      const attemptedTestPapers = purchasedSeriesMap[testSeriesId] || [];
      const totalQuestions = totalQuestionsMap[testSeriesId] || 0;

      return {
        testSeriesId: series.testSeriesId || null,
        title: series.title || "",
        highlightPoints: series.features || [],
        descriptionPoints: series.description || "",
        testSeriesType: series.testSeriesType || "",
        subjectsTags: series.tags || [],
        allImageUrls: series.imageUrls || [],
        completedTestCount: attemptedTestPapers.length,
        indicators: [
          {
            key: "subjectIncluded",
            value: series.tags?.length || 0,
            displayName: "Subjects Included",
          },
          {
            key: "totalTests",
            value: series.totalTest || 0,
            displayName: "Total Tests",
          },
          {
            key: "totalQuestions",
            value: totalQuestions,
            displayName: "Total Questions",
          },
        ],
        purchaseDate: series.purchaseDate || "",
        validityPeriod: series.validityPeriod || {},
        isPurchased: true,
      };
    });

    if (purchasedTestSeries.length <= 0) {
      return res.status(404).json({
        status: "error",
        message: "No purchased test series found.",
        error: {
          code: "NO_TEST_SERIES",
          details: "The user has not purchased any test series yet.",
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Purchased Test Series fetched successfully",
      data: { testSeries: purchasedTestSeries },
    });
  } catch (error) {
    console.error("Error fetching test series:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

exports.getRecommendedTestSeries = async (req, res) => {
  try {
    const { _id } = req.user;

    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Fetching Recommended Test Series Data Failed.",
        error: {
          code: "USER_NOT_FOUND",
          details: "User does not exist.",
        },
      });
    }

    const purchasedTestSeriesIds = user.purchasedTestSeries.map(
      (series) => series.testSeriesId
    );

    const recommendedTestSeries = await TestSeries.aggregate([
      {
        $match: {
          testSeriesId: { $nin: purchasedTestSeriesIds },
          standard: user.standard,
          published: true,
        },
      },
      {
        $limit: 3,
      },
      {
        $lookup: {
          from: "TestPaper",
          localField: "testSeriesId",
          foreignField: "testSeriesId",
          as: "testPapers",
        },
      },
      {
        $addFields: {
          numericPrice: { $toDouble: "$price" },
          numericDiscountedPrice: { $toDouble: "$discountedPrice" },
          discountPercentage: {
            $multiply: [
              {
                $divide: [
                  {
                    $subtract: [
                      { $toDouble: "$price" },
                      { $toDouble: "$discountedPrice" },
                    ],
                  },
                  { $toDouble: "$price" },
                ],
              },
              100,
            ],
          },
          allImageUrls: "$imageUrls",
          subjectsTags: "$tags",
          highlightPoints: "$features",
          descriptionPoints: "$description",
          isPurchased: false,
          indicators: [
            {
              key: "subjectIncluded",
              value: { $size: "$tags" },
              displayName: "Subjects Included",
            },
            {
              key: "totalTests",
              value: "$totalTest",
              displayName: "Total Tests",
            },
            {
              key: "totalQuestions",
              value: { $sum: "$testPapers.totalQuestions" },
              displayName: "Total Questions",
            },
          ],
        },
      },

      {
        $project: {
          testSeriesId: 1,
          title: 1,
          allImageUrl: 1,
          subjectsTags: 1,
          highlightPoints: 1,
          descriptionPoints: 1,
          price: {
            amount: "$price",
            discountPrice: "$discountedPrice",
            currency: "INR",
            discountPercentage: { $round: ["$discountPercentage", 2] },
          },
          isPurchased: 1,
          indicators: 1,
          testSeriesType: 1,
        },
      },
    ]);

    if (recommendedTestSeries.length <= 0) {
      return res.status(404).json({
        status: "error",
        message: "No recommended test series found.",
        error: {
          code: "NO_TEST_SERIES",
          details: "No recommended test series available for the user.",
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Recommended Test Series fetched successfully",
      data: { recommendedTestSeries },
    });
  } catch (error) {
    console.error("Error fetching test series:", error);
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

exports.getAITSTestPapers = async (req, res) => {
  try {
    const { _id } = req.user;
    const { testSeriesId, testSeriesType } = req.body;

   if (!testSeriesId || !testSeriesType) {
     return res.status(400).json({
       success: false,
       message: "All fields are necessary.",
     });
   }

   if (testSeriesType !== "All-India") {
     return res.status(400).json({
       success: false,
       message: "Accessing Wrong Test Series",
     });
   }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const purchasedSeries = user.purchasedTestSeries.find(
      (series) => series.testSeriesId.toString() === testSeriesId.toString()
    );

    if (!purchasedSeries) {
      return res.status(404).json({
        success: false,
        message: "Test series not purchased.",
      });
    }

    const attemptedTestIds = purchasedSeries.attemptedTestPapers.map(
      (attempt) => attempt.toString()
    );

    const currentDateTime = new Date();

    const testPapers = await TestPaper.aggregate([
      {
        $match: { testSeriesId: new mongoose.Types.ObjectId(testSeriesId) },
      },
      {
        $lookup: {
          from: "attemptedtests",
          localField: "testPaperId",
          foreignField: "attemptedTestPaperId",
          as: "attemptedTests",
        },
      },
      {
        $addFields: {
          attemptedTestCount: {
            $ifNull: [{ $sum: "$attemptedTests.attemptedTestCount" }, 0],
          },
          attemptsRemaining: {
            $subtract: [
              "$totalAttempts",
              { $ifNull: [{ $sum: "$attemptedTests.attemptedTestCount" }, 0] },
            ],
          },
          isMissedOrAttempted: {
            $in: ["$testPaperId", attemptedTestIds],
          },
          indicators: [
            { key: "marks", value: { $toString: "$totalMarks" } },
            {
              key: "hours",
              value: { $toString: { $divide: ["$testDuration", 60] } },
            },
            { key: "Questions", value: { $toString: "$totalQuestions" } },
          ],
        },
      },
      {
        $project: {
          testPaperId: 1,
          testName: 1,
          testStartTime: 1,
          testEndTime: 1,
          subjectsCovered: 1,
          attemptsRemaining: 1,
          indicators: 1,
          isMissedOrAttempted: 1,
          testDuration: 1,
        },
      },
    ]);

    if (testPapers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No test papers found.",
      });
    }

    const taggedTestPapers = testPapers.map((testPaper) => {
      let statusTag;

      if (currentDateTime < testPaper.testStartTime) {
        statusTag = ["all", "not-attempted", "upcoming"];
      } else if (currentDateTime > testPaper.testEndTime) {
        statusTag = testPaper.isMissedOrAttempted
          ? ["attempted", "all"]
          : ["missed", "not-attempted", "all"];
      } else if (
        currentDateTime >= testPaper.testStartTime &&
        currentDateTime <= testPaper.testEndTime
      ) {
        statusTag = ["live", "all"];
      }

      return {
        ...testPaper,
        statusTag,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        filterationTags: [
          "All",
          "Attempted",
          "Not-Attempted",
          "Upcoming",
          "Missed",
          "Live",
        ],
        testPapers: taggedTestPapers,
      },
    });
  } catch (error) {
    console.error("Error fetching test series:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.getMockTestPapers = async (req, res) => {
  try {
    const { _id } = req.user;
    const { testSeriesId, testSeriesType } = req.body;

    if (!testSeriesId || !testSeriesType) {
      return res.status(400).json({
        success: false,
        message: "All fields are necessary.",
      });
    }

    if (testSeriesType !== "Mock-Test-Series") {
      return res.status(400).json({
        success: false,
        message: "Accessing Wrong Test Series",
      });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const purchasedSeries = user.purchasedTestSeries.find(
      (series) => series.testSeriesId.toString() === testSeriesId.toString()
    );

    if (!purchasedSeries) {
      return res.status(404).json({
        success: false,
        message: "Test series not purchased.",
      });
    }

    const attemptedTestIds = purchasedSeries.attemptedTestPapers.map(
      (attempt) => attempt.toString()
    );

    const testPapers = await TestPaper.aggregate([
      {
        $match: { testSeriesId: new mongoose.Types.ObjectId(testSeriesId) },
      },
      {
        $lookup: {
          from: "attemptedtests",
          localField: "testPaperId",
          foreignField: "attemptedTestPaperId",
          as: "attemptedTests",
        },
      },
      {
        $addFields: {
          attemptedTestCount: {
            $ifNull: [{ $sum: "$attemptedTests.attemptedTestCount" }, 0],
          },
          attemptsRemaining: {
            $subtract: [
              "$totalAttempts",
              { $ifNull: [{ $sum: "$attemptedTests.attemptedTestCount" }, 0] },
            ],
          },
          indicators: [
            { key: "marks", value: { $toString: "$totalMarks" } },
            {
              key: "hours",
              value: { $toString: { $divide: ["$testDuration", 60] } },
            },
            { key: "Questions", value: { $toString: "$totalQuestions" } },
          ],
        },
      },
      {
        $project: {
          testPaperId: 1,
          testName: 1,
          testStartTime: 1,
          testEndTime: 1,
          subjectsCovered: 1,
          attemptsRemaining: 1,
          indicators: 1,
          testDuration: 1,
        },
      },
    ]);
    if (testPapers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No test papers found.",
      });
    }

    console.log(testPapers)

    const taggedTestPapers = testPapers.map((testPaper) => {
      let statusTag;

      statusTag = attemptedTestIds.includes(testPaper.testPaperId.toString())
        ? ["attempted", "all"]
        : ["not-attempted", "all"];
      return {
        ...testPaper,
        statusTag,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        filterationTags: ["All", "Attempted", "Not-Attempted"],
        testPapers: taggedTestPapers,
      },
    });
  } catch (error) {
    console.error("Error fetching test series:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { testPaperId, testSeriesId } = req.body;
    const { _id: userId } = req.user;

    if (!testPaperId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid test paper ID, test series ID, and start time.",
      });
    }

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found.",
      });
    }

    const questionsBySubject = await Question.aggregate([
      {
        $match: { testPaperId: testPaperId },
      },
      {
        $group: {
          _id: "$subject",
          questions: {
            $push: {
              questionId: "$questionId",
              questionType: "$questionType",
              questionFormat: "$questionFormat",
              question: "$question",
              options: "$options",
              marks: "$marks",
              negativeMarking: "$negativeMarking",
              markedForReview: false,
              selectedAnswer: [],
              isSaved: false,
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

    if (questionsBySubject.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found.",
      });
    }

    return res.status(200).json({
      success: true,
      questions: questionsBySubject,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.getAITSQuestions = async (req, res) => {
  try {
    const { testPaperId, testSeriesId } = req.body;
    const { _id: userId } = req.user;

    if (!testPaperId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid test paper ID and test series ID.",
      });
    }

    const attemptedTest = await AttemptedTest.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          testSeriesId: new mongoose.Types.ObjectId(testSeriesId),
          attemptedTestId: new mongoose.Types.ObjectId(testPaperId),
          testSubmitted: false,
        },
      },
      {
        $unwind: "$questionArr",
      },
      {
        $lookup: {
          from: "Question",
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

    if (attemptedTest.length > 0) {
      return res.status(200).json({
        success: true,
        questions: attemptedTest,
      });
    }

    const questionsBySubject = await Question.aggregate([
      {
        $match: { testPaperId: new mongoose.Types.ObjectId(testPaperId) },
      },
      {
        $group: {
          _id: "$subject",
          questions: {
            $push: {
              questionId: "$_id",
              questionType: "$questionType",
              questionFormat: "$questionFormat",
              question: "$question",
              options: "$options",
              marks: "$marks",
              negativeMarking: "$negativeMarking",
              markedForReview: false,
              selectedAnswer: [],
              isSaved: false,
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

    if (questionsBySubject.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for the provided test paper ID.",
      });
    }

    return res.status(200).json({
      success: true,
      questions: questionsBySubject,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.startTest = async (req, res) => {
  try {
    const {
      testPaperId,
      testSeriesId,
      testStartedAt,
      testStartTime,
      testEndTime,
    } = req.body;
    const { _id: userId } = req.user;

    if (
      !testPaperId ||
      !testSeriesId ||
      !testStartedAt ||
      !testEndTime ||
      !testStartTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid test paper ID, test series ID, and start time.",
      });
    }

    const allowedStartTime = new Date(testStartTime);
    allowedStartTime.setMinutes(allowedStartTime.getMinutes() + 15);

    if (new Date(testStartedAt) > allowedStartTime) {
      return res.status(403).json({
        success: false,
        message:
          "The test window has been closed. You cannot start the test now.",
      });
    }

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found.",
      });
    }

    const questions = await Question.find({ testPaperId }).select("questionId");

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for this test paper.",
      });
    }

    const questionArr = questions.map((question) => ({
      questionId: question.questionId,
      selectedAnswer: [],
      markedForReview: false,
      isSaved: false,
    }));

    const attemptedTest = new AttemptedTest({
      attemptedTestId: testPaperId,
      testSeriesId,
      userId,
      questionArr,
      testStartedAt,
    });

    await attemptedTest.save();

    const autoSubmitTime = new Date(testEndTime);
    autoSubmitTime.setMinutes(autoSubmitTime.getMinutes() + 15);

    cron.schedule(autoSubmitTime, async () => {
      const testToAutoSubmit = await AttemptedTest.findOne({
        attemptedTestId: attemptedTest.attemptedTestId,
        testSeriesId: attemptedTest.testSeriesId,
        userId: attemptedTest.userId,
        testSubmitted: false,
      });

      if (testToAutoSubmit) {
        testToAutoSubmit.testSubmittedAt = new Date();
        await testToAutoSubmit.save();
        console.log(`Auto-submitted test for user ${userId}`);
      }
    });

    return res.status(201).json({
      success: true,
      message: "Test started successfully.",
    });
  } catch (error) {
    console.error("Error starting test:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.saveAndNext = async (req, res) => {
  try {
    const { testPaperId, testSeriesId, selectedAnswer, questionId } = req.body;
    const { _id: userId } = req.user;

    if (!testPaperId || !testSeriesId || !selectedAnswer || !questionId) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid test paper ID, test series ID, question ID, and selected answer.",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found.",
      });
    }

    const updateResult = await AttemptedTest.updateOne(
      {
        userId,
        testSeriesId,
        attemptedTestId: testPaperId,
        "questionArr.questionId": questionId,
      },
      {
        $set: {
          "questionArr.$.selectedAnswer": selectedAnswer,
          "questionArr.$.isSaved": true,
        },
      }
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: "Question or test not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Answer saved successfully.",
    });
  } catch (error) {
    console.error("Error saving answer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.clearAnswer = async (req, res) => {
  try {
    const { testPaperId, testSeriesId, questionId } = req.body;
    const { _id: userId } = req.user;

    if (!testPaperId || !testSeriesId || !questionId) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid test paper ID, test series ID, question ID.",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found.",
      });
    }

    const updateResult = await AttemptedTest.updateOne(
      {
        userId,
        testSeriesId,
        attemptedTestId: testPaperId,
        "questionArr.questionId": questionId,
      },
      {
        $set: {
          "questionArr.$.selectedAnswer": [],
          "questionArr.$.isSaved": false,
        },
      }
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: "Question or test not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Answer Cleared successfully.",
    });
  } catch (error) {
    console.error("Error saving answer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.saveAndMarkForReview = async (req, res) => {
  try {
    const {
      testPaperId,
      testSeriesId,
      selectedAnswer,
      questionId,
      markedForReview,
    } = req.body;
    const { _id: userId } = req.user;

    if (
      !testPaperId ||
      !testSeriesId ||
      !selectedAnswer ||
      !questionId ||
      typeof markedForReview !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid test paper ID, test series ID, question ID, selected answer, and markedForReview status.",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found.",
      });
    }

    const updateResult = await AttemptedTest.updateOne(
      {
        userId,
        testSeriesId,
        attemptedTestId: testPaperId,
        "questionArr.questionId": questionId,
      },
      {
        $set: {
          "questionArr.$.selectedAnswer": selectedAnswer,
          "questionArr.$.markedForReview": markedForReview,
          "questionArr.$.isSaved": true,
        },
      }
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: "Question or test not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Answer and review status saved successfully.",
    });
  } catch (error) {
    console.error("Error saving answer and review status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.markForReview = async (req, res) => {
  try {
    const { testPaperId, testSeriesId, questionId, markedForReview } = req.body;
    const { _id: userId } = req.user;

    if (
      !testPaperId ||
      !testSeriesId ||
      !questionId ||
      typeof markedForReview !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid test paper ID, test series ID, question ID.",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found.",
      });
    }

    const updateResult = await AttemptedTest.updateOne(
      {
        userId,
        testSeriesId,
        attemptedTestId: testPaperId,
        "questionArr.questionId": questionId,
      },
      {
        $set: {
          "questionArr.$.markedForReview": markedForReview,
        },
      }
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: "Question or test not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Marked For Review successfully.",
    });
  } catch (error) {
    console.error("Error saving answer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.purchasedTestSeries = async (req, res) => {
  try {
    const { testSeriesId, userId } = req.body;

    if (!testSeriesId || !userId) {
      return res.status(400).json({
        success: false,
        message: "TestSeriesId and UserId are required.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isAlreadyPurchased = user.purchasedTestSeries.some(
      (series) => series.testSeriesId.toString() === testSeriesId
    );

    if (isAlreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: "Test series is already purchased.",
      });
    }

    user.purchasedTestSeries.push({
      testSeriesId,
      attemptedTestPapers: [],
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Test series added to purchased list successfully.",
    });
  } catch (error) {
    console.error("Error adding test series to purchased list:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
