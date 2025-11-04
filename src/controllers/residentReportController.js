const ResidentReport = require('../models/ResidentReport');
const Resident = require('../models/Resident');
const User = require('../models/User');

const getAllReports = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 10, reportType, status } = req.query;

    const whereClause = { residentId };
    if (reportType) whereClause.reportType = reportType;
    if (status) whereClause.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: reports } = await ResidentReport.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'], required: false }
      ],
      order: [['report_date', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await ResidentReport.findByPk(id, {
      include: [
        { model: Resident, as: 'resident', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'], required: false }
      ]
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

const createReport = async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      reportType,
      reportDate,
      title,
      summary,
      content,
      status,
      attachments
    } = req.body;

    if (!reportType || !reportDate || !title) {
      return res.status(400).json({ success: false, message: 'Report type, date, and title are required' });
    }

    const report = await ResidentReport.create({
      residentId,
      createdBy: req.user.id,
      reportType,
      reportDate,
      title,
      summary,
      content: content || {},
      status: status || 'draft',
      attachments: attachments || []
    });

    const reportWithAuthor = await ResidentReport.findByPk(report.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: { report: reportWithAuthor }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const report = await ResidentReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await report.update(updateData);

    const updatedReport = await ResidentReport.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'], required: false }
      ]
    });

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: { report: updatedReport }
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await ResidentReport.findByPk(id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await report.destroy();
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport
};


