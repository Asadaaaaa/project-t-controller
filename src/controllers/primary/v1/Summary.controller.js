import { ResponsePresetHelper } from '#helpers';
import { SummaryValidator } from '#validatorsPrimaryV1';
import { SummaryService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class SummaryController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.Ajv = new Ajv();
    this.DataScheme = new SummaryValidator();
    this.SummaryService = new SummaryService(this.server);
  }

  getUserId(req) {
    return req.user ? (req.user.userId || req.user.id) : null;
  }

  async getAllSummaries(req, res) {
    const { limit = 30 } = req.query;
    const userId = this.getUserId(req);
    const summaries = await this.SummaryService.getAllSummaries(userId, Number(limit));
    return res.status(200).json(this.ResponsePreset.resOK('OK', summaries));
  }

  async getSummaryByDate(req, res) {
    const { date } = req.params;
    const userId = this.getUserId(req);
    const summary = await this.SummaryService.getSummaryByDate(date, userId);
    if (!summary) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'Summary not found for date', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('OK', summary));
  }

  async generateSummary(req, res) {
    const schemeValidate = this.Ajv.compile(this.DataScheme.generate);
    if (!schemeValidate(req.body)) {
      return res.status(400).json(this.ResponsePreset.resErr(
        400,
        schemeValidate.errors[0].message,
        'validator',
        schemeValidate.errors[0]
      ));
    }

    const { date } = req.body;
    const userId = this.getUserId(req);

    try {
      const result = await this.SummaryService.generateSummary(date, userId);
      return res.status(200).json(this.ResponsePreset.resOK('Daily summary generated successfully', result));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, `Failed to generate summary: ${err.message}`, 'ai', null));
    }
  }
}

export default SummaryController;
