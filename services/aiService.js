const axios = require('axios');

class AIService {
  constructor() {
    this.isInitialized = false;
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    this.apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.apiVersion = '2024-12-01-preview';
    this.defaultModel = 'gpt-4o-mini';
    this.maxRetries = parseInt(process.env.AZURE_OPENAI_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.AZURE_OPENAI_RETRY_DELAY) || 2000;
  }

  async initialize() {
    try {
      if (!this.endpoint || !this.apiKey) {
        console.log('⚠️ Azure OpenAI credentials not configured, using fallback mode');
        this.isInitialized = false;
        return false;
      }

      // Test the connection
      const testResponse = await this.testConnection();
      if (testResponse) {
        this.isInitialized = true;
        console.log('✅ Azure OpenAI service initialized successfully');
        return true;
      } else {
        this.isInitialized = false;
        console.log('⚠️ Azure OpenAI connection test failed, using fallback mode');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async testConnection() {
    try {
      const response = await axios.post(
        `${this.endpoint}/openai/deployments/${this.defaultModel}/chat/completions?api-version=${this.apiVersion}`,
        {
          messages: [
            { role: 'user', content: 'Hello, this is a connection test.' }
          ],
          max_tokens: 10
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error('❌ Azure OpenAI connection test failed:', error.message);
      return false;
    }
  }

  async generateResponse(messages, context = {}) {
    console.log('🔄 Generating AI response with context:', JSON.stringify(context, null, 2));
    
    try {
      // For now, always use fallback with context to ensure users get proper responses
      // TODO: Fix Azure OpenAI connection issue in the future
      console.log('⚠️ Using enhanced fallback response with Azure context data');
      return this.getFallbackResponse(messages, context);
      
      /* Temporarily disabled Azure OpenAI until connection is fixed
      if (!this.isInitialized) {
        console.log('⚠️ Azure OpenAI not initialized, using fallback');
        return this.getFallbackResponse(messages, context);
      }

      console.log('🚀 Attempting Azure OpenAI call...');
      const response = await this.callAzureOpenAI(messages, context);
      return response;
      */
    } catch (error) {
      console.error('❌ AI response generation failed:', error.message);
      return this.getFallbackResponse(messages, context);
    }
  }

  async callAzureOpenAI(messages, context = {}) {
    console.log('🚀 callAzureOpenAI called with context:', JSON.stringify(context, null, 2));
    
    const azureContext = this.buildAzureContext(context);
    console.log('📋 Azure context built:', azureContext);
    
    const systemPrompt = `You are an expert Azure Cloud Architect and FinOps specialist with deep expertise in Microsoft Azure infrastructure optimization. Your role is to provide comprehensive, actionable insights for Azure cost optimization, resource management, and infrastructure efficiency.

## CORE RESPONSIBILITIES:
1. **Cost Optimization Analysis**: Identify cost-saving opportunities, analyze spending patterns, and recommend optimization strategies
2. **Resource Management**: Assess resource utilization, identify underutilized resources, and suggest right-sizing opportunities
3. **Infrastructure Optimization**: Provide architectural recommendations for performance, security, and operational efficiency
4. **Best Practices**: Share Azure Well-Architected Framework principles and industry best practices

## ANALYSIS FRAMEWORK:

### COST OPTIMIZATION STRATEGIES:
- **Reserved Instances & Savings Plans**: Analyze workload patterns for RI opportunities
- **Auto-scaling & Right-sizing**: Identify over-provisioned and underutilized resources
- **Storage Tier Optimization**: Recommend appropriate storage tiers (Hot, Cool, Archive)
- **Network Cost Optimization**: Optimize data transfer and bandwidth costs
- **Development/Test Environment**: Suggest cost-effective dev/test strategies

### RESOURCE MANAGEMENT INSIGHTS:
- **Resource Utilization**: Analyze CPU, memory, and storage usage patterns
- **Resource Lifecycle**: Identify abandoned, orphaned, or unused resources
- **Resource Group Organization**: Optimize resource grouping and tagging strategies
- **Compliance & Governance**: Ensure resources follow organizational policies

### INFRASTRUCTURE OPTIMIZATION:
- **Performance Tuning**: Optimize for latency, throughput, and scalability
- **Security Hardening**: Implement security best practices and compliance measures
- **Monitoring & Alerting**: Set up comprehensive monitoring and proactive alerting
- **Disaster Recovery**: Ensure business continuity and data protection

## RESPONSE FORMAT:
- **Executive Summary**: High-level insights and key recommendations
- **Detailed Analysis**: Specific findings with data-driven insights
- **Actionable Recommendations**: Prioritized list of immediate actions
- **Long-term Strategy**: Strategic roadmap for continuous optimization
- **ROI Impact**: Quantified benefits and cost savings potential

## CURRENT AZURE CONTEXT:
${azureContext}

## RESPONSE GUIDELINES:
- **ALWAYS use the actual Azure context data provided above** - never provide generic responses
- **Be specific and actionable** - reference actual resource names, resource groups, and costs from the context
- **Use Azure-specific terminology** and service names correctly
- **Provide concrete examples** based on the user's actual resources
- **Include cost impact estimates** where possible using the actual cost data
- **Reference Azure best practices** and documentation
- **Consider the user's current infrastructure** and constraints from the context
- **Prioritize recommendations** by impact and effort required

## IMPORTANT: When asked about specific resources (like web apps, VMs, etc.):
1. **List the actual resources** from the context data
2. **Provide specific details** about each resource (name, resource group, location, cost)
3. **Analyze the actual resource types** present in the user's subscription
4. **Make recommendations** based on the real resource data, not generic advice

Remember: You are speaking to Azure professionals who need expert-level insights and actionable recommendations. Provide comprehensive analysis that demonstrates deep Azure expertise and uses the actual subscription data provided.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    try {
      const response = await axios.post(
        `${this.endpoint}/openai/deployments/${this.defaultModel}/chat/completions?api-version=${this.apiVersion}`,
        {
          messages: fullMessages,
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        response: response.data.choices[0].message.content,
        model: this.defaultModel,
        usage: response.data.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Azure OpenAI API call failed:', error.message);
      throw error;
    }
  }

  async buildAzureContext(context) {
    console.log('🔍 Building Azure context with data:', JSON.stringify(context, null, 2));
    
    let contextStr = '';
    
    if (context.subscriptionSummary) {
      contextStr += `## SUBSCRIPTION INFORMATION:\n`;
      contextStr += `- Subscription Name: ${context.subscriptionSummary.subscriptionName}\n`;
      contextStr += `- Subscription ID: ${context.subscriptionSummary.subscriptionId}\n`;
      contextStr += `- Total Resources: ${context.subscriptionSummary.totalResources}\n`;
      contextStr += `- Resource Groups: ${context.subscriptionSummary.resourceGroups}\n`;
      
      if (context.subscriptionSummary.resourceTypes) {
        contextStr += `- Resource Types: ${Object.keys(context.subscriptionSummary.resourceTypes).join(', ')}\n`;
      }
    }
    
    if (context.resources && context.resources.length > 0) {
      contextStr += `\n## CURRENT AZURE RESOURCES:\n`;
      contextStr += `- Total Resources: ${context.resources.length}\n`;
      
      // Group resources by type for better context
      const resourcesByType = context.resources.reduce((acc, resource) => {
        if (!acc[resource.type]) {
          acc[resource.type] = [];
        }
        acc[resource.type].push(resource);
        return acc;
      }, {});
      
      // Add specific resource details
      Object.entries(resourcesByType).forEach(([type, resources]) => {
        contextStr += `- ${type}: ${resources.length} resources\n`;
        
        // Add specific details for web apps and other important resources
        if (type.includes('Microsoft.Web')) {
          resources.forEach(resource => {
            contextStr += `  * ${resource.name} (${resource.resourceGroup || 'Unknown RG'}) - ${resource.location || 'Unknown Location'}\n`;
          });
        }
      });
    }
    
    if (context.resourceGroups && context.resourceGroups.length > 0) {
      contextStr += `\n## RESOURCE GROUPS:\n`;
      contextStr += `- Available Resource Groups: ${context.resourceGroups.join(', ')}\n`;
    }
    
    if (context.resourceTypes && context.resourceTypes.length > 0) {
      contextStr += `\n## RESOURCE TYPES:\n`;
      contextStr += `- Available Types: ${context.resourceTypes.join(', ')}\n`;
    }
    
    if (context.locations && context.locations.length > 0) {
      contextStr += `\n## LOCATIONS:\n`;
      contextStr += `- Available Locations: ${context.locations.join(', ')}\n`;
    }
    
    if (context.costs && context.costs.data) {
      contextStr += `\n## COST INFORMATION:\n`;
      contextStr += `- Total Monthly Cost: $${context.costs.data.totalCost}\n`;
      contextStr += `- Currency: ${context.costs.data.currency}\n`;
      
      if (context.costs.data.costs) {
        contextStr += `- Cost Breakdown:\n`;
        context.costs.data.costs.forEach(cost => {
          contextStr += `  * ${cost.resourceType}: $${cost.cost} (${cost.resourceGroup || 'Unknown RG'})\n`;
        });
      }
    }
    
    if (context.recommendations && context.recommendations.recommendations) {
      contextStr += `\n## CURRENT RECOMMENDATIONS:\n`;
      context.recommendations.recommendations.forEach(rec => {
        contextStr += `- ${rec.category} (${rec.impact}): ${rec.description}\n`;
      });
    }
    
    console.log('✅ Built Azure context:', contextStr);
    return contextStr || 'No Azure context available';
  }

  getFallbackResponse(messages, context = {}) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const lowerMessage = lastMessage.toLowerCase();

    // Enhanced fallback responses with actual Azure context data
    if (lowerMessage.includes('web app') || lowerMessage.includes('webapp') || lowerMessage.includes('app service') || lowerMessage.includes('website') || lowerMessage.includes('web application')) {
      // Check if we have web app resources in context
      const webApps = context.resources?.filter(r => r.type.includes('Microsoft.Web')) || [];
      const webAppSites = context.resources?.filter(r => r.type === 'Microsoft.Web/sites') || [];
      const webAppPlans = context.resources?.filter(r => r.type === 'Microsoft.Web/serverFarms') || [];
      
      if (webApps.length > 0) {
        return {
          response: `## 🌐 Your Azure Web Applications

Based on your Azure subscription, here are your current web applications:

### **Web App Sites (${webAppSites.length}):**
${webAppSites.map(app => `- **${app.name}** 
  - Resource Group: ${app.resourceGroup || 'Unknown'}
  - Location: ${app.location || 'Unknown'}
  - Status: ${app.status || 'Active'}
  - Tags: ${Object.entries(app.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ') || 'None'}`).join('\n')}

### **App Service Plans (${webAppPlans.length}):**
${webAppPlans.map(plan => `- **${plan.name}**
  - Resource Group: ${plan.resourceGroup || 'Unknown'}
  - Location: ${plan.location || 'Unknown'}
  - Status: ${plan.status || 'Active'}
  - Tags: ${Object.entries(plan.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ') || 'None'}`).join('\n')}

### **Cost Analysis:**
${context.costs?.data?.costs ? 
  context.costs.data.costs
    .filter(cost => cost.resourceType.includes('Microsoft.Web'))
    .map(cost => `- **${cost.resourceType}**: $${cost.cost}/month (${cost.resourceGroup || 'Unknown RG'})`)
    .join('\n') : 
  'Cost data not available for web apps'}

### **Resource Group Distribution:**
${webApps.length > 0 ? 
  Object.entries(webApps.reduce((acc, app) => {
    const rg = app.resourceGroup || 'Unknown';
    if (!acc[rg]) acc[rg] = 0;
    acc[rg]++;
    return acc;
  }, {}))
    .map(([rg, count]) => `- **${rg}**: ${count} web app resources`)
    .join('\n') : 
  'Resource group data not available'}

### **Recommendations:**
1. **Performance Optimization**: Monitor app service plan utilization and consider right-sizing
2. **Cost Management**: Review app service plan tiers and consider reserved instances
3. **Security**: Enable Azure Security Center for web applications
4. **Monitoring**: Set up Application Insights for performance monitoring
5. **Tagging**: Implement consistent tagging strategy for cost allocation

### **Next Steps:**
- Review app service plan utilization metrics
- Analyze cost trends for web applications
- Implement proper monitoring and alerting
- Consider auto-scaling policies for variable workloads

Would you like me to analyze specific web app performance, provide cost optimization strategies, or help with monitoring setup?`,
          model: 'fallback',
          usage: null,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          response: `## 🌐 Azure Web Applications

I don't see any web application resources in your current Azure subscription. This could mean:

1. **No web apps deployed** - You may not have any Azure App Service web applications
2. **Different resource types** - You might be using other services like Azure Functions, Static Web Apps, or Container Apps
3. **Resource filtering** - The resources might be in a different resource group or subscription

### **Available Resource Types in Your Subscription:**
${context.resources ? 
  [...new Set(context.resources.map(r => r.type))].slice(0, 10).join(', ') : 
  'Resource data not available'}

### **Available Resource Groups:**
${context.resourceGroups ? context.resourceGroups.slice(0, 5).join(', ') : 'Resource group data not available'}

### **To Deploy Web Apps:**
- Use Azure App Service for traditional web applications
- Consider Azure Static Web Apps for static content
- Use Azure Functions for serverless applications
- Deploy containers with Azure Container Instances

### **Alternative Web Services:**
- **Azure Functions**: Serverless compute for event-driven applications
- **Azure Static Web Apps**: Static content hosting with built-in CI/CD
- **Azure Container Apps**: Containerized applications with auto-scaling
- **Azure API Management**: API gateway and management

Would you like me to help you identify what resources you do have, or guide you through deploying a web application?`,
          model: 'fallback',
          usage: null,
          timestamp: new Date().toISOString()
        };
      }
    }

    if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('billing') || lowerMessage.includes('optimization')) {
      const totalCost = context.costs?.data?.totalCost || 'various';
      const currency = context.costs?.data?.currency || 'USD';
      
      return {
        response: `## 💰 Azure Cost Optimization Analysis

Based on your current Azure environment with **${totalCost} ${currency}** monthly spending, here are key optimization strategies:

### **Your Current Cost Breakdown:**
${context.costs?.data?.costs ? 
  context.costs.data.costs
    .slice(0, 5)
    .map(cost => `- **${cost.resourceType}**: $${cost.cost} (${cost.resourceGroup || 'Unknown RG'})`)
    .join('\n') : 
  'Detailed cost breakdown not available'}

### **Immediate Cost-Saving Opportunities:**
1. **Resource Right-sizing**: Analyze VM utilization patterns to identify over-provisioned resources
2. **Reserved Instances**: Consider 1-3 year commitments for predictable workloads
3. **Auto-shutdown Policies**: Implement automated shutdown for non-production resources
4. **Storage Tier Optimization**: Move infrequently accessed data to Cool/Archive tiers

### **Strategic Recommendations:**
- **Azure Hybrid Benefit**: Leverage existing licenses for cost savings
- **Spot Instances**: Use for non-critical, flexible workloads
- **Resource Group Tagging**: Implement comprehensive tagging for cost allocation

### **Your Resource Overview:**
- **Total Resources**: ${context.subscriptionSummary?.totalResources || 'Unknown'}
- **Resource Groups**: ${context.subscriptionSummary?.resourceGroups || 'Unknown'}
- **Resource Types**: ${context.resources ? [...new Set(context.resources.map(r => r.type))].slice(0, 5).join(', ') : 'Unknown'}

Would you like me to analyze specific resource types or provide detailed cost optimization recommendations?`,
        model: 'fallback',
        usage: null,
        timestamp: new Date().toISOString()
      };
    }

    if (lowerMessage.includes('resource') || lowerMessage.includes('service') || lowerMessage.includes('infrastructure')) {
      const totalResources = context.resources?.length || 'multiple';
      const resourceGroups = context.subscriptionSummary?.resourceGroups || 'various';
      
      return {
        response: `## 🏗️ Azure Infrastructure Analysis

Your Azure environment contains **${totalResources}** resources across **${resourceGroups}** resource groups. Here's my infrastructure assessment:

### **Your Current Infrastructure Overview:**
${context.resources ? 
  Object.entries(context.resources.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = 0;
    acc[r.type]++;
    return acc;
  }, {}))
    .slice(0, 5)
    .map(([type, count]) => `- **${type}**: ${count} resources`)
    .join('\n') : 
  'Resource details not available'}

### **Resource Distribution by Location:**
${context.resources ? 
  Object.entries(context.resources.reduce((acc, r) => {
    const loc = r.location || 'Unknown';
    if (!acc[loc]) acc[loc] = 0;
    acc[loc]++;
    return acc;
  }, {}))
    .slice(0, 3)
    .map(([location, count]) => `- **${location}**: ${count} resources`)
    .join('\n') : 
  'Location data not available'}

### **Optimization Opportunities:**
1. **Performance Tuning**: Optimize VM SKUs, storage performance tiers, and network configurations
2. **Security Hardening**: Implement Azure Security Center recommendations
3. **Monitoring & Alerting**: Set up comprehensive Azure Monitor dashboards
4. **Compliance**: Ensure resources follow organizational governance policies

### **Next Steps:**
- Review resource utilization patterns
- Implement proper tagging strategy
- Set up cost and performance monitoring
- Establish resource lifecycle management

What specific aspect of your infrastructure would you like me to analyze?`,
        model: 'fallback',
        usage: null,
        timestamp: new Date().toISOString()
      };
    }

    if (lowerMessage.includes('optimize') || lowerMessage.includes('recommend') || lowerMessage.includes('improve')) {
      const totalCost = context.costs?.data?.totalCost || 'various';
      const totalResources = context.subscriptionSummary?.totalResources || 'multiple';
      
      return {
        response: `## 🚀 Azure Optimization & Recommendations

Based on your current Azure setup with **${totalResources}** resources and **${totalCost}** monthly spending, here's my comprehensive optimization strategy:

### **Your Current Environment:**
- **Subscription**: ${context.subscriptionSummary?.subscriptionName || 'Azure Subscription'}
- **Resources**: ${context.subscriptionSummary?.totalResources || 'Multiple'} active resources
- **Resource Groups**: ${context.subscriptionSummary?.resourceGroups || 'Various'} organized groups
- **Monthly Cost**: ${context.costs?.data?.totalCost ? '$' + context.costs.data.totalCost : 'Various'} current spending

### **Immediate Actions (High Impact, Low Effort):**
1. **Cost Optimization**: Implement auto-shutdown policies and right-size underutilized VMs
2. **Security Enhancement**: Enable Azure Security Center and implement least-privilege access
3. **Monitoring Setup**: Configure Azure Monitor alerts for critical resources

### **Medium-term Improvements:**
- **Performance Optimization**: Implement auto-scaling policies and load balancing
- **Storage Optimization**: Use appropriate storage tiers and implement lifecycle policies
- **Network Optimization**: Optimize routing and implement Azure Front Door for global applications

### **Strategic Initiatives:**
- **DevOps Integration**: Implement Infrastructure as Code (IaC) with Azure Bicep/ARM
- **Disaster Recovery**: Set up Azure Site Recovery and backup strategies
- **Compliance Framework**: Implement Azure Policy and governance controls

### **ROI Focus Areas:**
- **Reserved Instances**: Potential 20-40% cost savings
- **Auto-scaling**: Reduce over-provisioning by 15-25%
- **Storage Optimization**: Achieve 30-50% storage cost reduction

Which optimization area would you like me to dive deeper into?`,
        model: 'fallback',
        usage: null,
        timestamp: new Date().toISOString()
      };
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('capabilities')) {
      return {
        response: `## 🎯 Azure AI Assistant - Expert Capabilities

I'm your dedicated Azure Cloud Architect and FinOps specialist, designed to provide enterprise-grade Azure analysis and recommendations based on your **actual Azure environment**.

### **Your Current Azure Environment:**
- **Subscription**: ${context.subscriptionSummary?.subscriptionName || 'Azure Subscription'}
- **Resources**: ${context.subscriptionSummary?.totalResources || 'Multiple'} active resources
- **Resource Groups**: ${context.subscriptionSummary?.resourceGroups || 'Various'} organized groups
- **Monthly Cost**: ${context.costs?.data?.totalCost ? '$' + context.costs.data.totalCost : 'Various'} current spending

### **Core Capabilities:**

#### **💰 Cost Optimization & FinOps**
- Detailed cost analysis and spending pattern identification
- Reserved Instance and Savings Plan recommendations
- Resource right-sizing and auto-scaling strategies
- Storage tier optimization and lifecycle management
- ROI analysis and cost-benefit calculations

#### **🏗️ Infrastructure Analysis**
- Resource utilization assessment and performance tuning
- Security posture evaluation and hardening recommendations
- Compliance and governance framework implementation
- Disaster recovery and business continuity planning
- Azure Well-Architected Framework compliance

#### **📊 Resource Management**
- Resource lifecycle management and cleanup strategies
- Tagging and resource organization optimization
- Performance monitoring and alerting setup
- Capacity planning and scaling recommendations

#### **🔧 Technical Expertise**
- Azure service-specific optimization (VMs, Storage, Networking, etc.)
- Best practices implementation and architectural guidance
- Monitoring, logging, and observability setup
- DevOps and Infrastructure as Code recommendations

### **How I Can Help You:**
1. **Analyze your current Azure environment** for optimization opportunities
2. **Provide specific, actionable recommendations** with implementation steps
3. **Create cost optimization strategies** with quantified ROI impact
4. **Design infrastructure improvements** following Azure best practices
5. **Guide security and compliance** implementation

### **Sample Questions You Can Ask:**
- "Show me my current web applications and their costs"
- "Analyze my current Azure costs and provide optimization recommendations"
- "How can I improve the performance of my VM resources?"
- "What security improvements should I implement in my Azure environment?"
- "Help me optimize my storage costs and implement lifecycle policies"

What would you like to optimize or analyze in your Azure environment today?`,
        model: 'fallback',
        usage: null,
        timestamp: new Date().toISOString()
      };
    }

    // Default professional response with actual Azure context
    return {
      response: `## 🎯 Welcome to Your Azure AI Assistant

I'm your expert Azure Cloud Architect and FinOps specialist, ready to help you optimize your Azure infrastructure for maximum efficiency and cost savings.

### **Your Current Azure Environment:**
- **Subscription**: ${context.subscriptionSummary?.subscriptionName || 'Azure Subscription'}
- **Resources**: ${context.subscriptionSummary?.totalResources || 'Multiple'} active resources
- **Resource Groups**: ${context.subscriptionSummary?.resourceGroups || 'Various'} organized groups
- **Monthly Cost**: ${context.costs?.data?.totalCost ? '$' + context.costs.data.totalCost : 'Various'} current spending

### **Available Resource Types:**
${context.resources ? 
  [...new Set(context.resources.map(r => r.type))]
    .slice(0, 5)
    .map(type => `- ${type}`)
    .join('\n') : 
  'Resource data not available'}

### **What I Can Do For You:**

#### **💰 Cost Optimization**
- Analyze spending patterns and identify savings opportunities
- Recommend Reserved Instances and right-sizing strategies
- Optimize storage tiers and implement lifecycle policies
- Provide ROI analysis for optimization initiatives

#### **🏗️ Infrastructure Analysis**
- Assess resource utilization and performance
- Identify optimization opportunities across all Azure services
- Implement security best practices and compliance measures
- Design scalable and resilient architectures

#### **📊 Resource Management**
- Optimize resource organization and tagging
- Implement monitoring and alerting strategies
- Ensure proper resource lifecycle management
- Provide capacity planning recommendations

### **Let's Get Started:**
Ask me about:
- "Show me my current web applications"
- "How can I optimize my Azure costs?"
- "What resources should I right-size?"
- "How can I improve my infrastructure security?"
- "What monitoring should I implement?"

What would you like to optimize or analyze in your Azure environment today?`,
        model: 'fallback',
        usage: null,
        timestamp: new Date().toISOString()
      };
    }

    async analyzeIntent(message) {
      try {
        if (!this.isInitialized) {
          return this.analyzeIntentFallback(message);
        }
  
        const response = await this.callAzureOpenAI([
          { role: 'user', content: `Analyze this message and return only a JSON object with intent classification: "${message}"` }
        ]);
  
        try {
          const intent = JSON.parse(response.response);
          return intent;
        } catch (parseError) {
          return this.analyzeIntentFallback(message);
        }
      } catch (error) {
        return this.analyzeIntentFallback(message);
      }
    }
  
    analyzeIntentFallback(message) {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('billing')) {
        return { intent: 'cost_analysis', confidence: 0.8 };
      }
      
      if (lowerMessage.includes('resource') || lowerMessage.includes('service')) {
        return { intent: 'resource_management', confidence: 0.8 };
      }
      
      if (lowerMessage.includes('optimize') || lowerMessage.includes('recommend')) {
        return { intent: 'optimization', confidence: 0.8 };
      }
      
      if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        return { intent: 'help', confidence: 0.9 };
      }
      
      return { intent: 'general', confidence: 0.6 };
    }
  }

module.exports = AIService;
