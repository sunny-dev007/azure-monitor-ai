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

// In-memory chat sessions storage (in production, use a database)
const chatSessions = new Map();

// Test endpoint to verify frontend can reach backend
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Chat API is working correctly',
    timestamp: new Date().toISOString(),
    sessionCount: chatSessions.size
  });
});

// Debug endpoint to check session state
router.get('/debug/sessions', (req, res) => {
  try {
    const sessions = Array.from(chatSessions.entries()).map(([id, session]) => ({
      id,
      createdAt: session.createdAt,
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1]?.timestamp || session.createdAt
    }));
    
    res.json({
      success: true,
      data: {
        totalSessions: chatSessions.size,
        sessions: sessions,
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (error) {
    console.error('Failed to get debug info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get debug info',
      message: error.message
    });
  }
});

// Create a new chat session
router.post('/sessions', (req, res) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      messages: [],
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      }
    };
    
    chatSessions.set(sessionId, session);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Failed to create chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
      message: error.message
    });
  }
});

// Get chat sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = Array.from(chatSessions.values()).map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1]?.timestamp || session.createdAt
    }));
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Failed to get chat sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat sessions',
      message: error.message
    });
  }
});

// Get a specific chat session
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = chatSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Failed to get chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat session',
      message: error.message
    });
  }
});

// Send a message in a chat session
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, context = {} } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }
    
    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };
    
    session.messages.push(userMessage);
    
    // Generate AI response
    const messages = session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const aiResponse = await aiService.generateResponse(messages, context);
    
    // Add AI response
    const aiMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: aiResponse.response,
      timestamp: new Date().toISOString(),
      metadata: {
        model: aiResponse.model,
        usage: aiResponse.usage
      }
    };
    
    session.messages.push(aiMessage);
    
    // Update session
    chatSessions.set(sessionId, session);
    
    res.json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        session: {
          id: session.id,
          messageCount: session.messages.length
        }
      }
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message
    });
  }
});

// Delete a chat session
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = chatSessions.delete(sessionId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        message: 'Chat session deleted successfully'
      }
    });
  } catch (error) {
    console.error('Failed to delete chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat session',
      message: error.message
    });
  }
});

// Clear all chat sessions
router.delete('/sessions', (req, res) => {
  try {
    const sessionCount = chatSessions.size;
    chatSessions.clear();
    
    res.json({
      success: true,
      data: {
        message: `Cleared ${sessionCount} chat sessions`
      }
    });
  } catch (error) {
    console.error('Failed to clear chat sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat sessions',
      message: error.message
    });
  }
});

module.exports = router;
