import { GoogleGenAI } from '@google/genai';

class GeminiService {
  constructor(server = null) {
    this.server = server;
    this.currentKeyIndex = 0;
    this.reloadConfig();
  }

  reloadConfig() {
    const rawKeys = process.env.GEMINI_API_KEY || (this.server?.env?.GEMINI_API_KEY) || '';
    this.apiKeys = rawKeys
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    
    const primaryModel = process.env.GEMINI_MODEL || (this.server?.env?.GEMINI_MODEL) || 'gemini-3.7-flash';
    
    // Model fallback chain prioritizing the user's primary model
    const defaultChain = [
      primaryModel,
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash'
    ];
    
    // Deduplicate while preserving order
    this.modelChain = [...new Set(defaultChain)];
  }

  getActiveKey() {
    if (this.apiKeys.length === 0) {
      return (process.env.GEMINI_API_KEY || '').trim();
    }
    return this.apiKeys[this.currentKeyIndex % this.apiKeys.length];
  }

  rotateKey() {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      console.log(`[GeminiService] Rotated to API key index ${this.currentKeyIndex} (${this.getActiveKey().slice(0, 10)}...)`);
    }
  }

  /**
   * Generates Gemini response with structured JSON and auto-fallback model chain + key rotation
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateGeminiResponse(prompt) {
    this.reloadConfig();
    const apiKey = this.getActiveKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    let lastError = null;
    const totalAttemptsPerModel = this.apiKeys.length > 0 ? this.apiKeys.length : 1;

    // Iterate through fallback models
    for (const modelName of this.modelChain) {
      // Try across available rotated API keys for each model
      for (let keyAttempt = 0; keyAttempt < totalAttemptsPerModel; keyAttempt++) {
        const currentKey = this.getActiveKey();
        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          console.log(`[GeminiService] Trying model "${modelName}" with key ${currentKey.slice(0, 12)}...`);

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
            console.log(`[GeminiService] Success with model "${modelName}" using key ${currentKey.slice(0, 12)}...!`);
            return text;
          }
        } catch (error) {
          lastError = error;
          console.warn(`[GeminiService] Model "${modelName}" notice:`, error.message);

          // Rotate to next key if available
          this.rotateKey();
        }
      }
    }

    throw new Error(`All Gemini models and API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }
}

export default GeminiService;
