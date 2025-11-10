const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const axios = require('axios');

/**
 * AI Agent Service for Azure Resource Cloning
 * Uses Azure OpenAI GPT-4o for intelligent resource discovery and cloning
 */
class AIAgentService {
  constructor() {
    // Azure OpenAI Configuration
    this.endpoint = process.env.AZURE_OPENAI_AGENT_ENDPOINT || 'https://smartdocs-hive.openai.azure.com/';
    this.apiKey = process.env.AZURE_OPENAI_AGENT_KEY || '';
    this.deploymentName = process.env.AZURE_OPENAI_AGENT_DEPLOYMENT || 'gpt-4o'; // Recommended: gpt-4o or gpt-4.1
    
    // Azure Management Configuration
    this.tenantId = process.env.AZURE_TENANT_ID;
    this.clientId = process.env.AZURE_CLIENT_ID;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET;
    this.subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    
    this.client = null;
    this.accessToken = null;
    
    this.initializeClient();
  }
  
  /**
   * Initialize Azure OpenAI Client
   */
  initializeClient() {
    try {
      if (this.apiKey && this.endpoint) {
        this.client = new OpenAIClient(
          this.endpoint,
          new AzureKeyCredential(this.apiKey)
        );
        console.log('✅ AI Agent Service initialized with Azure OpenAI');
      } else {
        console.warn('⚠️ Azure OpenAI credentials not configured for AI Agent');
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI Agent Service:', error.message);
    }
  }
  
  /**
   * Get Azure Access Token for ARM API calls
   */
  async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      const response = await axios.post(tokenUrl, new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://management.azure.com/.default',
        grant_type: 'client_credentials'
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      this.accessToken = response.data.access_token;
      
      // Refresh token before expiry
      setTimeout(() => {
        this.accessToken = null;
      }, (response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get access token:', error.message);
      throw new Error('Authentication failed');
    }
  }
  
  /**
   * Discover all resources in a resource group
   */
  async discoverResourceGroup(resourceGroupName) {
    try {
      const token = await this.getAccessToken();
      
      // Get resource group details
      const rgUrl = `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}?api-version=2021-04-01`;
      const rgResponse = await axios.get(rgUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Get all resources in the resource group
      const resourcesUrl = `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroupName}/resources?api-version=2021-04-01`;
      const resourcesResponse = await axios.get(resourcesUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const resources = resourcesResponse.data.value;
      
      // Get detailed configuration for each resource
      const detailedResources = await Promise.all(
        resources.map(async (resource) => {
          try {
            const detailUrl = `https://management.azure.com${resource.id}?api-version=2021-04-01`;
            const detailResponse = await axios.get(detailUrl, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return detailResponse.data;
          } catch (error) {
            console.warn(`⚠️ Could not get details for ${resource.name}:`, error.message);
            return resource;
          }
        })
      );
      
      return {
        resourceGroup: rgResponse.data,
        resources: detailedResources,
        totalResources: resources.length
      };
    } catch (error) {
      console.error('❌ Failed to discover resource group:', error.message);
      throw error;
    }
  }
  
  /**
   * Analyze resources using AI and generate cloning strategy
   */
  async analyzeAndGenerateStrategy(resourceGroupData, targetResourceGroupName) {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }
    
    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.getUserPrompt(resourceGroupData, targetResourceGroupName);
      
      console.log('🤖 Analyzing resources with AI...');
      
      const response = await this.client.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          temperature: 0.3, // Lower temperature for more deterministic code generation
          maxTokens: 4000,
          topP: 0.95,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      );
      
      const aiResponse = response.choices[0].message.content;
      
      // Parse AI response (expects JSON format)
      try {
        const strategy = JSON.parse(aiResponse);
        return strategy;
      } catch (parseError) {
        // If not JSON, return as text
        return {
          analysis: aiResponse,
          format: 'text'
        };
      }
    } catch (error) {
      console.error('❌ AI analysis failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Generate Terraform configuration for cloning
   */
  async generateTerraformConfig(resourceGroupData, targetResourceGroupName) {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }
    
    try {
      const systemPrompt = `You are an expert Azure and Terraform specialist. Your task is to generate accurate, production-ready Terraform configuration files to clone Azure resources.

CRITICAL REQUIREMENTS:
1. Generate valid Terraform HCL syntax
2. Use azurerm provider
3. Include all resource properties and configurations
4. Handle dependencies correctly
5. Use variables for resource group name and location
6. Include resource naming conventions
7. Add comments for clarity
8. Ensure idempotency

OUTPUT FORMAT: Provide only valid Terraform code, no markdown formatting.`;

      const userPrompt = `Generate Terraform configuration to clone the following Azure resource group and all its resources:

SOURCE RESOURCE GROUP: ${resourceGroupData.resourceGroup.name}
TARGET RESOURCE GROUP: ${targetResourceGroupName}
LOCATION: ${resourceGroupData.resourceGroup.location}

RESOURCES TO CLONE:
${JSON.stringify(resourceGroupData.resources, null, 2)}

Generate complete Terraform configuration including:
1. Provider configuration
2. Resource group creation
3. All resources with exact same configuration
4. Variables file
5. Outputs file

Ensure all resource dependencies are properly handled.`;

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          temperature: 0.2,
          maxTokens: 8000,
          topP: 0.9
        }
      );
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Terraform generation failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Generate Azure CLI scripts for cloning
   */
  async generateAzureCLIScripts(resourceGroupData, targetResourceGroupName) {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }
    
    try {
      const systemPrompt = `You are an expert Azure CLI specialist. Generate accurate, production-ready Azure CLI scripts to clone Azure resources.

🚨 CRITICAL OUTPUT FORMAT REQUIREMENTS 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DO NOT include ANY explanatory text, prose, or markdown
❌ DO NOT start with "Below is the script..." or similar
❌ DO NOT end with "### Explanation:" or "### Notes:" or ANY explanation
❌ DO NOT use markdown code fences (\`\`\`bash or \`\`\`)
❌ DO NOT add any text before, after, or outside the script
❌ NO "**Error Handling**", NO "**Idempotency**", NO explanations
✅ ONLY output the raw bash script itself
✅ START immediately with: #!/bin/bash
✅ END immediately after the last command (e.g., echo "...completed.")
✅ USE shell comments (# ...) for any explanations INSIDE the script ONLY

SCRIPT REQUIREMENTS:
1. Use Azure CLI commands only
2. Include error handling
3. Check for existing resources
4. Handle dependencies and deployment order
5. Add comments (# ...) for clarity inside the script
6. Use proper quoting and escaping
7. Include validation steps
8. Make scripts idempotent

OUTPUT EXAMPLE (CORRECT):
#!/bin/bash

# Variables
SOURCE_RG="demoai"
TARGET_RG="target"
...
echo "All resources cloned successfully."

OUTPUT EXAMPLE (WRONG - Prose before):
Below is the bash script that clones resources...
\`\`\`bash
#!/bin/bash
...
\`\`\`

OUTPUT EXAMPLE (WRONG - Explanation after):
#!/bin/bash
...
echo "All resources cloned successfully."

### Explanation:
1. **Error Handling**: The script checks...
2. **Idempotency**: The script checks...

⚠️ STOP OUTPUT IMMEDIATELY after the last bash command!`;

      const userPrompt = `Generate Azure CLI script to clone the following Azure resource group and all its resources:

SOURCE RESOURCE GROUP: ${resourceGroupData.resourceGroup.name}
TARGET RESOURCE GROUP: ${targetResourceGroupName}
LOCATION: ${resourceGroupData.resourceGroup.location}

RESOURCES TO CLONE:
${JSON.stringify(resourceGroupData.resources, null, 2)}

Generate a complete bash script that:
1. Creates target resource group
2. Clones all resources with exact same configuration
3. Handles dependencies
4. Includes error checking
5. Provides progress updates
6. Can be run multiple times safely`;

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          temperature: 0.2,
          maxTokens: 8000,
          topP: 0.9
        }
      );
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Azure CLI script generation failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Chat with AI Agent about resource cloning
   */
  async chat(messages, context = {}) {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }
    
    try {
      const systemPrompt = this.getChatSystemPrompt();
      
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }))
      ];
      
      // Add context if provided
      if (context.resourceGroupData) {
        chatMessages.splice(1, 0, {
          role: 'system',
          content: `CONTEXT - Current Resource Group Data:\n${JSON.stringify(context.resourceGroupData, null, 2)}`
        });
      }
      
      const response = await this.client.getChatCompletions(
        this.deploymentName,
        chatMessages,
        {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.95
        }
      );
      
      return {
        message: response.choices[0].message.content,
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens
        }
      };
    } catch (error) {
      console.error('❌ Chat failed:', error.message);
      throw error;
    }
  }
  
  /**
   * System prompt for resource analysis
   */
  getSystemPrompt() {
    return `You are an expert Azure Cloud Architect and DevOps specialist with deep knowledge of:
- Azure Resource Manager (ARM)
- Azure resource types and their configurations
- Resource dependencies and deployment order
- Infrastructure as Code (Terraform, ARM templates)
- Azure CLI and PowerShell
- Best practices for resource cloning and migration

Your task is to analyze Azure resource group configurations and create comprehensive cloning strategies.

ANALYZE AND PROVIDE:
1. Resource inventory and categorization
2. Dependency analysis (which resources depend on others)
3. Deployment order (correct sequence to avoid failures)
4. Configuration differences and considerations
5. Potential issues and warnings
6. Estimated deployment time
7. Cost implications
8. Security considerations

OUTPUT FORMAT: JSON with the following structure:
{
  "summary": "Brief overview",
  "resourceInventory": [
    {
      "name": "resource name",
      "type": "resource type",
      "category": "compute|network|storage|database|etc",
      "complexity": "low|medium|high"
    }
  ],
  "dependencies": [
    {
      "resource": "resource name",
      "dependsOn": ["list of dependencies"]
    }
  ],
  "deploymentOrder": ["ordered list of resource names"],
  "warnings": ["potential issues"],
  "estimatedTime": "minutes",
  "considerations": {
    "security": ["security points"],
    "cost": ["cost considerations"],
    "networking": ["network considerations"]
  },
  "recommendations": ["best practices"]
}

Be thorough, accurate, and provide actionable insights.`;
  }
  
  /**
   * User prompt for resource analysis
   */
  getUserPrompt(resourceGroupData, targetResourceGroupName) {
    return `Analyze the following Azure resource group and create a comprehensive cloning strategy:

SOURCE RESOURCE GROUP:
Name: ${resourceGroupData.resourceGroup.name}
Location: ${resourceGroupData.resourceGroup.location}
Tags: ${JSON.stringify(resourceGroupData.resourceGroup.tags || {})}

TARGET RESOURCE GROUP:
Name: ${targetResourceGroupName}

RESOURCES TO CLONE (${resourceGroupData.totalResources} resources):
${JSON.stringify(resourceGroupData.resources, null, 2)}

Provide a detailed analysis and cloning strategy in the specified JSON format.`;
  }
  
  /**
   * System prompt for chat conversations
   */
  getChatSystemPrompt() {
    return `You are an intelligent Azure AI Agent specialized in resource management and cloning.

YOUR CAPABILITIES:
1. Analyze Azure resource groups and their resources
2. Generate Terraform configurations for resource cloning
3. Generate Azure CLI scripts for resource deployment
4. Identify dependencies between resources
5. Provide cost estimates and optimization suggestions
6. Explain Azure concepts and best practices
7. Troubleshoot deployment issues

YOUR PERSONALITY:
- Professional and knowledgeable
- Clear and concise explanations
- Proactive in identifying potential issues
- Helpful and supportive

CONVERSATION GUIDELINES:
1. Always confirm before destructive operations
2. Provide warnings about cost implications
3. Explain technical concepts in simple terms
4. Offer alternatives when appropriate
5. Ask clarifying questions when needed

When users ask you to clone resources:
1. Confirm the source and target resource groups
2. Analyze the resources
3. Explain what will be cloned
4. Highlight any potential issues
5. Provide script options (Terraform or Azure CLI)
6. Offer to execute or just provide the scripts

Be conversational but professional. Help users make informed decisions about their Azure resources.`;
  }
  
  /**
   * Estimate cost for cloning resources
   */
  async estimateCost(resourceGroupData) {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }
    
    try {
      const systemPrompt = `You are an Azure cost estimation expert. Analyze resources and provide cost estimates.

Provide estimates in USD per month based on:
1. Resource type and SKU
2. Region/location
3. Usage patterns (assume medium usage)
4. Data transfer costs
5. Storage costs

OUTPUT FORMAT: JSON with cost breakdown:
{
  "totalEstimatedCost": "monthly cost in USD",
  "breakdown": [
    {
      "resource": "resource name",
      "resourceType": "type",
      "estimatedCost": "cost in USD",
      "factors": ["cost factors"]
    }
  ],
  "notes": ["important cost considerations"]
}`;

      const userPrompt = `Estimate monthly cost for cloning these Azure resources:
${JSON.stringify(resourceGroupData.resources, null, 2)}

Location: ${resourceGroupData.resourceGroup.location}`;

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          temperature: 0.3,
          maxTokens: 2000
        }
      );
      
      try {
        return JSON.parse(response.choices[0].message.content);
      } catch {
        return { analysis: response.choices[0].message.content };
      }
    } catch (error) {
      console.error('❌ Cost estimation failed:', error.message);
      throw error;
    }
  }
}

module.exports = new AIAgentService();

