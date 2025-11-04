const ResidentNote = require('../models/ResidentNote');
const Resident = require('../models/Resident');
const User = require('../models/User');

const getAllNotes = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 10, category, priority } = req.query;

    const whereClause = { residentId };
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: notes } = await ResidentNote.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notes' });
  }
};

const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await ResidentNote.findByPk(id, {
      include: [
        { model: Resident, as: 'resident', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'author', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, data: { note } });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch note' });
  }
};

const createNote = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { title, content, category, priority, isPrivate, tags, attachments } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const note = await ResidentNote.create({
      residentId,
      createdBy: req.user.id,
      title,
      content,
      category: category || 'general',
      priority: priority || 'medium',
      isPrivate: isPrivate || false,
      tags: tags || [],
      attachments: attachments || []
    });

    const noteWithAuthor = await ResidentNote.findByPk(note.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note: noteWithAuthor }
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
};

const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, priority, isPrivate, tags, attachments } = req.body;

    const note = await ResidentNote.findByPk(id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // Only allow creator or admin to update
    if (note.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await note.update({
      title,
      content,
      category,
      priority,
      isPrivate,
      tags,
      attachments
    });

    const updatedNote = await ResidentNote.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }]
    });

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note: updatedNote }
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await ResidentNote.findByPk(id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // Only allow creator or admin to delete
    if (note.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await note.destroy();
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
};


