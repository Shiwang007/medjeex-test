const TestSeries = require("../models/test-series");
const TestPaper = require("../models/test-paper");
const Question = require("../models/question");
const User = require("../models/user");

exports.getPurchasedTestSeries = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId).populate({
      path: "purchasedTestSeries.testSeriesId",
      model: "TestSeries",
      match: { testSeriesId: { $exists: true } },
      select:
        "testSeriesId title features tags imageUrls totalTest description testSeriesType",
    });

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

    const testSeriesIds = user.purchasedTestSeries.map(
      (series) => series.testSeriesId.testSeriesId
    );

    const testPaperData = await TestPaper.aggregate([
      {
        $match: {
          testSeriesId: { $in: testSeriesIds },
        },
      },
      {
        $group: {
          _id: "$testSeriesId",
          totalQuestionsSum: { $sum: "$totalQuestions" },
        },
      },
    ]);

    const totalQuestionsMap = testPaperData.reduce((acc, item) => {
      acc[item._id.toString()] = item.totalQuestionsSum;
      return acc;
    }, {});

    const purchasedTestSeries = user.purchasedTestSeries.map((series) => {
      const { testSeriesId, attemptedTestPapers } = series;
      const totalQuestions =
        totalQuestionsMap[testSeriesId.testSeriesId.toString()] || 0;

      return {
        testSeriesId: testSeriesId.testSeriesId,
        title: testSeriesId.title,
        features: testSeriesId.features,
        description: testSeriesId.description,
        testSeriesType: testSeriesId.testSeriesType,
        tags: testSeriesId.tags,
        imageUrls: testSeriesId.imageUrls,
        attemptedTestCount: attemptedTestPapers.length,
        indicators: [{"Subject Included" : testSeriesId.tags.length}, {"Total Test": testSeriesId.totalTest}, {"Total Questions": totalQuestions}],
      };
    });

    return res.status(200).json({
      status: "success",
      message: "Purchased Test Series fetched successfully",
      data: { purchasedTestSeries },
    });
  } catch (error) {
    console.error("Error fetching test series:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.getRecommendedTestSeries = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId);

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
          totalQuestions: {
            $sum: "$testPapers.totalQuestions",
          },
        },
      },
      {
        $project: {
          testSeriesId: 1,
          title: 1,
          features: 1,
          tags: 1,
          imageUrls: 1,
          totalTest: 1,
          description: 1,
          testSeriesType: 1,
          price: 1,
          discountedPrice: 1,
          totalQuestions: 1,
        },
      },
    ]);


    return res.status(200).json({
      status: "success",
      message: "Recommended Test Series fetched successfully",
      data: { recommendedTestSeries },
    });
  } catch (error) {
    console.error("Error fetching test series:", error);
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

exports.getAITSTestPapers = async (req, res) => {
  try {
    const { userId } = req.user;
    const { testSeriesId } = req.body;

    if (!testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "All fields are necessary.",
      });
    }

    const user = await User.findById(userId);
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

    const testPapers = await TestPaper.find({ testSeriesId }).select(
      "testPaperId totalMarks testName testDuration testStartTime testEndTime totalQuestions totalAttempts subjectsCovered negativeMarking"
    );

    if (testPapers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No test papers found.",
      });
    }

    const currentDateTime = new Date();

    const taggedTestPapers = testPapers.map((testPaper) => {
      let statusTag;

      if (currentDateTime < testPaper.testStartTime) {
        statusTag = ["all", "not-attempted", "upcoming"];
      } else if (currentDateTime > testPaper.testEndTime) {
        statusTag = attemptedTestIds.includes(testPaper._id.toString())
          ? ["attempted", "all"]
          : ["missed", "not-attempted", "all"];
      } else if (
        currentDateTime >= testPaper.testStartTime &&
        currentDateTime <= testPaper.testEndTime
      ) {
        statusTag = ["live", "all"];
      }

      return {
        ...testPaper.toObject(),
        statusTag,
      };
    });

    return res.status(200).json({
      success: true,
      testPapers: taggedTestPapers,
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
    const { userId } = req.user;
    const { testSeriesId } = req.body;

    if (!testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "All fields are necessary.",
      });
    }

    const user = await User.findById(userId);
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

    const testPapers = await TestPaper.find({ testSeriesId }).select(
      "testPaperId totalMarks testName testDuration totalQuestions totalAttempts subjectsCovered negativeMarking"
    );

    if (testPapers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No test papers found.",
      });
    }

    const taggedTestPapers = testPapers.map((testPaper) => {
      let statusTag;

      statusTag = attemptedTestIds.includes(testPaper._id.toString())
        ? ["attempted", "all"]
        : ["not-attempted", "all"];
      return {
        ...testPaper.toObject(),
        statusTag,
      };
    });

    return res.status(200).json({
      success: true,
      testPapers: taggedTestPapers,
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
    const { testPaperId } = req.body;

    if (!testPaperId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid test paper ID.",
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
              correctAnswer: "$correctAnswer",
              negativeMarking: "$negativeMarking",
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

