// backend/routes/auth.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middlewares/auth");

// Rotas públicas
router.post("/register", userController.register);
router.post("/login", userController.login);

// Rotas protegidas
router.get("/profile", auth, userController.getProfile);

module.exports = router;
