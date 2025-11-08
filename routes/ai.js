const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

// Initialize AI service
const aiService = new AIService();

// Initialize AI service before handling requests
router.use(async (req, res, next) => {
  if (!aiService.isInitialized) {
    try {
      await aiService.initialize();
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  }
  next();
});

// Generate AI response
router.post('/generate', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const response = await aiService.generateResponse(messages, context);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      message: error.message
    });
  }
});

// Analyze message intent
router.post('/analyze-intent', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const intent = await aiService.analyzeIntent(message);
    
    res.json({
      success: true,
      data: intent
    });
  } catch (error) {
    console.error('Intent analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze intent',
      message: error.message
    });
  }
});

// Get AI service status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isInitialized: aiService.isInitialized,
      model: aiService.defaultModel,
      endpoint: aiService.endpoint ? 'Configured' : 'Not configured',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
