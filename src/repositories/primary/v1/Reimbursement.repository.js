import { Op } from 'sequelize';

class ReimbursementRepository {
  constructor(server) {
    this.server = server;
  }

  get model() {
    return this.server.model.models.whatsapp_reimbursements;
  }

  async createOrUpdate(data) {
    const existing = await this.model.findOne({
      where: { whatsapp_message_id: data.whatsapp_message_id }
    });

    if (existing) {
      await existing.update(data);
      return existing;
    }

    return this.model.create(data);
  }

  async findAll(filters = {}) {
    const where = {};
    const { status, difference_status, search, startDate, endDate, limit = 50, offset = 0 } = filters;

    if (status) {
      where.status = status;
    }

    if (difference_status) {
      where.difference_status = difference_status;
    }

    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59`)]
      };
    } else if (startDate) {
      where.created_at = {
        [Op.gte]: new Date(`${startDate}T00:00:00`)
      };
    } else if (endDate) {
      where.created_at = {
        [Op.lte]: new Date(`${endDate}T23:59:59`)
      };
    }

    if (search) {
      where[Op.or] = [
        { merchant_name: { [Op.like]: `%${search}%` } },
        { sender_name: { [Op.like]: `%${search}%` } },
        { sender_phone: { [Op.like]: `%${search}%` } },
        { chat_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await this.model.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });

    return rows;
  }

  async findById(id) {
    return this.model.findByPk(id);
  }

  async updateStatus(id, status) {
    const item = await this.model.findByPk(id);
    if (!item) return null;
    await item.update({ status });
    return item;
  }

  async getMetrics() {
    const all = await this.model.findAll();
    
    let totalReimburse = 0;
    let totalReceipt = 0;
    let totalDifference = 0;
    let anomalyCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let flaggedCount = 0;
    let rejectedCount = 0;
    let matchCount = 0;
    let overpaidCount = 0;
    let underpaidCount = 0;

    for (const item of all) {
      const rAmt = Number(item.reimburse_amount) || 0;
      const recAmt = Number(item.receipt_amount) || 0;
      const diffAmt = Number(item.difference_amount) || 0;

      totalReimburse += rAmt;
      totalReceipt += recAmt;
      totalDifference += diffAmt;

      const st = String(item.status || 'PENDING').toUpperCase();
      if (st === 'PENDING') pendingCount++;
      else if (st === 'APPROVED') approvedCount++;
      else if (st === 'FLAGGED') flaggedCount++;
      else if (st === 'REJECTED') rejectedCount++;

      const diffSt = String(item.difference_status || 'MATCH').toUpperCase();
      if (diffSt === 'MATCH') matchCount++;
      else if (diffSt === 'OVERPAID') overpaidCount++;
      else if (diffSt === 'UNDERPAID') underpaidCount++;

      const anomalies = Array.isArray(item.anomalies) ? item.anomalies : [];
      if (anomalies.length > 0) anomalyCount++;
    }

    return {
      totalClaims: all.length,
      totalCount: all.length,
      totalReimburseAmount: totalReimburse,
      totalReimburse,
      totalReceiptAmount: totalReceipt,
      totalReceipt,
      totalDifference,
      anomaliesCount: anomalyCount,
      anomalyCount,
      pendingCount,
      approvedCount,
      flaggedCount,
      rejectedCount,
      matchCount,
      overpaidCount,
      underpaidCount
    };
  }
}

export default ReimbursementRepository;
