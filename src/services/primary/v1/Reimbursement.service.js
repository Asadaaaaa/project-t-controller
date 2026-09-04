import fs from 'fs';
import path from 'path';
import { ReimbursementRepository } from '#repositoriesPrimaryV1';
import GeminiService from '../../ai/gemini.service.js';

class ReimbursementService {
  constructor(server) {
    this.server = server;
    this.repository = new ReimbursementRepository(this.server);
    this.geminiService = new GeminiService(this.server);
    this.uploadDir = path.resolve(process.cwd(), 'storage', 'app', 'reimbursement');

    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (e) {
      this.server.sendLogs(`[ReimbursementService] Error creating uploadDir: ${e.message}`);
    }
  }

  getExt(mime) {
    if (!mime) return '.jpg';
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    return '.jpg';
  }

  async processIncomingReimbursement(payload) {
    const {
      whatsapp_message_id,
      quoted_message_id,
      chat_id,
      chat_name,
      sender_phone,
      sender_name,
      reimburse_image_base64,
      reimburse_mime = 'image/jpeg',
      receipt_image_base64,
      receipt_mime = 'image/jpeg',
      timestamp
    } = payload;

    this.server.sendLogs(`[ReimbursementService] Processing reimbursement msg: ${whatsapp_message_id}`);

    // Format penamaan file sesuai instruksi:
    // reimburse: reimburse-{idpesan}
    // requesan: req-{idpesan}
    const cleanMsgId = String(whatsapp_message_id || Date.now())
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .trim();

    const reimburseExt = this.getExt(reimburse_mime);
    const receiptExt = this.getExt(receipt_mime);

    const reimburseFileName = `reimburse-${cleanMsgId}${reimburseExt}`;
    const receiptFileName = `req-${cleanMsgId}${receiptExt}`;

    const reimburseFilePath = path.join(this.uploadDir, reimburseFileName);
    const receiptFilePath = path.join(this.uploadDir, receiptFileName);

    // Save images to controller storage (/storage/app/reimbursement)
    if (reimburse_image_base64) {
      fs.writeFileSync(reimburseFilePath, Buffer.from(reimburse_image_base64, 'base64'));
    }
    if (receipt_image_base64) {
      fs.writeFileSync(receiptFilePath, Buffer.from(receipt_image_base64, 'base64'));
    }

    // Determine default dates
    const msgDateStr = timestamp ? new Date(Number(timestamp)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Run Gemini Multimodal AI Analysis
    let aiResult = {};
    try {
      if (reimburse_image_base64 && receipt_image_base64) {
        aiResult = await this.geminiService.analyzeReimbursementMultimodal(
          reimburse_image_base64,
          receipt_image_base64,
          reimburse_mime,
          receipt_mime,
          {
            reimburseDate: msgDateStr,
            receiptDate: msgDateStr
          }
        );
      }
    } catch (aiErr) {
      this.server.sendLogs(`[ReimbursementService] Gemini AI analysis error: ${aiErr.message}`);
      aiResult = {
        reimburse_amount: 0,
        receipt_amount: 0,
        difference_amount: 0,
        difference_status: 'UNKNOWN',
        merchant_name: 'Gagal analisis AI',
        receipt_date: msgDateStr,
        reimburse_date: msgDateStr,
        items_breakdown: [],
        anomalies: [`Analisis AI tertunda/gagal: ${aiErr.message}`],
        ai_notes: 'Silakan klik tombol "Analisis Ulang" untuk mencoba kembali.'
      };
    }

    const recordData = {
      whatsapp_message_id,
      quoted_message_id: quoted_message_id || null,
      chat_id: String(chat_id || ''),
      chat_name: chat_name || 'Direct Chat',
      sender_phone: sender_phone || null,
      sender_name: sender_name || null,
      reimburse_image_path: reimburseFileName,
      receipt_image_path: receiptFileName,
      reimburse_amount: Number(aiResult.reimburse_amount) || 0,
      receipt_amount: Number(aiResult.receipt_amount) || 0,
      difference_amount: Number(aiResult.difference_amount) || (Number(aiResult.reimburse_amount || 0) - Number(aiResult.receipt_amount || 0)),
      difference_status: aiResult.difference_status || 'MATCH',
      merchant_name: aiResult.merchant_name || 'Tidak Teridentifikasi',
      receipt_date: aiResult.receipt_date || msgDateStr,
      reimburse_date: aiResult.reimburse_date || msgDateStr,
      items_breakdown: Array.isArray(aiResult.items_breakdown) ? aiResult.items_breakdown : [],
      anomalies: Array.isArray(aiResult.anomalies) ? aiResult.anomalies : [],
      ai_notes: aiResult.ai_notes || '',
      status: (aiResult.anomalies && aiResult.anomalies.length > 0) ? 'FLAGGED' : 'PENDING'
    };

    const saved = await this.repository.createOrUpdate(recordData);

    // Broadcast update via Socket.IO to connected dashboards
    if (this.server.io) {
      this.server.io.emit('reimbursement:new', saved);
    }

    return saved;
  }

  async getAll(filters) {
    return this.repository.findAll(filters);
  }

  async getById(id) {
    return this.repository.findById(id);
  }

  async getMetrics() {
    return this.repository.getMetrics();
  }

  async updateStatus(id, status) {
    const updated = await this.repository.updateStatus(id, status);
    if (updated && this.server.io) {
      this.server.io.emit('reimbursement:updated', updated);
    }
    return updated;
  }

  async reanalyze(id) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('Reimbursement not found');
    }

    const reimbursePath = path.join(this.uploadDir, item.reimburse_image_path || '');
    const receiptPath = path.join(this.uploadDir, item.receipt_image_path || '');

    if (!fs.existsSync(reimbursePath) || !fs.existsSync(receiptPath)) {
      throw new Error('File gambar reimbursement tidak ditemukan di server');
    }

    const b64Reimburse = fs.readFileSync(reimbursePath).toString('base64');
    const b64Receipt = fs.readFileSync(receiptPath).toString('base64');

    const aiResult = await this.geminiService.analyzeReimbursementMultimodal(
      b64Reimburse,
      b64Receipt,
      'image/jpeg',
      'image/jpeg',
      {
        reimburseDate: item.reimburse_date,
        receiptDate: item.receipt_date
      }
    );

    const updateData = {
      reimburse_amount: Number(aiResult.reimburse_amount) || 0,
      receipt_amount: Number(aiResult.receipt_amount) || 0,
      difference_amount: Number(aiResult.difference_amount) || (Number(aiResult.reimburse_amount || 0) - Number(aiResult.receipt_amount || 0)),
      difference_status: aiResult.difference_status || 'MATCH',
      merchant_name: aiResult.merchant_name || item.merchant_name,
      receipt_date: aiResult.receipt_date || item.receipt_date,
      reimburse_date: aiResult.reimburse_date || item.reimburse_date,
      items_breakdown: Array.isArray(aiResult.items_breakdown) ? aiResult.items_breakdown : [],
      anomalies: Array.isArray(aiResult.anomalies) ? aiResult.anomalies : [],
      ai_notes: aiResult.ai_notes || '',
      status: (aiResult.anomalies && aiResult.anomalies.length > 0) ? 'FLAGGED' : item.status
    };

    await item.update(updateData);

    if (this.server.io) {
      this.server.io.emit('reimbursement:updated', item);
    }

    return item;
  }

  getImagePath(id, type = 'reimbursement') {
    return this.repository.findById(id).then((item) => {
      if (!item) return null;
      const fileName = type === 'receipt' ? item.receipt_image_path : item.reimburse_image_path;
      if (!fileName) return null;
      const fullPath = path.join(this.uploadDir, fileName);
      if (fs.existsSync(fullPath)) return fullPath;

      // Legacy fallback
      const legacyPath = path.resolve(process.cwd(), 'public', 'uploads', 'reimbursements', fileName);
      if (fs.existsSync(legacyPath)) return legacyPath;

      return null;
    });
  }
}

export default ReimbursementService;
