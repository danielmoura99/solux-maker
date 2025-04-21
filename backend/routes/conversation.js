// backend/routes/conversation.js

const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversationController");
const auth = require("../middlewares/auth");

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas para conversas
router.post("/", conversationController.startConversation);
router.get("/", conversationController.listConversations);
router.get("/:conversationId", conversationController.getConversationHistory);
router.post("/:conversationId/messages", conversationController.addMessage);
router.put("/:conversationId/close", conversationController.closeConversation);

module.exports = router;
