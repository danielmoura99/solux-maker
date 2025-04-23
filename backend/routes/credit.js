// backend/routes/credit.js

const express = require("express");
const router = express.Router();
const creditController = require("../controllers/creditController");
const auth = require("../middlewares/auth");

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas para créditos
router.get("/history", creditController.getCreditHistory);
router.post("/purchase", creditController.purchaseCredits);
router.get("/plans", creditController.getCreditPlans);

module.exports = router;
