const express = require("express");
const { getPurchasedTestSeries, getTestPapers, getQuestions, getRecommendedTestSeries, getAITSTestPapers, getMockTestPapers, purchasedTestSeries} = require("../controllers/test-series.controller")
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/users-test-series", authenticate, getPurchasedTestSeries);
router.post("/recommended-test-series", authenticate, getRecommendedTestSeries);
router.post("/aits-test-papers", getAITSTestPapers);
router.post("/mock-test-papers", getMockTestPapers);
router.post("/questions", getQuestions);
router.post("/purchase-test-series", purchasedTestSeries);

module.exports = router;