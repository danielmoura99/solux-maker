// backend/services/whatsappService.js

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const prisma = require("../lib/prisma");
const EventEmitter = require("events");

/**
 * Serviço para gerenciar a integração com WhatsApp usando whatsapp-web.js
 */
class WhatsAppService {
  constructor() {
    this.sessions = new Map(); // Map to store client sessions by companyId
    this.events = new EventEmitter();
    this.sessionsDir = path.join(__dirname, "../sessions");

    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Inicializa um cliente WhatsApp para uma empresa
   * @param {string} companyId - ID da empresa
   * @returns {Object} - Cliente WhatsApp e eventos
   */
  async initClient(companyId) {
    // Check if we already have a session for this company
    if (this.sessions.has(companyId)) {
      return this.sessions.get(companyId);
    }

    // Create session directory for this company
    const sessionDir = path.join(this.sessionsDir, companyId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Create a new client
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: companyId,
        dataPath: sessionDir,
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    // Set up event handlers
    client.on("qr", (qr) => {
      // Generate QR code as data URL
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          console.error("Error generating QR code:", err);
          this.events.emit(`${companyId}:error`, "Failed to generate QR code");
          return;
        }

        // Emit QR code event for this company
        this.events.emit(`${companyId}:qr`, url);

        // Update company's WhatsApp integration status
        this._updateCompanyWhatsAppStatus(companyId, "WAITING_QR_SCAN");
      });
    });

    client.on("ready", async () => {
      console.log(`WhatsApp client ready for company ${companyId}`);
      this.events.emit(`${companyId}:ready`);

      // Update company's WhatsApp integration status
      await this._updateCompanyWhatsAppStatus(companyId, "CONNECTED");

      // Get client info
      try {
        const info = await client.getWid();
        console.log(`WhatsApp connected with number: ${info}`);

        // Store WhatsApp info in database
        await prisma.company.update({
          where: { id: companyId },
          data: {
            assistantSettings: {
              update: {
                whatsappInfo: {
                  number: info._serialized,
                  connectedAt: new Date().toISOString(),
                },
              },
            },
          },
        });
      } catch (error) {
        console.error("Error getting WhatsApp info:", error);
      }
    });

    client.on("authenticated", () => {
      console.log(`WhatsApp client authenticated for company ${companyId}`);
      this.events.emit(`${companyId}:authenticated`);
    });

    client.on("auth_failure", (error) => {
      console.error(
        `WhatsApp authentication failed for company ${companyId}:`,
        error
      );
      this.events.emit(`${companyId}:auth_failure`, error);
      this._updateCompanyWhatsAppStatus(companyId, "AUTH_FAILED");
    });

    client.on("disconnected", (reason) => {
      console.log(
        `WhatsApp client disconnected for company ${companyId}: ${reason}`
      );
      this.events.emit(`${companyId}:disconnected`, reason);
      this._updateCompanyWhatsAppStatus(companyId, "DISCONNECTED");
    });

    // Set up message handler
    client.on("message", async (message) => {
      try {
        console.log(`Message received for company ${companyId}:`, message.body);
        this.events.emit(`${companyId}:message`, message);

        // Process incoming message
        await this._processIncomingMessage(companyId, message);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    // Initialize the client
    console.log(`Initializing WhatsApp client for company ${companyId}...`);
    this.events.emit(`${companyId}:initializing`);

    client.initialize().catch((error) => {
      console.error(
        `Error initializing WhatsApp client for company ${companyId}:`,
        error
      );
      this.events.emit(`${companyId}:error`, error);
    });

    // Store the session
    const session = { client, events: this.events };
    this.sessions.set(companyId, session);

    return session;
  }

  /**
   * Envia uma mensagem WhatsApp
   * @param {string} companyId - ID da empresa
   * @param {string} to - Número de destino (formato: xxxxxxxxxxxx@c.us)
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMessage(companyId, to, message) {
    const session = this.sessions.get(companyId);

    if (!session) {
      throw new Error(`No WhatsApp session found for company ${companyId}`);
    }

    try {
      // Format number if needed
      if (!to.includes("@c.us")) {
        to = `${to}@c.us`;
      }

      // Send the message
      const result = await session.client.sendMessage(to, message);
      return result;
    } catch (error) {
      console.error(
        `Error sending WhatsApp message for company ${companyId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Processa uma mensagem recebida do WhatsApp
   * @param {string} companyId - ID da empresa
   * @param {Object} message - Mensagem do WhatsApp
   * @private
   */
  async _processIncomingMessage(companyId, message) {
    // Get the phone number without @c.us
    const from = message.from.split("@")[0];

    try {
      // Check if there's an existing conversation for this user
      let conversation = await prisma.conversation.findFirst({
        where: {
          companyId,
          userId: from,
          channel: "WHATSAPP",
          status: "ACTIVE",
        },
      });

      // If no active conversation, create a new one
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            companyId,
            userId: from,
            channel: "WHATSAPP",
            status: "ACTIVE",
          },
        });

        console.log(`Created new conversation: ${conversation.id}`);

        // Get company settings for welcome message
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { assistantSettings: true },
        });

        // Send welcome message if configured
        if (company?.assistantSettings?.welcomeMessage) {
          const welcomeMessage = company.assistantSettings.welcomeMessage;

          // Save welcome message to conversation
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              content: welcomeMessage,
              type: "TEXT",
              sender: "ASSISTANT",
            },
          });

          // Send welcome message via WhatsApp
          await this.sendMessage(companyId, from, welcomeMessage);
        }
      }

      // Save user message to conversation
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: message.body,
          type: "TEXT",
          sender: "USER",
        },
      });

      // Here we would process the message with the AI assistant
      // This would typically involve calling the RAG service
      // and then sending back the response
      // For now, we'll just mark this as a TODO

      // TODO: Process message with RAG service and send response
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
    }
  }

  /**
   * Atualiza o status da integração WhatsApp de uma empresa
   * @param {string} companyId - ID da empresa
   * @param {string} status - Status da integração
   * @private
   */
  async _updateCompanyWhatsAppStatus(companyId, status) {
    try {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          assistantSettings: {
            update: {
              whatsappStatus: status,
              whatsappStatusUpdatedAt: new Date().toISOString(),
            },
          },
        },
      });
    } catch (error) {
      console.error(
        `Error updating WhatsApp status for company ${companyId}:`,
        error
      );
    }
  }

  /**
   * Desconecta um cliente WhatsApp
   * @param {string} companyId - ID da empresa
   */
  async disconnect(companyId) {
    const session = this.sessions.get(companyId);

    if (!session) {
      return;
    }

    try {
      // Log out from WhatsApp
      await session.client.logout();
      console.log(`Logged out WhatsApp client for company ${companyId}`);
    } catch (error) {
      console.error(
        `Error logging out WhatsApp client for company ${companyId}:`,
        error
      );
    }

    try {
      // Destroy the client
      await session.client.destroy();
      console.log(`Destroyed WhatsApp client for company ${companyId}`);
    } catch (error) {
      console.error(
        `Error destroying WhatsApp client for company ${companyId}:`,
        error
      );
    }

    // Remove the session
    this.sessions.delete(companyId);

    // Update company status
    await this._updateCompanyWhatsAppStatus(companyId, "DISCONNECTED");
  }
}

// Export singleton instance
module.exports = new WhatsAppService();
