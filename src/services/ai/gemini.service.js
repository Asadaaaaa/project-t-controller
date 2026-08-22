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

    this.paidBackupKey = (process.env.GEMINI_PAID_BACKUP_KEY || (this.server?.env?.GEMINI_PAID_BACKUP_KEY) || '').trim();
    
    const primaryModel = process.env.GEMINI_MODEL || (this.server?.env?.GEMINI_MODEL) || 'gemini-3.7-flash';
    
    // Model fallback chain for primary free keys
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
      console.log(`[GeminiService] Rotated to free API key index ${this.currentKeyIndex} (${this.getActiveKey().slice(0, 10)}...)`);
    }
  }

  /**
   * Generates Gemini response with structured JSON.
   * Priority:
   * 1. Free Primary Keys across Multi-Model Fallback Chain.
   * 2. If all free options fail, activate Paid Backup Key specifically with gemini-3.7-flash.
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async generateGeminiResponse(prompt) {
    this.reloadConfig();
    let lastError = null;

    // --- TIER 1: Free Primary Keys & Model Fallback Chain ---
    if (this.apiKeys.length > 0) {
      const totalAttemptsPerModel = this.apiKeys.length;

      for (const modelName of this.modelChain) {
        for (let keyAttempt = 0; keyAttempt < totalAttemptsPerModel; keyAttempt++) {
          const currentKey = this.getActiveKey();
          try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            console.log(`[GeminiService:Tier1] Trying model "${modelName}" with free key ${currentKey.slice(0, 12)}...`);

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
              console.log(`[GeminiService:Tier1] Success with model "${modelName}" using free key ${currentKey.slice(0, 12)}...!`);
              return text;
            }
          } catch (error) {
            lastError = error;
            console.warn(`[GeminiService:Tier1] Model "${modelName}" notice:`, error.message);
            this.rotateKey();
          }
        }
      }
    }

    // --- TIER 2: Ultimate Paid Backup Key (Specifically gemini-3.7-flash) ---
    if (this.paidBackupKey) {
      console.log(`[GeminiService:Tier2] ⚡ Free keys/models exhausted. Activating PAID BACKUP KEY strictly with "gemini-3.7-flash"...`);
      try {
        const ai = new GoogleGenAI({ apiKey: this.paidBackupKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const text = response.text || '';
        if (text) {
          console.log(`[GeminiService:Tier2] ✅ Success with PAID BACKUP KEY using model "gemini-3.7-flash"!`);
          return text;
        }
      } catch (paidError) {
        console.error(`[GeminiService:Tier2] Paid backup key failed:`, paidError.message);
        lastError = paidError;
      }
    }

    throw new Error(`All Gemini models, free keys, and paid backup failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }
}

export default GeminiService;
