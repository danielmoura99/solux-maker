// backend/routes/assistant.js

const express = require("express");
const router = express.Router();
const assistantController = require("../controllers/assistantController");
const auth = require("../middlewares/auth");

// Todas as rotas requerem autenticação
router.use(auth);

// Rota para processar uma pergunta com o assistente
router.post("api/query", assistantController.processQuery);
// Rota para testar a conexão com o LLM
router.post("/test", assistantController.testLLM);

module.exports = router;
