const express = require("express");
const { getPurchasedTestSeries, getQuestions, getRecommendedTestSeries, getAITSTestPapers, getMockTestPapers, purchasedTestSeries, getAITSQuestions, startTest, saveAndNext, clearAnswer, saveAndMarkForReview, markForReview} = require("../controllers/test-series.controller")
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/users-test-series", authenticate, getPurchasedTestSeries);
router.post("/recommended-test-series", authenticate, getRecommendedTestSeries);
router.post("/aits-test-papers", authenticate, getAITSTestPapers);
router.post("/mock-test-papers", authenticate, getMockTestPapers);
router.post("/questions", authenticate, getAITSQuestions);
router.post("/mock-questions", authenticate, getQuestions);

//test conduction endpoints
router.post("/start-test", authenticate, startTest);
router.post("/save", authenticate, saveAndNext);
router.post("/clear-answer", authenticate, clearAnswer);
router.post("/save-mark-for-review", authenticate, saveAndMarkForReview);
router.post("/mark-for-review", authenticate, markForReview);


router.post("/purchase-test-series", authenticate, purchasedTestSeries);

module.exports = router;