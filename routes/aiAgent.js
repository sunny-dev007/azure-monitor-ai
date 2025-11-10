const express = require('express');
const router = express.Router();
const aiAgentService = require('../services/aiAgentService');
const executionService = require('../services/executionService');
const { v4: uuidv4 } = require('uuid');

/**
 * AI Agent Routes for Azure Resource Cloning
 */

// Get list of resource groups
router.get('/resource-groups', async (req, res) => {
  try {
    const token = await aiAgentService.getAccessToken();
    const axios = require('axios');
    
    const url = `https://management.azure.com/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourcegroups?api-version=2021-04-01`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    res.json({
      success: true,
      data: response.data.value
    });
  } catch (error) {
    console.error('❌ Failed to get resource groups:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve resource groups',
      message: error.message
    });
  }
});

// Discover resources in a resource group
router.post('/discover', async (req, res) => {
  try {
    const { resourceGroupName } = req.body;
    
    if (!resourceGroupName) {
      return res.status(400).json({
        success: false,
        error: 'Resource group name is required'
      });
    }
    
    console.log(`🔍 Discovering resources in: ${resourceGroupName}`);
    
    const resourceGroupData = await aiAgentService.discoverResourceGroup(resourceGroupName);
    
    res.json({
      success: true,
      data: resourceGroupData
    });
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Resource discovery failed',
      message: error.message
    });
  }
});

// Analyze resources and generate cloning strategy
router.post('/analyze', async (req, res) => {
  try {
    const { resourceGroupData, targetResourceGroupName } = req.body;
    
    if (!resourceGroupData || !targetResourceGroupName) {
      return res.status(400).json({
        success: false,
        error: 'Resource group data and target name are required'
      });
    }
    
    console.log(`🤖 Analyzing resources for cloning to: ${targetResourceGroupName}`);
    
    const strategy = await aiAgentService.analyzeAndGenerateStrategy(
      resourceGroupData,
      targetResourceGroupName
    );
    
    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Resource analysis failed',
      message: error.message
    });
  }
});

// Generate Terraform configuration
router.post('/generate-terraform', async (req, res) => {
  try {
    const { resourceGroupData, targetResourceGroupName } = req.body;
    
    if (!resourceGroupData || !targetResourceGroupName) {
      return res.status(400).json({
        success: false,
        error: 'Resource group data and target name are required'
      });
    }
    
    console.log(`📝 Generating Terraform configuration...`);
    
    const terraformConfig = await aiAgentService.generateTerraformConfig(
      resourceGroupData,
      targetResourceGroupName
    );
    
    res.json({
      success: true,
      data: {
        terraform: terraformConfig,
        filename: `${targetResourceGroupName}-clone.tf`
      }
    });
  } catch (error) {
    console.error('❌ Terraform generation failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Terraform generation failed',
      message: error.message
    });
  }
});

// Generate Azure CLI scripts
router.post('/generate-cli', async (req, res) => {
  try {
    const { resourceGroupData, targetResourceGroupName } = req.body;
    
    if (!resourceGroupData || !targetResourceGroupName) {
      return res.status(400).json({
        success: false,
        error: 'Resource group data and target name are required'
      });
    }
    
    console.log(`📝 Generating Azure CLI scripts...`);
    
    const cliScript = await aiAgentService.generateAzureCLIScripts(
      resourceGroupData,
      targetResourceGroupName
    );
    
    res.json({
      success: true,
      data: {
        script: cliScript,
        filename: `clone-${targetResourceGroupName}.sh`
      }
    });
  } catch (error) {
    console.error('❌ CLI script generation failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'CLI script generation failed',
      message: error.message
    });
  }
});

// Estimate cost
router.post('/estimate-cost', async (req, res) => {
  try {
    const { resourceGroupData } = req.body;
    
    if (!resourceGroupData) {
      return res.status(400).json({
        success: false,
        error: 'Resource group data is required'
      });
    }
    
    console.log(`💰 Estimating cost...`);
    
    const costEstimate = await aiAgentService.estimateCost(resourceGroupData);
    
    res.json({
      success: true,
      data: costEstimate
    });
  } catch (error) {
    console.error('❌ Cost estimation failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Cost estimation failed',
      message: error.message
    });
  }
});

// Chat with AI Agent
router.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }
    
    console.log(`💬 Processing chat message...`);
    
    const response = await aiAgentService.chat(messages, context || {});
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('❌ Chat failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Chat failed',
      message: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  const isConfigured = Boolean(
    process.env.AZURE_OPENAI_AGENT_ENDPOINT &&
    process.env.AZURE_OPENAI_AGENT_KEY
  );
  
  res.json({
    success: true,
    data: {
      status: isConfigured ? 'configured' : 'not_configured',
      endpoint: process.env.AZURE_OPENAI_AGENT_ENDPOINT ? 'set' : 'not_set',
      apiKey: process.env.AZURE_OPENAI_AGENT_KEY ? 'set' : 'not_set',
      deployment: process.env.AZURE_OPENAI_AGENT_DEPLOYMENT || 'gpt-4o (default)'
    }
  });
});

// Execute Azure CLI script
router.post('/execute-cli', async (req, res) => {
  try {
    const { script, options } = req.body;
    
    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script is required'
      });
    }
    
    const sessionId = uuidv4();
    
    console.log(`🚀 Starting Azure CLI execution: ${sessionId}`);
    
    // Start execution in background
    executionService.executeAzureCLI(sessionId, script, options || {})
      .catch(error => {
        console.error(`❌ Execution ${sessionId} failed:`, error.message);
      });
    
    // Return session ID immediately for polling
    res.json({
      success: true,
      data: {
        sessionId,
        message: 'Execution started. Poll /execution-status/:sessionId for updates.'
      }
    });
  } catch (error) {
    console.error('❌ Execute CLI failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Execution failed to start',
      message: error.message
    });
  }
});

// Execute Terraform configuration
router.post('/execute-terraform', async (req, res) => {
  try {
    const { terraform, options } = req.body;
    
    if (!terraform) {
      return res.status(400).json({
        success: false,
        error: 'Terraform configuration is required'
      });
    }
    
    const sessionId = uuidv4();
    
    console.log(`🚀 Starting Terraform execution: ${sessionId}`);
    
    // Start execution in background
    executionService.executeTerraform(sessionId, terraform, options || {})
      .catch(error => {
        console.error(`❌ Execution ${sessionId} failed:`, error.message);
      });
    
    // Return session ID immediately for polling
    res.json({
      success: true,
      data: {
        sessionId,
        message: 'Terraform execution started. Poll /execution-status/:sessionId for updates.'
      }
    });
  } catch (error) {
    console.error('❌ Execute Terraform failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Execution failed to start',
      message: error.message
    });
  }
});

// Get execution status
router.get('/execution-status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const execution = executionService.getExecution(sessionId);
    
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }
    
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    console.error('❌ Get execution status failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution status',
      message: error.message
    });
  }
});

// Cancel execution
router.post('/cancel-execution/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const cancelled = await executionService.cancelExecution(sessionId);
    
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found or already completed'
      });
    }
    
    res.json({
      success: true,
      data: {
        message: 'Execution cancelled'
      }
    });
  } catch (error) {
    console.error('❌ Cancel execution failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel execution',
      message: error.message
    });
  }
});

module.exports = router;

