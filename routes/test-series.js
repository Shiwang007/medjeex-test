const express = require("express");
const { getPurchasedTestSeries, getTestPapers, getQuestions, getRecommendedTestSeries, getAITSTestPapers, getMockTestPapers, purchasedTestSeries, getAITSQuestions} = require("../controllers/test-series.controller")
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/users-test-series", authenticate, getPurchasedTestSeries);
router.post("/recommended-test-series", authenticate, getRecommendedTestSeries);
router.post("/aits-test-papers", authenticate, getAITSTestPapers);
router.post("/mock-test-papers", authenticate, getMockTestPapers);
router.post("/questions", authenticate, getAITSQuestions);
router.post("/purchase-test-series", authenticate, purchasedTestSeries);

module.exports = router;