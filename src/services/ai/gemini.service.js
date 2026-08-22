import { GoogleGenAI } from '@google/genai';

class GeminiService {
  constructor(server = null) {
    this.server = server;
    this.reloadConfig();
  }

  reloadConfig() {
    this.apiKey = (process.env.GEMINI_API_KEY || (this.server?.env?.GEMINI_API_KEY) || '').trim();
    this.primaryModel = process.env.GEMINI_MODEL || (this.server?.env?.GEMINI_MODEL) || 'gemini-3.7-flash';

    // Model fallback chain: Primary 3.7 Flash, seamlessly failover if Google Cloud returns 503 high demand
    const defaultChain = [
      this.primaryModel,
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite'
    ];

    this.modelChain = [...new Set(defaultChain)];
  }

  /**
   * Generates Gemini response using the paid API key with automatic failover if Google experiences high demand
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateGeminiResponse(prompt) {
    this.reloadConfig();

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    let lastError = null;

    for (const modelName of this.modelChain) {
      // Up to 2 attempts per model for transient glitches
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[GeminiService] Calling Gemini API (Model: "${modelName}", Attempt: ${attempt})...`);

          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });

          const text = response.text || '';
          if (text) {
            console.log(`[GeminiService] ✅ Success with model "${modelName}"!`);
            return text;
          }
        } catch (error) {
          lastError = error;
          const isHighDemand = error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('UNAVAILABLE');
          console.warn(`[GeminiService] Model "${modelName}" attempt ${attempt} notice:`, error.message);

          if (isHighDemand && attempt === 1) {
            // Quick backoff before retry or fallback
            await new Promise((r) => setTimeout(r, 1000));
          } else if (isHighDemand && attempt === 2) {
            // Move immediately to next model in the fallback chain
            console.log(`[GeminiService] Model "${modelName}" is at high demand on Google servers. Failing over to next model in chain...`);
            break;
          }
        }
      }
    }

    throw new Error(`Failed to generate summary: ${lastError?.message || 'All Gemini models failed'}`);
  }
}

export default GeminiService;
