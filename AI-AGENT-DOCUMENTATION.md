# 🤖 Azure AI Agent - Resource Cloning Feature

## 🎯 **Overview**

The AI Agent is an intelligent Azure resource cloning assistant powered by **Azure OpenAI GPT-4o**. It can discover, analyze, and clone entire resource groups with all their nested resources and configurations.

---

## ✨ **Key Features**

### 1. **Intelligent Resource Discovery**
- Automatically discovers all resources in a resource group
- Retrieves detailed configurations for each resource
- Identifies nested resources and dependencies

### 2. **AI-Powered Analysis**
- Analyzes resource configurations using GPT-4o
- Identifies dependencies between resources
- Determines optimal deployment order
- Provides warnings and recommendations
- Estimates deployment time and complexity

### 3. **Script Generation**
- **Terraform Configuration**: Generates production-ready Terraform HCL
- **Azure CLI Scripts**: Generates executable bash scripts
- Both maintain exact same configuration as original resources

### 4. **Cost Estimation**
- Estimates monthly costs for cloned resources
- Breaks down costs by resource type
- Provides cost optimization suggestions

### 5. **Interactive AI Chat**
- Conversational interface for resource cloning
- Ask questions about Azure concepts
- Get real-time guidance and explanations
- Context-aware responses based on your resources

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Resource        │  │  AI Chat         │                │
│  │  Selection       │  │  Interface       │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Analysis        │  │  Script          │                │
│  │  Display         │  │  Preview         │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           AI Agent Service (aiAgentService.js)        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Azure OpenAI Integration (GPT-4o)                 │  │
│  │  • Resource Discovery                                 │  │
│  │  • Configuration Analysis                            │  │
│  │  • Script Generation                                 │  │
│  │  • Cost Estimation                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Azure Services                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   Azure       │  │   Azure       │  │   Azure       │  │
│  │   Resource    │  │   OpenAI      │  │   Management  │  │
│  │   Manager     │  │   (GPT-4o)    │  │   REST API    │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 **Setup & Configuration**

### **1. Azure OpenAI Configuration**

The AI Agent requires its own Azure OpenAI instance for optimal performance. Add these to your `.env` file:

```bash
# Azure OpenAI Configuration for AI Agent (Resource Cloning)
AZURE_OPENAI_AGENT_ENDPOINT=https://smartdocs-hive.openai.azure.com/
AZURE_OPENAI_AGENT_KEY=<YOUR_AZURE_OPENAI_KEY>
AZURE_OPENAI_AGENT_DEPLOYMENT=gpt-4o
```

### **2. Recommended Model**

Based on your available deployments, we recommend:

**Primary Model**: `gpt-4o` or `gpt-4.1`
- **Best for**: Complex reasoning, code generation, dependency analysis
- **Accuracy**: Highest
- **Speed**: Fast
- **Use case**: Resource analysis, script generation

**Alternative**: `gpt-4o-mini`
- **Best for**: Quick questions, cost estimation
- **Accuracy**: Good
- **Speed**: Faster
- **Cost**: Lower

### **3. Install Dependencies**

```bash
# Backend
npm install @azure/openai

# The dependency is already added to package.json
```

### **4. Restart Backend Server**

```bash
cd /path/to/project
npm start
```

---

## 📖 **How to Use**

### **Step 1: Select Source Resource Group**

1. Navigate to **AI Agent** in the sidebar
2. Select a **source resource group** from the dropdown
3. Enter a **target resource group name** for the clone
4. Click **"Discover Resources"**

### **Step 2: Review Discovered Resources**

- See all resources in the group
- View resource types, locations, and configurations
- Click **"Analyze with AI"** to proceed

### **Step 3: AI Analysis**

The AI will analyze:
- Resource inventory
- Dependencies between resources
- Deployment order
- Potential issues
- Security considerations
- Cost implications

### **Step 4: Generate Scripts**

Choose your preferred method:

#### **Option A: Terraform**
- Click **"Generate Terraform"**
- Review the generated Terraform configuration
- Copy or download the `.tf` file
- Run `terraform init && terraform plan && terraform apply`

#### **Option B: Azure CLI**
- Click **"Generate Azure CLI"**
- Review the generated bash script
- Copy or download the `.sh` file
- Run `chmod +x script.sh && ./script.sh`

### **Step 5: Cost Estimation**

- Click **"Estimate Cost"**
- Review monthly cost breakdown
- See cost by resource type
- Get optimization suggestions

### **Step 6: Chat with AI**

Use the chat interface to:
- Ask questions about resources
- Get explanations of configurations
- Request modifications to scripts
- Troubleshoot issues
- Learn Azure best practices

---

## 💡 **Use Cases**

### **1. Environment Replication**
Clone production resources to create staging/dev environments

### **2. Disaster Recovery**
Quickly recreate resources in a different region

### **3. Multi-Tenant Setup**
Clone infrastructure for new customers/tenants

### **4. Testing & Experimentation**
Create isolated clones for testing changes

### **5. Migration**
Move resources between subscriptions or accounts

### **6. Documentation**
Generate infrastructure-as-code documentation

---

## 🎨 **Features in Detail**

### **Resource Discovery**

```javascript
// Backend automatically:
1. Lists all resources in the resource group
2. Gets detailed configuration for each resource
3. Identifies resource types and dependencies
4. Retrieves tags, SKUs, and properties
```

### **AI Analysis**

The GPT-4o model analyzes:
- **Resource Types**: Categorizes (compute, storage, network, database, etc.)
- **Dependencies**: Identifies which resources depend on others
- **Deployment Order**: Determines safe deployment sequence
- **Warnings**: Flags potential issues (e.g., secrets, network configs)
- **Recommendations**: Suggests best practices

### **Terraform Generation**

Generated Terraform includes:
- Provider configuration
- Resource group definition
- All resources with exact configurations
- Variables for customization
- Outputs for important values
- Proper dependency management

Example:
```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  default = "my-cloned-rg"
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = "eastus"
}

resource "azurerm_storage_account" "example" {
  name                     = "mystorage${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  depends_on = [azurerm_resource_group.main]
}
```

### **Azure CLI Script Generation**

Generated scripts include:
- Error checking
- Progress updates
- Dependency handling
- Idempotency
- Rollback capability

Example:
```bash
#!/bin/bash
set -e

echo "Creating resource group..."
az group create --name my-cloned-rg --location eastus

echo "Creating storage account..."
az storage account create \
  --name mystorageaccount \
  --resource-group my-cloned-rg \
  --location eastus \
  --sku Standard_LRS

echo "✅ Clone complete!"
```

---

## 🛡️ **Security Considerations**

### **Secrets & Credentials**
⚠️ **Warning**: The AI Agent can only access configurations, not secrets!

- Passwords, connection strings, API keys are NOT retrieved
- You must manually configure secrets after cloning
- Scripts include placeholders for sensitive values

### **RBAC Permissions**
The service principal needs:
- **Reader** role on source resource group
- **Contributor** or **Owner** role on target resource group/subscription

### **Network Security**
- VNet peering must be manually configured
- Private endpoints need manual recreation
- Firewall rules may need updates

---

## 🎯 **Best Practices**

### **1. Review Before Deploying**
- Always review generated scripts
- Understand what resources will be created
- Check cost estimates

### **2. Test in Non-Production**
- Clone to a test/dev subscription first
- Verify configurations work as expected

### **3. Customize Resource Names**
- Many Azure resources require globally unique names
- Scripts include random suffixes for uniqueness

### **4. Handle Secrets Separately**
- Use Azure Key Vault for secrets
- Update application configurations post-deployment

### **5. Monitor Deployment**
- Watch Azure Portal for deployment progress
- Check for errors in script output

---

## 🔧 **Troubleshooting**

### **"AI Agent Not Configured"**
- Check `.env` file has `AZURE_OPENAI_AGENT_*` variables
- Verify Azure OpenAI key is valid
- Restart backend server

### **"Failed to Discover Resources"**
- Ensure service principal has Reader access
- Check resource group name is correct
- Verify Azure credentials in `.env`

### **"Script Generation Failed"**
- Resource group might be too complex
- Try with a smaller resource group
- Check backend logs for specific error

### **"Cost Estimation Unavailable"**
- Some resource types don't have public pricing
- Estimates are approximate
- Verify with Azure Pricing Calculator

---

## 📊 **Performance Optimization**

### **Large Resource Groups**
For resource groups with 50+ resources:
- Discovery may take 1-2 minutes
- AI analysis may take 30-60 seconds
- Script generation may take 1-2 minutes

### **Recommendations**
- Use `gpt-4o` for complex resource groups
- Switch to `gpt-4o-mini` for speed (less accuracy)
- Adjust `temperature` in code for more deterministic output

---

## 🎓 **Technical Details**

### **AI Prompts**

The AI Agent uses carefully crafted system prompts:

**For Analysis**:
- Acts as Azure Cloud Architect
- Analyzes dependencies and deployment order
- Provides structured JSON output

**For Script Generation**:
- Acts as Infrastructure-as-Code expert
- Generates production-ready code
- Includes error handling and best practices

**For Chat**:
- Conversational and helpful
- Context-aware based on your resources
- Explains concepts simply

### **API Endpoints**

```
GET  /api/ai-agent/resource-groups     - List resource groups
POST /api/ai-agent/discover            - Discover resources
POST /api/ai-agent/analyze             - AI analysis
POST /api/ai-agent/generate-terraform  - Generate Terraform
POST /api/ai-agent/generate-cli        - Generate Azure CLI
POST /api/ai-agent/estimate-cost       - Cost estimation
POST /api/ai-agent/chat                - Chat with AI
GET  /api/ai-agent/health              - Health check
```

---

## 🌟 **Advanced Features**

### **Custom System Prompts**
Modify `services/aiAgentService.js` to customize AI behavior:

```javascript
getSystemPrompt() {
  return `Your custom instructions here...`;
}
```

### **Model Selection**
Change deployment in `.env`:
```bash
AZURE_OPENAI_AGENT_DEPLOYMENT=gpt-4.1  # Use latest model
AZURE_OPENAI_AGENT_DEPLOYMENT=gpt-4o-mini  # Use faster model
```

### **Temperature Tuning**
Lower temperature = more deterministic (better for code):
```javascript
temperature: 0.2  // For script generation
temperature: 0.7  // For chat conversations
```

---

## 📈 **Future Enhancements**

Planned features:
- [ ] Real-time deployment from UI
- [ ] Resource comparison and diff
- [ ] Multi-region cloning
- [ ] Automated secret migration via Key Vault
- [ ] Scheduled cloning (cron jobs)
- [ ] Resource modification (not just cloning)
- [ ] Cost optimization suggestions during cloning
- [ ] Integration with Azure DevOps/GitHub Actions

---

## 🎉 **Summary**

The AI Agent is a powerful tool that:
✅ Discovers all resources in a resource group  
✅ Analyzes configurations intelligently  
✅ Generates production-ready scripts  
✅ Estimates costs accurately  
✅ Provides interactive AI guidance  
✅ Saves hours of manual work  
✅ Reduces human error  
✅ Makes Azure resource management easy  

**Powered by Azure OpenAI GPT-4o for the best intelligence and accuracy!**

---

## 📞 **Support**

For issues or questions:
1. Check backend logs: `npm start` output
2. Check browser console: F12 Developer Tools
3. Review API responses in Network tab
4. Verify Azure OpenAI credentials

---

**Last Updated**: November 9, 2025  
**Version**: 1.0.0  
**Powered by**: Azure OpenAI GPT-4o 🚀

