// backend/lib/prisma.js

const { PrismaClient } = require("@prisma/client");

// Exporta uma instância do PrismaClient
const prisma = new PrismaClient();

module.exports = prisma;
