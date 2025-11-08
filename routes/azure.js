const express = require('express');
const router = express.Router();
const AzureService = require('../services/azureService');

// Create an instance of Azure service
const azureService = new AzureService();

// Initialize Azure service middleware
router.use(async (req, res, next) => {
  try {
    if (!azureService.isInitialized) {
      await azureService.initialize();
    }
    next();
  } catch (error) {
    console.error('Failed to initialize Azure service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Azure service',
      details: error.message
    });
  }
});

// Get subscription summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await azureService.getSubscriptionSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Failed to get subscription summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription summary',
      details: error.message
    });
  }
});

// Get resources
router.get('/resources', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      location: req.query.location,
      resourceGroup: req.query.resourceGroup
    };
    
    const resources = await azureService.getResources(filters);
    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Failed to get resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resources',
      details: error.message
    });
  }
});

// Get resource groups
router.get('/resource-groups', async (req, res) => {
  try {
    const resourceGroups = await azureService.getResourceGroups();
    res.json({
      success: true,
      data: resourceGroups
    });
  } catch (error) {
    console.error('Failed to get resource groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource groups',
      details: error.message
    });
  }
});

// Get costs
router.get('/costs', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'Last30Days';
    const costs = await azureService.getCosts(timeframe);
    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('Failed to get costs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get costs',
      details: error.message
    });
  }
});

// Get cost trends
router.get('/costs/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await azureService.getCostTrends(days);
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Failed to get cost trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cost trends',
      details: error.message
    });
  }
});

// Get recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await azureService.getRecommendations();
    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      details: error.message
    });
  }
});

// Get locations
router.get('/locations', async (req, res) => {
  try {
    const locations = await azureService.getLocations();
    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Failed to get locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locations',
      details: error.message
    });
  }
});

// Get resource types
router.get('/resource-types', async (req, res) => {
  try {
    const resourceTypes = await azureService.getResourceTypes();
    res.json({
      success: true,
      data: resourceTypes
    });
  } catch (error) {
    console.error('Failed to get resource types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource types',
      details: error.message
    });
  }
});

// Get resource metrics
router.get('/resources/:resourceId/metrics', async (req, res) => {
  try {
    const { resourceId } = req.params;
    const metricNames = req.query.metrics ? req.query.metrics.split(',') : ['CPU Percentage', 'Memory Percentage'];
    
    const metrics = await azureService.getResourceMetrics(resourceId, metricNames);
    res.json(metrics);
  } catch (error) {
    console.error('Failed to get resource metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource metrics',
      details: error.message
    });
  }
});

// Get specific resource
router.get('/resources/:resourceId', async (req, res) => {
  try {
    const { resourceId } = req.params;
    const resources = await azureService.getResources();
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    console.error('Failed to get resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource',
      details: error.message
    });
  }
});

module.exports = router;
