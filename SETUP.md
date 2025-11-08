# 🚀 Quick Setup Guide - Azure AI Assistant

## ⚡ Get Started in 5 Minutes

### 1. **Prerequisites Check**
```bash
# Ensure you have Node.js 18+ installed
node --version

# Ensure you have Azure CLI installed and logged in
az --version
az account show
```

### 2. **Install Dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 3. **Azure Setup (Automated)**
```bash
# Run the automated setup script
./setup-azure.sh
```

**OR** manually configure Azure:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "azure-ai-assistant" \
  --role "Reader" \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID" \
  --sdk-auth

# Enable required providers
az provider register --namespace Microsoft.ResourceGraph
az provider register --namespace Microsoft.CostManagement
az provider register --namespace Microsoft.Advisor

# Create Azure OpenAI resource (if needed)
az cognitiveservices account create \
  --name "your-openai-resource" \
  --resource-group "your-rg" \
  --location "eastus" \
  --kind "OpenAI" \
  --sku "S0"
```

### 4. **Environment Configuration**
```bash
# Copy and edit environment file
cp env.example .env

# Edit .env with your Azure credentials
nano .env
```

**Required variables:**
```env
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
AZURE_OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

### 5. **Start the Application**
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd client && npm start
```

**Access the application:**
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:5000
- 📊 **Health Check**: http://localhost:5000/api/health

## 🎯 Demo Features

### **AI Chat Assistant**
- Ask questions about your Azure environment
- Get cost optimization recommendations
- Understand resource utilization
- Receive personalized advice

### **Resource Management**
- View all Azure resources
- Filter by type, location, resource group
- Resource details and metrics
- Performance monitoring

### **Cost Analysis**
- Monthly spending tracking
- Cost trends and patterns
- Resource cost breakdown
- Optimization suggestions

### **Dashboard Overview**
- Key metrics and resource counts
- Cost trends visualization
- AI-generated insights
- Quick access to all features

## 🔧 Troubleshooting

### **Common Issues**

1. **Azure Connection Failed**
   ```bash
   # Check credentials
   az account show
   
   # Verify service principal permissions
   az role assignment list --assignee YOUR_CLIENT_ID
   ```

2. **OpenAI Not Working**
   ```bash
   # Check OpenAI resource status
   az cognitiveservices account show \
     --name "your-openai-resource" \
     --resource-group "your-rg"
   ```

3. **Port Already in Use**
   ```bash
   # Change port in .env
   PORT=5001
   
   # Or kill existing process
   lsof -ti:5000 | xargs kill -9
   ```

### **Logs and Debugging**
```bash
# Backend logs
npm run dev

# Frontend logs
cd client && npm start

# Check API endpoints
curl http://localhost:5000/api/health
```

## 📱 Usage Examples

### **Sample Questions for AI Chat**
- "What are my top 5 most expensive resources?"
- "How can I reduce my monthly Azure costs?"
- "Show me all VMs with low CPU utilization"
- "What are the latest Azure Advisor recommendations?"
- "Give me a cost summary for this quarter"

### **Dashboard Features**
- Resource inventory overview
- Cost trend analysis
- Performance metrics
- Optimization insights

## 🚀 Next Steps

1. **Customize the UI** - Modify colors, layout, and branding
2. **Add More Azure Services** - Integrate additional Azure APIs
3. **Implement Authentication** - Add user login and role-based access
4. **Deploy to Azure** - Use Azure App Service or AKS
5. **Add Monitoring** - Integrate with Azure Monitor and Application Insights

## 📞 Support

- **Documentation**: Check README.md for detailed information
- **Issues**: Report bugs via GitHub Issues
- **Questions**: Use the AI chat assistant in the application

---

**🎉 You're all set! Start exploring your Azure environment with AI-powered insights.**
