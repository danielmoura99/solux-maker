// backend/services/embeddingService.js

const axios = require("axios");
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

class EmbeddingService {
  constructor() {
    this.embedDimension = 1536; // Dimensão dos embeddings do modelo text-embedding-ada-002
  }

  // Gerar embedding para um texto
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/embeddings",
        {
          model: "text-embedding-ada-002",
          input: text,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      return {
        embedding: response.data.data[0].embedding,
        tokenUsage: response.data.usage.total_tokens,
      };
    } catch (error) {
      console.error(
        "Erro ao gerar embedding:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Calcular similaridade entre dois vetores (produto escalar normalizado)
  calculateSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error("Os vetores devem ter o mesmo tamanho");
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;

    return dotProduct / (mag1 * mag2);
  }

  // Retorna um vetor de zeros do tamanho correto (para simulação)
  getEmptyEmbedding() {
    return Array(this.embedDimension).fill(0);
  }
}

module.exports = EmbeddingService;
