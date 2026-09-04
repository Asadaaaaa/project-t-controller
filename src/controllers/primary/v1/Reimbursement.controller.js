import { ResponsePresetHelper } from '#helpers';
import { ReimbursementService } from '#servicesPrimaryV1';
import fs from 'fs';

class ReimbursementController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.ReimbursementService = new ReimbursementService(this.server);
  }

  async getAll(req, res) {
    try {
      const { status, difference_status, search, startDate, endDate, limit = 50, offset = 0 } = req.query;
      const data = await this.ReimbursementService.getAll({
        status,
        difference_status,
        search,
        startDate,
        endDate,
        limit,
        offset
      });
      return res.status(200).json(this.ResponsePreset.resOK('OK', data));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async getMetrics(req, res) {
    try {
      const metrics = await this.ReimbursementService.getMetrics();
      return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await this.ReimbursementService.getById(id);
      if (!item) {
        return res.status(404).json(this.ResponsePreset.resErr(404, 'Reimbursement not found', 'service', null));
      }
      return res.status(200).json(this.ResponsePreset.resOK('OK', item));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].includes(status)) {
        return res.status(400).json(this.ResponsePreset.resErr(400, 'Invalid status', 'validator', null));
      }

      const updated = await this.ReimbursementService.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json(this.ResponsePreset.resErr(404, 'Reimbursement not found', 'service', null));
      }
      return res.status(200).json(this.ResponsePreset.resOK('Status updated', updated));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async reanalyze(req, res) {
    try {
      const { id } = req.params;
      const reanalyzed = await this.ReimbursementService.reanalyze(id);
      return res.status(200).json(this.ResponsePreset.resOK('Reimbursement reanalyzed with Gemini AI', reanalyzed));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, `Failed to reanalyze: ${err.message}`, 'ai', null));
    }
  }

  async getImage(req, res) {
    try {
      const { id, type = 'reimbursement' } = req.params;
      const filePath = await this.ReimbursementService.getImagePath(id, type);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json(this.ResponsePreset.resErr(404, 'Image file not found', 'service', null));
      }

      res.setHeader('Content-Type', 'image/jpeg');
      return fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async triggerSync(req, res) {
    try {
      // Call worker HTTP /scan endpoint if reachable
      try {
        fetch('http://localhost:3050/scan').catch(() => {});
      } catch (e) {}

      return res.status(200).json(this.ResponsePreset.resOK('WhatsApp reimbursement scan triggered successfully', null));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }
}

export default ReimbursementController;
