// backend/services/llmService.js

const axios = require("axios");
require("dotenv").config();

// Configurações das APIs
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DEFAULT_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || "openai"; // Ou "anthropic"

// Serviço para interagir com diferentes LLMs
class LLMService {
  constructor(provider = DEFAULT_PROVIDER) {
    this.provider = provider;
  }

  // Método para gerar texto com o LLM
  async generateText(prompt, options = {}) {
    try {
      if (this.provider === "openai") {
        return await this._generateWithOpenAI(prompt, options);
      } else if (this.provider === "anthropic") {
        return await this._generateWithAnthropic(prompt, options);
      } else {
        throw new Error(`Provedor LLM não suportado: ${this.provider}`);
      }
    } catch (error) {
      console.error("Erro ao gerar texto com LLM:", error);
      throw error;
    }
  }

  // Implementação para OpenAI (GPT)
  async _generateWithOpenAI(prompt, options) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: options.model || "gpt-4.1-nano",
          messages: [
            {
              role: "system",
              content:
                options.systemPrompt || "Você é um assistente útil e conciso.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 800,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      return {
        text: response.data.choices[0].message.content,
        provider: "openai",
        model: options.model || "gpt-4.1-nano",
        tokenUsage: {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error(
        "Erro ao gerar texto com OpenAI:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Implementação para Anthropic (Claude)
  async _generateWithAnthropic(prompt, options) {
    try {
      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: options.model || "claude-3-haiku-20240307",
          system:
            options.systemPrompt || "Você é um assistente útil e conciso.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: options.maxTokens || 800,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "x-api-key": ANTHROPIC_API_KEY,
          },
        }
      );

      return {
        text: response.data.content[0].text,
        provider: "anthropic",
        model: options.model || "claude-3-haiku-20240307",
        tokenUsage: {
          // Anthropic não fornece contagem de tokens da mesma forma que OpenAI
          // então estimamos baseado no comprimento do texto
          input: Math.ceil(prompt.length / 4),
          output: Math.ceil(response.data.content[0].text.length / 4),
          total: Math.ceil(
            (prompt.length + response.data.content[0].text.length) / 4
          ),
        },
      };
    } catch (error) {
      console.error(
        "Erro ao gerar texto com Anthropic:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = LLMService;
