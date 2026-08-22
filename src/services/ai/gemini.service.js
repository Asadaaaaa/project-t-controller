import { GoogleGenAI } from '@google/genai';

class GeminiService {
  constructor(server = null) {
    this.server = server;
    this.reloadConfig();
  }

  reloadConfig() {
    this.apiKey = (process.env.GEMINI_API_KEY || (this.server?.env?.GEMINI_API_KEY) || '').trim();
    this.model = process.env.GEMINI_MODEL || (this.server?.env?.GEMINI_MODEL) || 'gemini-3.7-flash';
  }

  /**
   * Generates Gemini response using the dedicated paid API key and gemini-3.7-flash
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateGeminiResponse(prompt) {
    this.reloadConfig();

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    console.log(`[GeminiService] Calling Gemini API (Model: "${this.model}", Key: ${this.apiKey.slice(0, 12)}...)...`);

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const response = await ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const text = response.text || '';
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }

      console.log(`[GeminiService] ✅ Success! Received response from "${this.model}".`);
      return text;
    } catch (error) {
      console.error(`[GeminiService] ❌ Error calling Gemini API:`, error.message);
      throw error;
    }
  }
}

export default GeminiService;
