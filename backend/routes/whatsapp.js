// backend/routes/whatsapp.js

const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");
const auth = require("../middlewares/auth");

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas para integração com WhatsApp
router.post("/initialize", whatsappController.initializeWhatsApp);
router.get("/status", whatsappController.getWhatsAppStatus);
router.get("/events", whatsappController.whatsappEvents);
router.post("/send", whatsappController.sendWhatsAppMessage);
router.post("/disconnect", whatsappController.disconnectWhatsApp);

module.exports = router;
