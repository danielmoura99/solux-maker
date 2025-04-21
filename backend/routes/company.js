// backend/routes/company.js
const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");
const auth = require("../middlewares/auth");

// Rota pública para criar empresa (necessária para registro)
router.post("/", companyController.createCompany);

// Todas as outras rotas requerem autenticação
router.use(auth);

// Rotas protegidas
router.get("/:id", companyController.getCompany);
router.put("/:id", companyController.updateCompany);
router.post("/:id/credits", companyController.addCredits);
router.get("/", companyController.listCompanies);

module.exports = router;
