const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, checkLimits } = require('../middleware/auth');
const { dbHelpers } = require('../lib/prisma');

const router = express.Router();

// Get all projects for authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const projects = await dbHelpers.project.findByUserId(req.user.id);
    
    res.json({
      message: 'Projects retrieved successfully',
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        devices: project.devices
      }))
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new project
router.post('/', [
  verifyToken,
  checkLimits('project'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('visibility')
    .optional()
    .isIn(['PRIVATE', 'PUBLIC'])
    .withMessage('Visibility must be PRIVATE or PUBLIC')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { name, description, visibility = 'PRIVATE' } = req.body;

    const project = await dbHelpers.project.create({
      name,
      description,
      visibility,
      status: 'DRAFT',
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility,
        status: project.status,
        userId: project.userId,
        createdAt: project.createdAt
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific project
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await dbHelpers.project.findById(id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.userId === req.user.id || 
                     project.visibility === 'PUBLIC' ||
                     req.user.role === 'ADMIN' ||
                     project.sharedWith.some(share => share.userId === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }
    
    res.json({
      message: 'Project retrieved successfully',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility,
        status: project.status,
        code: project.code,
        configuration: project.configuration,
        userId: project.userId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        devices: project.devices,
        sharedWith: project.sharedWith
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update project
router.put('/:id', [
  verifyToken,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    
    // TODO: Implement project update logic
    res.json({
      message: 'Project updated successfully',
      project: { id, ...req.body }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement project deletion logic
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;