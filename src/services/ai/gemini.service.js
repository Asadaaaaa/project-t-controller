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

  /**
   * Menganalisis gambar bukti reimbursement dan gambar struk/nota yang di-reply menggunakan Gemini Multimodal
   * @param {string} reimburseImageBase64 - Base64 gambar bukti pembayaran/transfer
   * @param {string} receiptImageBase64 - Base64 gambar nota/struk toko asli
   * @param {string} mime1 - Mime type gambar 1 (misal 'image/jpeg')
   * @param {string} mime2 - Mime type gambar 2 (misal 'image/jpeg')
   * @param {object} metadata - Informasi konteks tambahan (timestamp, sender, dsb)
   * @returns {Promise<object>} Objek JSON hasil analisis reimbursement
   */
  async analyzeReimbursementMultimodal(reimburseImageBase64, receiptImageBase64, mime1 = 'image/jpeg', mime2 = 'image/jpeg', metadata = {}) {
    this.reloadConfig();

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    const fallbackReimburseDate = metadata.reimburseDate || new Date().toISOString().split('T')[0];
    const fallbackReceiptDate = metadata.receiptDate || fallbackReimburseDate;

    const promptText = `
Anda adalah Auditor Keuangan dan Kasir AI yang sangat teliti. Anda menerima dua gambar:
- GAMBAR 1: Bukti pembayaran / transfer / pengajuan reimbursement (pesan dengan tag #reimburse).
- GAMBAR 2: Bukti nota / struk / invoice asli dari toko / merchant (pesan yang di-reply).

Tugas Anda adalah mengekstrak seluruh data keuangan dan rincian transaksi secara akurat ke dalam format JSON berikut:
{
  "reimburse_amount": 0, // Total uang yang di-reimburse / ditransfer pada GAMBAR 1 (angka murni tanpa Rp/titik koma)
  "reimburse_date": "YYYY-MM-DD", // Tanggal transfer pada GAMBAR 1 (jika tidak tertera gunakan "${fallbackReimburseDate}")
  "merchant_name": "Nama Toko / Tempat Usaha", // Nama toko/merchant pada GAMBAR 2 (misal "Indomaret", "SPBU Pertamina", "Apotek Sehat")
  "receipt_date": "YYYY-MM-DD", // Tanggal transaksi pada GAMBAR 2 (jika tidak terbaca gunakan "${fallbackReceiptDate}")
  "receipt_amount": 0, // Total akhir belanja / grand total pada nota GAMBAR 2 (angka murni)
  "items_breakdown": [
    {
      "name": "Nama barang/jasa",
      "qty": 1,
      "price": 0,
      "total": 0
    }
  ],
  "difference_amount": 0, // Selisih = reimburse_amount - receipt_amount (positif jika reimburse lebih besar, negatif jika kurang)
  "difference_status": "MATCH", // "MATCH" (jika selisih 0 atau selisih <= 1000), "OVERPAID" (jika lebih banyak), "UNDERPAID" (jika kurang)
  "anomalies": [
    // Array string daftar kejanggalan/kecurigaan jika ada, contoh:
    // "Nominal transfer (Rp 50.000) lebih besar dari total struk (Rp 45.000), selisih lebih Rp 5.000"
    // "Tanggal struk berbeda jauh dari tanggal transfer"
    // "Nama toko tidak tertera pada nota"
    // Jika tidak ada kejanggalan, isi dengan array kosong []
  ],
  "ai_notes": "Kesimpulan singkat analisis dalam 1-2 kalimat Bahasa Indonesia"
}

Pastikan output HANYA berupa JSON valid sesuai skema di atas tanpa pembungkus markdown apapun.`;

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    let lastError = null;

    const parts = [
      { text: promptText },
      { text: 'Berikut adalah GAMBAR 1 (Bukti Pembayaran / Transfer Reimbursement):' },
      {
        inlineData: {
          mimeType: mime1 || 'image/jpeg',
          data: reimburseImageBase64
        }
      },
      { text: 'Berikut adalah GAMBAR 2 (Nota / Struk / Kwitansi Toko yang di-reply):' },
      {
        inlineData: {
          mimeType: mime2 || 'image/jpeg',
          data: receiptImageBase64
        }
      }
    ];

    for (const modelName of this.modelChain) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[GeminiService] Analyzing Reimbursement Images with Model: "${modelName}" (Attempt: ${attempt})...`);

          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts
              }
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          });

          const rawText = response.text || '';
          if (rawText) {
            console.log(`[GeminiService] ✅ Reimbursement analysis success with model "${modelName}"!`);
            const parsed = JSON.parse(rawText);
            return parsed;
          }
        } catch (error) {
          lastError = error;
          const isHighDemand = error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('UNAVAILABLE');
          console.warn(`[GeminiService] Model "${modelName}" attempt ${attempt} notice:`, error.message);

          if (isHighDemand && attempt === 1) {
            await new Promise((r) => setTimeout(r, 1000));
          } else if (isHighDemand && attempt === 2) {
            console.log(`[GeminiService] Model "${modelName}" high demand. Failing over...`);
            break;
          }
        }
      }
    }

    throw new Error(`Failed to analyze reimbursement with Gemini: ${lastError?.message || 'All models failed'}`);
  }
}

export default GeminiService;

