const ResidentAssessment = require('../models/ResidentAssessment');
const Resident = require('../models/Resident');
const User = require('../models/User');

const getAllAssessments = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 10, assessmentType, status } = req.query;

    const whereClause = { residentId };
    if (assessmentType) whereClause.assessmentType = assessmentType;
    if (status) whereClause.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: assessments } = await ResidentAssessment.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'assessor', attributes: ['id', 'name', 'email'] }
      ],
      order: [['assessmentDate', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        assessments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assessments' });
  }
};

const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await ResidentAssessment.findByPk(id, {
      include: [
        { model: Resident, as: 'resident', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'assessor', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    res.json({ success: true, data: { assessment } });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assessment' });
  }
};

const createAssessment = async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      assessmentType,
      assessmentDate,
      nextAssessmentDate,
      title,
      description,
      findings,
      recommendations,
      status,
      score,
      maxScore,
      attachments
    } = req.body;

    if (!assessmentType || !assessmentDate || !title) {
      return res.status(400).json({ success: false, message: 'Assessment type, date, and title are required' });
    }

    const assessment = await ResidentAssessment.create({
      residentId,
      createdBy: req.user.id,
      assessmentType,
      assessmentDate,
      nextAssessmentDate,
      title,
      description,
      findings: findings || {},
      recommendations,
      status: status || 'draft',
      score,
      maxScore,
      attachments: attachments || []
    });

    const assessmentWithAssessor = await ResidentAssessment.findByPk(assessment.id, {
      include: [{ model: User, as: 'assessor', attributes: ['id', 'name', 'email'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: { assessment: assessmentWithAssessor }
    });
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create assessment' });
  }
};

const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const assessment = await ResidentAssessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await assessment.update(updateData);

    const updatedAssessment = await ResidentAssessment.findByPk(id, {
      include: [{ model: User, as: 'assessor', attributes: ['id', 'name', 'email'] }]
    });

    res.json({
      success: true,
      message: 'Assessment updated successfully',
      data: { assessment: updatedAssessment }
    });
  } catch (error) {
    console.error('Update assessment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update assessment' });
  }
};

const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await ResidentAssessment.findByPk(id);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await assessment.destroy();
    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete assessment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete assessment' });
  }
};

module.exports = {
  getAllAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment
};

