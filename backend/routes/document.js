// backend/routes/document.js

const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const auth = require("../middlewares/auth");

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas para documentos
router.post("/", documentController.addDocument);
router.get("/", documentController.listDocuments);
router.get("/:id", documentController.getDocument);
router.put("/:id/status", documentController.updateDocumentStatus);
router.delete("/:id", documentController.deleteDocument);

module.exports = router;
