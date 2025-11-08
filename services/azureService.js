const { ClientSecretCredential } = require('@azure/identity');
const axios = require('axios');

class AzureService {
  constructor() {
    this.isInitialized = false;
    this.credential = null;
    
    // Load environment variables with better error handling
    this.subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    this.tenantId = process.env.AZURE_TENANT_ID;
    this.clientId = process.env.AZURE_CLIENT_ID;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    // Log credential status for debugging
    console.log('🔑 Azure Service Constructor - Credential Status:');
    console.log(`  - Subscription ID: ${this.subscriptionId ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - Tenant ID: ${this.tenantId ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - Client ID: ${this.clientId ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - Client Secret: ${this.clientSecret ? '✅ Set' : '❌ Missing'}`);
    
    // Request throttling
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // Minimum 200ms between requests
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Azure Service...');
      console.log('🔍 Checking Azure credentials...');
      
      if (!this.subscriptionId || !this.tenantId || !this.clientId || !this.clientSecret) {
        console.log('⚠️ Azure credentials not configured, using mock data mode');
        console.log('📋 Missing credentials:');
        if (!this.subscriptionId) console.log('  - AZURE_SUBSCRIPTION_ID');
        if (!this.tenantId) console.log('  - AZURE_TENANT_ID');
        if (!this.clientId) console.log('  - AZURE_CLIENT_ID');
        if (!this.clientSecret) console.log('  - AZURE_CLIENT_SECRET');
        console.log('💡 Please check your .env file and ensure all Azure credentials are set');
        
        this.isInitialized = false;
        return false;
      }

      console.log('✅ All Azure credentials are present, attempting authentication...');
      
      try {
        this.credential = new ClientSecretCredential(
          this.tenantId,
          this.clientId,
          this.clientSecret
        );

        // Test the connection
        console.log('🔐 Testing Azure authentication...');
        const token = await this.getAccessToken();
        console.log('✅ Azure authentication successful');
        
        this.isInitialized = true;
        console.log('✅ Azure service initialized successfully');
        return true;
      } catch (authError) {
        console.error('❌ Azure authentication failed:', authError.message);
        console.error('🔍 Authentication error details:', {
          tenantId: this.tenantId,
          clientId: this.clientId,
          hasClientSecret: !!this.clientSecret,
          error: authError.message
        });
        
        this.isInitialized = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Azure service:', error.message);
      console.error('🔍 Initialization error details:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Throttled request method to prevent rate limiting
  async throttledRequest(requestFn) {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minRequestInterval) {
        const delay = this.minRequestInterval - timeSinceLastRequest;
        setTimeout(() => {
          this.executeRequest(requestFn, resolve, reject);
        }, delay);
      } else {
        this.executeRequest(requestFn, resolve, reject);
      }
    });
  }

  async executeRequest(requestFn, resolve, reject) {
    try {
      this.lastRequestTime = Date.now();
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  async getAccessToken() {
    if (!this.credential) {
      throw new Error('Azure credentials not initialized');
    }
    
    const token = await this.credential.getToken('https://management.azure.com/.default');
    if (!token || !token.token) {
      throw new Error('Failed to get valid access token');
    }
    return token.token;
  }

  async makeAzureRequest(endpoint, params = {}, method = 'GET', data = null) {
    return this.throttledRequest(async () => {
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second base delay
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const token = await this.getAccessToken();
          
          let url = `https://management.azure.com${endpoint}`;
          if (method === 'POST' && params['api-version']) {
            url += `?api-version=${params['api-version']}`;
            const { 'api-version': _, ...otherParams } = params;
            params = otherParams;
          }
          
          console.log(`🌐 Making Azure request to: ${url} (attempt ${attempt}/${maxRetries})`);

          const config = {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            params: method === 'GET' ? {
              'api-version': '2021-04-01', // Default API version for most ARM calls
              ...params
            } : params,
            timeout: 30000 // 30 second timeout
          };

          let response;
          if (method === 'GET') {
            response = await axios.get(url, config);
          } else if (method === 'POST') {
            response = await axios.post(url, data, config);
          } else if (method === 'PUT') {
            response = await axios.put(url, data, config);
          } else if (method === 'DELETE') {
            response = await axios.delete(url, config);
          } else {
            throw new Error(`Unsupported HTTP method: ${method}`);
          }

          console.log(`✅ Azure request successful: ${endpoint}`);
          return response.data;
          
        } catch (error) {
          console.error(`❌ Azure request failed (attempt ${attempt}/${maxRetries}):`, error.message);
          
          // Handle rate limiting specifically
          if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || attempt;
            const delay = retryAfter * 1000 + (attempt * baseDelay);
            
            console.log(`⏳ Rate limited (429). Waiting ${delay}ms before retry...`);
            
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              console.log('⚠️ Max retries reached for rate limiting, using fallback data');
              throw new Error('Rate limit exceeded after max retries');
            }
          }
          
          // Handle other errors
          if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
          }
          
          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            throw error;
          }
          
          // For other errors, wait before retry
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    });
  }

  async getSubscriptionSummary() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.isInitialized) {
        console.log('⚠️ Azure not initialized, returning mock data');
        return this.getMockSubscriptionSummary();
      }

      console.log('🔍 Fetching real Azure subscription data...');

      try {
        // Get subscription info
        const subscription = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}`);
        console.log('✅ Subscription data fetched:', subscription.displayName);
        
        // Get resource groups
        const resourceGroups = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/resourcegroups`);
        console.log('✅ Resource groups fetched:', resourceGroups.value?.length || 0);
        
        // Get resources count
        const resources = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/resources`);
        console.log('✅ Resources fetched:', resources.value?.length || 0);
        
        // Get locations
        const locations = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/locations`);

        const summary = {
          subscriptionId: this.subscriptionId,
          subscriptionName: subscription.displayName,
          tenantId: this.tenantId,
          totalResources: resources.value?.length || 0,
          resourceGroups: resourceGroups.value?.length || 0,
          resourceTypes: this.processResourceTypes(resources.value || []),
          costTrend: 'stable', // This would come from cost analysis
          lastUpdated: new Date().toISOString()
        };

        console.log('📊 Real Azure summary generated:', {
          resources: summary.totalResources,
          resourceGroups: summary.resourceGroups,
          resourceTypes: Object.keys(summary.resourceTypes).length
        });

        return summary;
      } catch (apiError) {
        console.error('❌ Azure API call failed:', apiError.message);
        console.error('❌ API Error details:', JSON.stringify(apiError.response?.data || apiError, null, 2));
        
        // Fall back to mock data when Azure API fails
        console.log('⚠️ Falling back to mock data due to Azure API failure');
        return this.getMockSubscriptionSummary();
      }
    } catch (error) {
      console.error('❌ Failed to get subscription summary:', error.message);
      // Fall back to mock data
      return this.getMockSubscriptionSummary();
    }
  }

  async getResources(filters = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.isInitialized) {
        console.log('⚠️ Azure not initialized, returning mock resources');
        return this.getMockResources(filters);
      }

      console.log('🔍 Fetching real Azure resources...');

      try {
        const resources = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/resources`);
        
        // Also get cost data to map to resources
        let costData = null;
        try {
          const costs = await this.getCosts();
          costData = costs.costs || [];
        } catch (costError) {
          console.log('⚠️ Could not fetch cost data for resources:', costError.message);
        }

        const processedResources = (resources.value || []).map(resource => {
          const resourceGroup = resource.id.split('/')[4]; // Extract resource group from ID
          
          // Find cost for this resource type and resource group
          let cost = 0;
          if (costData) {
            const costItem = costData.find(c => 
              c.resourceType === resource.type && 
              c.resourceGroup === resourceGroup
            );
            if (costItem) {
              cost = costItem.cost;
            }
          }

          return {
            id: resource.id,
            name: resource.name,
            type: resource.type,
            location: resource.location,
            resourceGroup: resourceGroup,
            tags: resource.tags || {},
            properties: resource.properties || {},
            status: 'Active',
            cost: cost,
            currency: 'USD'
          };
        });

        console.log(`✅ Real Azure resources fetched: ${processedResources.length}`);
        return processedResources;
      } catch (apiError) {
        console.error('❌ Azure API call failed:', apiError.message);
        console.error('❌ API Error details:', JSON.stringify(apiError.response?.data || apiError, null, 2));
        
        // Fall back to mock data when Azure API fails
        console.log('⚠️ Falling back to mock data due to Azure API failure');
        return this.getMockResources(filters);
      }
    } catch (error) {
      console.error('❌ Failed to get resources:', error.message);
      // Fall back to mock data
      return this.getMockResources(filters);
    }
  }

  async getResourceGroups() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.isInitialized) {
        console.log('⚠️ Azure not initialized, returning mock resource groups');
        return this.getMockResourceGroups();
      }

      console.log('🔍 Fetching real Azure resource groups...');

      try {
        const resourceGroups = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/resourcegroups`);
        
        // Also get cost data to map to resource groups
        let costData = null;
        try {
          const costs = await this.getCosts();
          costData = costs.costs || [];
        } catch (costError) {
          console.log('⚠️ Could not fetch cost data for resource groups:', costError.message);
        }

        const processedGroups = (resourceGroups.value || []).map(rg => {
          // Find total cost for this resource group
          let totalCost = 0;
          if (costData) {
            const groupCosts = costData.filter(c => c.resourceGroup === rg.name);
            totalCost = groupCosts.reduce((sum, cost) => sum + cost.cost, 0);
          }

          return {
            id: rg.id,
            name: rg.name,
            location: rg.location,
            tags: rg.tags || {},
            properties: rg.properties || {},
            totalCost: totalCost,
            currency: 'USD'
          };
        });

        console.log(`✅ Real Azure resource groups fetched: ${processedGroups.length}`);
        return processedGroups;
      } catch (apiError) {
        console.error('❌ Azure API call failed:', apiError.message);
        console.error('❌ API Error details:', JSON.stringify(apiError.response?.data || apiError, null, 2));
        
        // Fall back to mock data when Azure API fails
        console.log('⚠️ Falling back to mock data due to Azure API failure');
        return this.getMockResourceGroups();
      }
    } catch (error) {
      console.error('❌ Failed to get resource groups:', error.message);
      // Fall back to mock data
      return this.getMockResourceGroups();
    }
  }

  async getCosts(timeframe = 'Last30Days') {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Azure service not initialized, using mock cost data');
        return this.getMockCosts(timeframe);
      }

      const query = {
        type: 'Usage',
        timeframe: timeframe,
        dataset: {
          granularity: 'Daily',
          aggregation: {
            totalCost: {
              name: 'PreTaxCost',
              function: 'Sum'
            }
          },
          grouping: [
            {
              type: 'Dimension',
              name: 'ResourceType'
            }
          ]
        }
      };

      try {
        const costResponse = await this.makeAzureRequest(
          `/subscriptions/${this.subscriptionId}/providers/Microsoft.CostManagement/query`,
          { 'api-version': '2021-10-01' },
          'POST',
          query
        );

        if (costResponse && costResponse.rows && costResponse.rows.length > 0) {
          const costs = costResponse.rows.map(row => ({
            resourceType: row[1] || 'Unknown',
            cost: parseFloat(row[0]) || 0,
            date: row[2] || new Date().toISOString().split('T')[0]
          }));

          const totalCost = costs.reduce((sum, item) => sum + item.cost, 0);

          return {
            totalCost: totalCost,
            currency: costResponse.currency || 'USD',
            timeframe: timeframe,
            costs: costs
          };
        } else {
          console.log('⚠️ Cost Management API returned no data, using mock data');
          return this.getMockCosts(timeframe);
        }
      } catch (apiError) {
        console.error('❌ Cost Management API failed:', apiError.message);
        console.log('⚠️ Falling back to mock cost data');
        return this.getMockCosts(timeframe);
      }
    } catch (error) {
      console.error('❌ Failed to get costs:', error.message);
      return this.getMockCosts(timeframe);
    }
  }

  async getRecommendations() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.isInitialized) {
        console.log('⚠️ Azure not initialized, returning mock recommendations');
        return this.getMockRecommendations();
      }

      console.log('🔍 Fetching real Azure recommendations...');

      // For now, return mock recommendations since Advisor API requires more complex setup
      console.log('⚠️ Advisor API not implemented yet, using mock data');
      return this.getMockRecommendations();
    } catch (error) {
      console.error('❌ Failed to get recommendations:', error.message);
      return this.getMockRecommendations();
    }
  }

  async getLocations() {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Azure service not initialized, using mock locations');
        return this.getMockLocations();
      }

      try {
        const locations = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/locations`);
        
        if (locations && locations.value && locations.value.length > 0) {
          const processedLocations = locations.value.map(location => ({
            name: location.name,
            displayName: location.displayName,
            latitude: location.latitude,
            longitude: location.longitude
          }));

          console.log(`✅ Real Azure locations fetched: ${processedLocations.length}`);
          return processedLocations;
        } else {
          console.log('⚠️ Azure locations API returned no data, using mock data');
          return this.getMockLocations();
        }
      } catch (apiError) {
        console.error('❌ Azure API call failed for locations:', apiError.message);
        console.log('⚠️ Falling back to mock locations data');
        return this.getMockLocations();
      }
    } catch (error) {
      console.error('❌ Failed to get locations:', error.message);
      return this.getMockLocations();
    }
  }

  async getResourceTypes() {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Azure service not initialized, using mock resource types');
        return this.getMockResourceTypes();
      }

      try {
        const resources = await this.makeAzureRequest(`/subscriptions/${this.subscriptionId}/resources`);
        
        if (resources && resources.value && resources.value.length > 0) {
          const resourceTypes = [...new Set(resources.value.map(r => r.type))];
          
          console.log(`✅ Real Azure resource types fetched: ${resourceTypes.length}`);
          return resourceTypes;
        } else {
          console.log('⚠️ Azure resources API returned no data, using mock data');
          return this.getMockResourceTypes();
        }
      } catch (apiError) {
        console.error('❌ Azure API call failed for resource types:', apiError.message);
        console.log('⚠️ Falling back to mock resource types data');
        return this.getMockResourceTypes();
      }
    } catch (error) {
      console.error('❌ Failed to get resource types:', error.message);
      return this.getMockResourceTypes();
    }
  }

  async getCostTrends(days = 30) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Azure service not initialized, using mock cost trends');
        return this.getMockCostTrends(days);
      }

      const query = {
        type: 'Usage',
        timeframe: 'Custom',
        timePeriod: {
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        dataset: {
          granularity: 'Daily',
          aggregation: {
            totalCost: {
              name: 'PreTaxCost',
              function: 'Sum'
            }
          }
        }
      };

      try {
        const trendResponse = await this.makeAzureRequest(
          `/subscriptions/${this.subscriptionId}/providers/Microsoft.CostManagement/query`,
          { 'api-version': '2021-10-01' },
          'POST',
          query
        );

        if (trendResponse && trendResponse.rows && trendResponse.rows.length > 0) {
          const trends = trendResponse.rows.map(row => ({
            date: row[1] || new Date().toISOString().split('T')[0],
            cost: parseFloat(row[0]) || 0
          }));

          return {
            timeframe: `${days} days`,
            currency: trendResponse.currency || 'USD',
            trends: trends,
            totalCost: trends.reduce((sum, item) => sum + item.cost, 0)
          };
        } else {
          console.log('⚠️ Cost Management API returned no trend data, using mock data');
          return this.getMockCostTrends(days);
        }
      } catch (apiError) {
        console.error('❌ Cost Management API failed for trends:', apiError.message);
        console.log('⚠️ Falling back to mock cost trends');
        return this.getMockCostTrends(days);
      }
    } catch (error) {
      console.error('❌ Failed to get cost trends:', error.message);
      return this.getMockCostTrends(days);
    }
  }

  // Mock data methods for fallback
  getMockSubscriptionSummary() {
    return {
      subscriptionId: this.subscriptionId || "demo-subscription-123",
      subscriptionName: "Demo Subscription (Mock)",
      tenantId: this.tenantId || "demo-tenant",
      totalResources: 25,
      resourceGroups: 12,
      resourceTypes: {
        "Microsoft.Web/sites": { count: 6, resources: [] },
        "Microsoft.Web/serverFarms": { count: 6, resources: [] },
        "Microsoft.Compute/virtualMachines": { count: 2, resources: [] },
        "Microsoft.Storage/storageAccounts": { count: 1, resources: [] },
        "Microsoft.Sql/servers": { count: 1, resources: [] },
        "microsoft.insights/components": { count: 3, resources: [] },
        "Microsoft.CognitiveServices/accounts": { count: 1, resources: [] },
        "Microsoft.Insights/actiongroups": { count: 1, resources: [] }
      },
      costTrend: "stable",
      lastUpdated: new Date().toISOString()
    };
  }

  getMockResources(filters = {}) {
    const mockResources = [
      {
        id: "/subscriptions/demo/resourceGroups/FEApp/providers/Microsoft.Web/sites/fe-app-prod",
        name: "fe-app-prod",
        type: "Microsoft.Web/sites",
        location: "East US",
        resourceGroup: "FEApp",
        tags: { environment: "production", owner: "frontend-team", purpose: "customer-facing" },
        status: "Running",
        cost: 45.50
      },
      {
        id: "/subscriptions/demo/resourceGroups/FEApp/providers/Microsoft.Web/serverFarms/fe-app-service-plan",
        name: "fe-app-service-plan",
        type: "Microsoft.Web/serverFarms",
        location: "East US",
        resourceGroup: "FEApp",
        tags: { environment: "production", tier: "premium" },
        status: "Active",
        cost: 45.50
      },
      {
        id: "/subscriptions/demo/resourceGroups/Micro_User_Services/providers/Microsoft.Web/sites/user-api-service",
        name: "user-api-service",
        type: "Microsoft.Web/sites",
        location: "West US 2",
        resourceGroup: "Micro_User_Services",
        tags: { environment: "production", owner: "backend-team", purpose: "user-management-api" },
        status: "Running",
        cost: 32.25
      },
      {
        id: "/subscriptions/demo/resourceGroups/Micro_User_Services/providers/Microsoft.Web/serverFarms/user-service-plan",
        name: "user-service-plan",
        type: "Microsoft.Web/serverFarms",
        location: "West US 2",
        resourceGroup: "Micro_User_Services",
        tags: { environment: "production", tier: "standard" },
        status: "Active",
        cost: 32.25
      },
      {
        id: "/subscriptions/demo/resourceGroups/RG-SmartDocs-AI/providers/Microsoft.Web/sites/smartdocs-ai-app",
        name: "smartdocs-ai-app",
        type: "Microsoft.Web/sites",
        location: "Central US",
        resourceGroup: "RG-SmartDocs-AI",
        tags: { environment: "production", owner: "ai-team", purpose: "document-processing" },
        status: "Running",
        cost: 67.80
      },
      {
        id: "/subscriptions/demo/resourceGroups/RG-SmartDocs-AI/providers/Microsoft.Web/serverFarms/smartdocs-ai-plan",
        name: "smartdocs-ai-plan",
        type: "Microsoft.Web/serverFarms",
        location: "Central US",
        resourceGroup: "RG-SmartDocs-AI",
        tags: { environment: "production", tier: "premium" },
        status: "Active",
        cost: 67.80
      },
      {
        id: "/subscriptions/demo/resourceGroups/nit-func-res/providers/Microsoft.Web/sites/nit-function-app",
        name: "nit-function-app",
        type: "Microsoft.Web/sites",
        location: "North Europe",
        resourceGroup: "nit-func-res",
        tags: { environment: "production", owner: "functions-team", purpose: "serverless-processing" },
        status: "Running",
        cost: 78.45
      },
      {
        id: "/subscriptions/demo/resourceGroups/nit-func-res/providers/Microsoft.Web/serverFarms/nit-function-plan",
        name: "nit-function-plan",
        type: "Microsoft.Web/serverFarms",
        location: "North Europe",
        resourceGroup: "nit-func-res",
        tags: { environment: "production", tier: "consumption" },
        status: "Active",
        cost: 78.45
      },
      {
        id: "/subscriptions/demo/resourceGroups/nit-smartdocs-rg/providers/Microsoft.Web/sites/nit-smartdocs-prod",
        name: "nit-smartdocs-prod",
        type: "Microsoft.Web/sites",
        location: "East US",
        resourceGroup: "nit-smartdocs-rg",
        tags: { environment: "production", owner: "smartdocs-team", purpose: "document-management" },
        status: "Running",
        cost: 23.60
      },
      {
        id: "/subscriptions/demo/resourceGroups/nit-smartdocsDev-RG/providers/Microsoft.Web/sites/nit-smartdocs-dev",
        name: "nit-smartdocs-dev",
        type: "Microsoft.Web/sites",
        location: "East US",
        resourceGroup: "nit-smartdocsDev-RG",
        tags: { environment: "development", owner: "smartdocs-team", purpose: "development-environment" },
        status: "Running",
        cost: 19.75
      },
      {
        id: "/subscriptions/demo/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/vm-prod-01",
        name: "vm-prod-01",
        type: "Microsoft.Compute/virtualMachines",
        location: "East US",
        resourceGroup: "prod-rg",
        tags: { environment: "production", owner: "devops" },
        status: "Running",
        cost: 125.75
      },
      {
        id: "/subscriptions/demo/resourceGroups/prod-rg/providers/Microsoft.Storage/storageAccounts/storageprod01",
        name: "storageprod01",
        type: "Microsoft.Storage/storageAccounts",
        location: "East US",
        resourceGroup: "prod-rg",
        tags: { environment: "production", purpose: "data" },
        status: "Active",
        cost: 18.50
      },
      {
        id: "/subscriptions/demo/resourceGroups/dev-rg/providers/Microsoft.Compute/virtualMachines/vm-dev-01",
        name: "vm-dev-01",
        type: "Microsoft.Compute/virtualMachines",
        location: "West US 2",
        resourceGroup: "dev-rg",
        tags: { environment: "development", owner: "developers" },
        status: "Running",
        cost: 89.90
      },
      {
        id: "/subscriptions/demo/resourceGroups/FEAppDB/providers/Microsoft.Sql/servers/fe-app-sql-server",
        name: "fe-app-sql-server",
        type: "Microsoft.Sql/servers",
        location: "East US",
        resourceGroup: "FEAppDB",
        tags: { environment: "production", owner: "database-team", purpose: "frontend-database" },
        status: "Active",
        cost: 125.75
      },
      {
        id: "/subscriptions/demo/resourceGroups/Micro_users/providers/microsoft.insights/components/user-service-insights",
        name: "user-service-insights",
        type: "microsoft.insights/components",
        location: "West US 2",
        resourceGroup: "Micro_users",
        tags: { environment: "production", owner: "monitoring-team", purpose: "application-monitoring" },
        status: "Active",
        cost: 18.50
      },
      {
        id: "/subscriptions/demo/resourceGroups/ai-service-az/providers/Microsoft.CognitiveServices/accounts/ai-service-account",
        name: "ai-service-account",
        type: "Microsoft.CognitiveServices/accounts",
        location: "Central US",
        resourceGroup: "ai-service-az",
        tags: { environment: "production", owner: "ai-team", purpose: "cognitive-services" },
        status: "Active",
        cost: 89.90
      },
      {
        id: "/subscriptions/demo/resourceGroups/azureapp-auto-alerts-b40c48-suchitroy3_gmail_com/providers/Microsoft.Insights/actiongroups/auto-alerts-group",
        name: "auto-alerts-group",
        type: "Microsoft.Insights/actiongroups",
        location: "East US",
        resourceGroup: "azureapp-auto-alerts-b40c48-suchitroy3_gmail_com",
        tags: { environment: "production", owner: "monitoring-team", purpose: "alerting" },
        status: "Active",
        cost: 12.30
      },
      {
        id: "/subscriptions/demo/resourceGroups/workwithcopilot/providers/microsoft.insights/components/copilot-insights",
        name: "copilot-insights",
        type: "microsoft.insights/components",
        location: "North Europe",
        resourceGroup: "workwithcopilot",
        tags: { environment: "production", owner: "copilot-team", purpose: "copilot-monitoring" },
        status: "Active",
        cost: 34.20
      }
    ];

    let filtered = mockResources;
    
    if (filters.type) {
      filtered = filtered.filter(r => r.type.toLowerCase().includes(filters.type.toLowerCase()));
    }
    
    if (filters.location) {
      filtered = filtered.filter(r => r.location.toLowerCase().includes(filters.location.toLowerCase()));
    }
    
    if (filters.resourceGroup) {
      filtered = filtered.filter(r => r.resourceGroup.toLowerCase().includes(filters.resourceGroup.toLowerCase()));
    }

    return filtered;
  }

  getMockResourceGroups() {
    return [
      { id: "prod-rg", name: "prod-rg", location: "East US" },
      { id: "dev-rg", name: "dev-rg", location: "West US 2" },
      { id: "backup-rg", name: "backup-rg", location: "East US" }
    ];
  }

  getMockCosts(timeframe = 'Last30Days') {
    // Generate realistic mock costs based on actual resource types
    const mockCosts = [
      {
        resourceType: "Microsoft.Web/serverFarms",
        resourceGroup: "FEApp",
        cost: 45.50,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Sql/servers",
        resourceGroup: "FEAppDB",
        cost: 125.75,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Web/serverFarms",
        resourceGroup: "Micro_User_Services",
        cost: 32.25,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "microsoft.insights/components",
        resourceGroup: "Micro_users",
        cost: 18.50,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Web/serverFarms",
        resourceGroup: "RG-SmartDocs-AI",
        cost: 67.80,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.CognitiveServices/accounts",
        resourceGroup: "ai-service-az",
        cost: 89.90,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Insights/actiongroups",
        resourceGroup: "azureapp-auto-alerts-b40c48-suchitroy3_gmail_com",
        cost: 12.30,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Web/serverFarms",
        resourceGroup: "nit-func-res",
        cost: 78.45,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Web/sites",
        resourceGroup: "nit-smartdocs-rg",
        cost: 23.60,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "Microsoft.Web/sites",
        resourceGroup: "nit-smartdocsDev-RG",
        cost: 19.75,
        currency: "USD",
        date: new Date().toISOString()
      },
      {
        resourceType: "microsoft.insights/components",
        resourceGroup: "workwithcopilot",
        cost: 34.20,
        currency: "USD",
        date: new Date().toISOString()
      }
    ];

    const totalCost = mockCosts.reduce((sum, cost) => sum + cost.cost, 0);

    return {
      totalCost: totalCost,
      currency: "USD",
      timeframe: timeframe,
      costs: mockCosts,
      summary: Object.values(mockCosts.reduce((acc, cost) => {
        if (!acc[cost.resourceType]) {
          acc[cost.resourceType] = {
            resourceType: cost.resourceType,
            totalCost: 0,
            count: 0,
            resources: []
          };
        }
        acc[cost.resourceType].totalCost += cost.cost;
        acc[cost.resourceType].count += 1;
        acc[cost.resourceType].resources.push(cost);
        return acc;
      }, {})),
      lastUpdated: new Date().toISOString()
    };
  }

  getMockRecommendations() {
    return [
      {
        id: "rec-1",
        category: "Cost",
        impact: "Medium",
        description: "Right-size underutilized VMs",
        solution: "Consider downsizing vm-dev-01 to a smaller SKU"
      },
      {
        id: "rec-2",
        category: "Security",
        impact: "High",
        description: "Enable encryption for storage accounts",
        solution: "Enable Azure Storage Service Encryption"
      }
    ];
  }

  getMockLocations() {
    return ["East US", "West US 2", "Central US", "North Europe"];
  }

  getMockResourceTypes() {
    return [
      "Microsoft.Web/sites",
      "Microsoft.Web/serverFarms",
      "Microsoft.Compute/virtualMachines",
      "Microsoft.Storage/storageAccounts",
      "Microsoft.Sql/servers",
      "microsoft.insights/components",
      "Microsoft.CognitiveServices/accounts",
      "Microsoft.Insights/actiongroups"
    ];
  }

  getMockCostTrends(days = 30) {
    const trends = [];
    const baseCost = 15; // Base daily cost
    const variance = 5; // Daily variance
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic daily cost with some variance
      const dailyCost = baseCost + (Math.random() * variance * 2 - variance);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        cost: Math.round(dailyCost * 100) / 100
      });
    }
    
    const totalCost = trends.reduce((sum, item) => sum + item.cost, 0);
    
    return {
      timeframe: `${days} days`,
      currency: 'USD',
      trends: trends,
      totalCost: totalCost
    };
  }

  processResourceTypes(resources) {
    const processed = {};
    
    resources.forEach(resource => {
      const type = resource.type;
      if (!processed[type]) {
        processed[type] = { count: 0, resources: [] };
      }
      processed[type].count += 1;
      processed[type].resources.push(resource);
    });
    
    return processed;
  }

  isReady() {
    return this.isInitialized;
  }
}

module.exports = AzureService;
