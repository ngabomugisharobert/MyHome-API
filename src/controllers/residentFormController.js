const ResidentForm = require('../models/ResidentForm');
const Resident = require('../models/Resident');
const User = require('../models/User');

const getAllForms = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 10, formType, status } = req.query;

    const whereClause = { residentId };
    if (formType) whereClause.formType = formType;
    if (status) whereClause.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: forms } = await ResidentForm.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'signer', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'witness', attributes: ['id', 'name', 'email'], required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        forms,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch forms' });
  }
};

const getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await ResidentForm.findByPk(id, {
      include: [
        { model: Resident, as: 'resident', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'signer', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'witness', attributes: ['id', 'name', 'email'], required: false }
      ]
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    res.json({ success: true, data: { form } });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch form' });
  }
};

const createForm = async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      formType,
      title,
      description,
      formData,
      status,
      expiryDate,
      attachments
    } = req.body;

    if (!formType || !title || !formData) {
      return res.status(400).json({ success: false, message: 'Form type, title, and form data are required' });
    }

    const form = await ResidentForm.create({
      residentId,
      createdBy: req.user.id,
      formType,
      title,
      description,
      formData,
      status: status || 'draft',
      expiryDate,
      attachments: attachments || []
    });

    const formWithCreator = await ResidentForm.findByPk(form.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Form created successfully',
      data: { form: formWithCreator }
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ success: false, message: 'Failed to create form' });
  }
};

const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const form = await ResidentForm.findByPk(id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    await form.update(updateData);

    const updatedForm = await ResidentForm.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'signer', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'witness', attributes: ['id', 'name', 'email'], required: false }
      ]
    });

    res.json({
      success: true,
      message: 'Form updated successfully',
      data: { form: updatedForm }
    });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ success: false, message: 'Failed to update form' });
  }
};

const signForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { witnessBy } = req.body;

    const form = await ResidentForm.findByPk(id);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    await form.update({
      signedBy: req.user.id,
      signedDate: new Date(),
      witnessBy,
      status: 'signed'
    });

    const signedForm = await ResidentForm.findByPk(id, {
      include: [
        { model: User, as: 'signer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'witness', attributes: ['id', 'name', 'email'], required: false }
      ]
    });

    res.json({
      success: true,
      message: 'Form signed successfully',
      data: { form: signedForm }
    });
  } catch (error) {
    console.error('Sign form error:', error);
    res.status(500).json({ success: false, message: 'Failed to sign form' });
  }
};

const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await ResidentForm.findByPk(id);

    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    await form.destroy();
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete form' });
  }
};

module.exports = {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  signForm,
  deleteForm
};


