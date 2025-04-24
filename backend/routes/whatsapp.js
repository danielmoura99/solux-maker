// backend/routes/whatsapp.js

const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");
const auth = require("../middlewares/auth");

// Rota pública para webhook do WhatsApp (necessária para verificação)
router.get("/webhook", whatsappController.verifyWebhook);
router.post("/webhook", whatsappController.receiveMessage);

// Rotas protegidas para configuração do WhatsApp (requerem autenticação)
router.use("/config", auth);
router.get("/config", whatsappController.getConfig);
router.post("/config", whatsappController.saveConfig);
router.put("/config/activate", whatsappController.activateConfig);
router.put("/config/deactivate", whatsappController.deactivateConfig);

module.exports = router;
