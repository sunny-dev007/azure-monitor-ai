# ⚡ Azure Monitor AI Assistant - Quick Reference Guide

## 🚀 Quick Start

### Start the Application

```bash
# Backend (Terminal 1)
cd /path/to/project
npm start

# Frontend (Terminal 2)
cd /path/to/project/client
npm start
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🔑 Azure RBAC Roles Quick Reference

| Role | Purpose | Assignment Command |
|------|---------|-------------------|
| **Reader** | Read resources | `az role assignment create --assignee CLIENT_ID --role "Reader" --scope "/subscriptions/SUBSCRIPTION_ID"` |
| **Cost Management Reader** | Access cost data | `az role assignment create --assignee CLIENT_ID --role "Cost Management Reader" --scope "/subscriptions/SUBSCRIPTION_ID"` |
| **Monitoring Reader** | Access metrics | `az role assignment create --assignee CLIENT_ID --role "Monitoring Reader" --scope "/subscriptions/SUBSCRIPTION_ID"` |
| **Contributor** | Create/modify resources | `az role assignment create --assignee CLIENT_ID --role "Contributor" --scope "/subscriptions/SUBSCRIPTION_ID"` |

### One-Command Role Assignment (All at Once)

```bash
# Set variables
CLIENT_ID="your-client-id"
SUBSCRIPTION_ID="your-subscription-id"

# Assign all roles
az role assignment create --assignee "$CLIENT_ID" --role "Reader" --scope "/subscriptions/$SUBSCRIPTION_ID" && \
az role assignment create --assignee "$CLIENT_ID" --role "Cost Management Reader" --scope "/subscriptions/$SUBSCRIPTION_ID" && \
az role assignment create --assignee "$CLIENT_ID" --role "Monitoring Reader" --scope "/subscriptions/$SUBSCRIPTION_ID" && \
az role assignment create --assignee "$CLIENT_ID" --role "Contributor" --scope "/subscriptions/$SUBSCRIPTION_ID"
```

### Verify Role Assignments

```bash
az role assignment list --assignee CLIENT_ID --subscription SUBSCRIPTION_ID --output table
```

---

## 🤖 AI Agent Workflow

### Standard Resource Cloning Flow

1. **Select Source Resource Group**
   - Navigate to AI Agent page
   - Choose source resource group from dropdown
   - Enter target resource group name

2. **Discover Resources**
   - Click "Discover Resources"
   - Review discovered resources (types, locations, SKUs)

3. **Analyze with AI**
   - Click "Analyze with AI"
   - Review AI analysis (dependencies, warnings, cost estimate)

4. **Generate Script**
   - Click "Generate Azure CLI" or "Generate Terraform"
   - Review generated script

5. **Execute Script**
   - Click "Execute Now"
   - Monitor real-time progress in execution modal
   - Verify resources in Azure Portal

### AI Chat Quick Commands

**Cost Analysis:**
```
How can I reduce costs for my resources?
What are my most expensive resources?
Estimate costs for cloning production to staging
```

**Resource Questions:**
```
What resources are in the demoai resource group?
Explain the dependencies in my infrastructure
What security improvements do you recommend?
```

**Troubleshooting:**
```
Why did my script execution fail?
How do I fix authorization errors?
What's the best way to clone a resource group?
```

---

## 🌐 Environment Switcher Quick Reference

### Switch to Saved Environment

1. Navigate to **Environment Switcher**
2. Select environment from **Saved Environments** tab
3. Enter **Client Secret** when prompted
4. Click **"Switch to this Environment"**
5. Monitor progress in **Progress** tab
6. Click **"Assign Azure Permissions"** if needed
7. Wait 5-10 minutes for role propagation
8. Restart backend server

### Configure Custom Environment

1. Navigate to **Environment Switcher**
2. Click **"Custom Environment"** tab
3. Fill in credentials:
   - Environment Name (optional)
   - Tenant ID
   - Client ID
   - Client Secret
   - Subscription ID
4. Click **"Validate Credentials"** (recommended first)
5. If valid, click **"Switch Environment"**
6. Monitor progress and assign permissions
7. Restart backend server

### Validation Steps (Automatic)

✅ Azure CLI installation check  
✅ Service principal authentication  
✅ Subscription access verification  
✅ Current role assignments check  
✅ Missing permissions identification

---

## 🐛 Troubleshooting Quick Fixes

### Problem: "AuthorizationFailed" 403 Errors

**Quick Fix:**
```bash
# Load environment variables
source .env  # or export variables manually

# Check current roles
az role assignment list --assignee "$AZURE_CLIENT_ID" --subscription "$AZURE_SUBSCRIPTION_ID" --output table

# Assign missing roles (run as user with Owner permissions)
./fix-azure-permissions.sh
```

### Problem: "Azure OpenAI client not initialized"

**Quick Fix:**
1. Edit `.env` file
2. Add these lines:
   ```env
   AZURE_OPENAI_AGENT_ENDPOINT=https://your-openai.openai.azure.com/
   AZURE_OPENAI_AGENT_KEY=your-key-here
   AZURE_OPENAI_AGENT_DEPLOYMENT=gpt-4o
   ```
3. Restart backend server
4. Check logs for: "✅ AI Agent Service initialized with Azure OpenAI"

### Problem: Script Execution Fails with Syntax Errors

**Quick Fix:**
1. Review generated script manually
2. Look for prose or markdown formatting
3. Report pattern to team (we'll improve cleaning)
4. Manually clean script and execute in terminal:
   ```bash
   az login --service-principal \
     --username "$AZURE_CLIENT_ID" \
     --password "$AZURE_CLIENT_SECRET" \
     --tenant "$AZURE_TENANT_ID"
   
   # Run cleaned script
   bash your-script.sh
   ```

### Problem: Environment Switching Stuck

**Quick Fix:**
1. Wait for 90-second client-side timeout
2. Click "Try Again" button
3. If still stuck:
   - Verify credentials in Azure Portal
   - Check Azure CLI installation: `az --version`
   - Test manual login:
     ```bash
     az login --service-principal \
       --username CLIENT_ID \
       --password CLIENT_SECRET \
       --tenant TENANT_ID
     ```

### Problem: Backend Server Won't Start (Port in Use)

**Quick Fix:**
```bash
# Kill all node processes
pkill -9 -f "node.*server.js"

# Wait 3 seconds
sleep 3

# Start fresh
npm start
```

### Problem: Frontend Not Connecting to Backend

**Quick Fix:**
1. Verify backend is running on port 5000: `curl http://localhost:5000/api/health`
2. Check proxy setting in `client/package.json`:
   ```json
   "proxy": "http://localhost:5000"
   ```
3. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

## 📡 API Testing with cURL

### Check Backend Health

```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "azure": "initialized",
  "timestamp": "2025-11-10T12:34:56.789Z"
}
```

### Get Subscription Summary

```bash
curl http://localhost:5000/api/azure/summary
```

### Validate Permissions

```bash
curl http://localhost:5000/api/azure/validate-permissions
```

### List Resource Groups (AI Agent)

```bash
curl http://localhost:5000/api/ai-agent/resource-groups
```

### Discover Resources

```bash
curl -X POST http://localhost:5000/api/ai-agent/discover \
  -H "Content-Type: application/json" \
  -d '{
    "resourceGroupName": "demoai",
    "targetResourceGroupName": "demoai-clone"
  }'
```

### Chat with AI

```bash
curl -X POST http://localhost:5000/api/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How can I reduce Azure costs?"}
    ],
    "context": {}
  }'
```

---

## 🔧 Common Azure CLI Commands

### Authentication

```bash
# Login with service principal
az login --service-principal \
  --username "$AZURE_CLIENT_ID" \
  --password "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID"

# Show current account
az account show

# Set subscription
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# Get access token
az account get-access-token

# Logout
az logout
```

### Role Management

```bash
# List all role assignments for service principal
az role assignment list \
  --assignee "$AZURE_CLIENT_ID" \
  --all \
  --output table

# List role assignments for specific subscription
az role assignment list \
  --assignee "$AZURE_CLIENT_ID" \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --output table

# Create role assignment
az role assignment create \
  --assignee "$AZURE_CLIENT_ID" \
  --role "Reader" \
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID"

# Delete role assignment
az role assignment delete \
  --assignee "$AZURE_CLIENT_ID" \
  --role "Reader" \
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID"
```

### Resource Management

```bash
# List resource groups
az group list --output table

# Show specific resource group
az group show --name RESOURCE_GROUP_NAME

# List resources in resource group
az resource list --resource-group RESOURCE_GROUP_NAME --output table

# Get resource details
az resource show --ids RESOURCE_ID

# Create resource group
az group create --name NEW_RG_NAME --location eastus

# Delete resource group
az group delete --name RG_NAME --yes --no-wait
```

---

## 🎨 Frontend Component Quick Reference

### Key React Components

| Component | Path | Purpose |
|-----------|------|---------|
| **Dashboard** | `client/src/pages/Dashboard.js` | Main overview page |
| **AIAgent** | `client/src/pages/AIAgent.js` | Resource cloning interface |
| **EnvironmentSwitcher** | `client/src/pages/EnvironmentSwitcher.js` | Environment management |
| **Chat** | `client/src/pages/Chat.js` | AI chat assistant |
| **Resources** | `client/src/pages/Resources.js` | Resource listing |
| **Costs** | `client/src/pages/Costs.js` | Cost analysis |
| **Recommendations** | `client/src/pages/Recommendations.js` | Azure Advisor recommendations |

### React Query Cache Keys

```javascript
// Subscription summary
['azure', 'summary']

// Resource groups
['azure', 'resource-groups']

// Resources
['azure', 'resources']

// Costs
['azure', 'costs', { startDate, endDate }]

// Recommendations
['azure', 'recommendations']

// AI Agent resource groups
['ai-agent', 'resource-groups']

// Current environment
['environment', 'current']
```

---

## 🐳 Docker Commands (For Future Containerization)

### Build Docker Image

```bash
# Build backend + frontend combined image
docker build -t azure-ai-assistant:latest .

# Build backend only
docker build -f Dockerfile.backend -t azure-ai-assistant-backend:latest .

# Build frontend only
docker build -f Dockerfile.frontend -t azure-ai-assistant-frontend:latest .
```

### Run Docker Container

```bash
# Run with environment file
docker run -d \
  --name azure-ai-assistant \
  --env-file .env \
  -p 5000:5000 \
  -p 3000:3000 \
  azure-ai-assistant:latest

# Run with individual environment variables
docker run -d \
  --name azure-ai-assistant \
  -e AZURE_TENANT_ID="your-tenant-id" \
  -e AZURE_CLIENT_ID="your-client-id" \
  -e AZURE_CLIENT_SECRET="your-client-secret" \
  -e AZURE_SUBSCRIPTION_ID="your-subscription-id" \
  -p 5000:5000 \
  azure-ai-assistant:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

---

## 📊 Performance Monitoring

### Check Backend Performance

```bash
# Response time for subscription summary
time curl http://localhost:5000/api/azure/summary

# Response time for resource listing
time curl http://localhost:5000/api/azure/resources

# Check memory usage
ps aux | grep "node.*server.js"
```

### Check Frontend Performance

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to **Performance** tab
3. Click **Record**
4. Perform action (navigate, click, etc.)
5. Stop recording
6. Review metrics: FCP, LCP, TTI, TBT, CLS

**Lighthouse:**
1. Open DevTools (F12)
2. Go to **Lighthouse** tab
3. Select **Performance**
4. Click **Analyze page load**
5. Review scores and recommendations

---

## 🔐 Security Checklist

### Before Production Deployment

- [ ] All secrets in Azure Key Vault (not .env)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS restricted to production domain
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet.js)
- [ ] Input validation on all endpoints
- [ ] Error messages sanitized (no stack traces)
- [ ] Logging configured (no sensitive data logged)
- [ ] Azure AD authentication enabled
- [ ] RBAC for application users
- [ ] Automated backups configured
- [ ] Disaster recovery plan documented
- [ ] Security audit completed
- [ ] Penetration testing performed

### Environment Variables Security

```bash
# Set restrictive file permissions on .env
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (read/write for owner only)

# Never commit .env to git
echo ".env" >> .gitignore

# Use environment-specific files
.env.development
.env.staging
.env.production
```

---

## 📈 Monitoring & Alerts

### Azure Application Insights Queries (KQL)

**Average Response Time:**
```kusto
requests
| where timestamp > ago(1h)
| summarize avg(duration) by name
| order by avg_duration desc
```

**Error Rate:**
```kusto
requests
| where timestamp > ago(1h)
| summarize 
    total = count(),
    errors = countif(resultCode >= 400)
| extend error_rate = (errors * 100.0) / total
```

**Top 10 Slowest Requests:**
```kusto
requests
| where timestamp > ago(1h)
| top 10 by duration desc
| project timestamp, name, duration, resultCode
```

### Key Metrics to Monitor

- **Availability**: Uptime percentage (target: 99.9%)
- **Response Time**: Average, p95, p99 (target: < 2s)
- **Error Rate**: Percentage of failed requests (target: < 1%)
- **Azure API Rate Limit Hits**: Count of 429 errors (target: 0)
- **AI Agent Success Rate**: Percentage of successful script generations (target: > 95%)
- **Script Execution Success Rate**: Percentage of successful executions (target: > 90%)

---

## 🛠️ Development Tips

### Hot Reload Development

```bash
# Backend with nodemon (auto-restart on file changes)
npm run dev

# Frontend with React hot reload (auto-refresh on file changes)
cd client && npm start
```

### Debugging

**Backend:**
```bash
# Start with Node.js debugger
node --inspect server.js

# Or use VS Code debugger with launch.json
```

**Frontend:**
```javascript
// Add debugger statement
debugger;

// Or use React DevTools browser extension
```

### Linting & Formatting

```bash
# Lint backend code
npm run lint

# Lint frontend code
cd client && npm run lint

# Auto-fix linting issues
npm run lint -- --fix
cd client && npm run lint -- --fix

# Format code with Prettier
npm run format
cd client && npm run format
```

---

## 📝 Useful npm Scripts

### Backend Scripts

```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

### Frontend Scripts

```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject",
  "lint": "eslint src/",
  "format": "prettier --write src/"
}
```

---

## 🔗 Important Documentation Links

### Internal Documentation
- [README.md](./README.md) - Quick start guide
- [TECHNICAL-DOCUMENTATION.md](./TECHNICAL-DOCUMENTATION.md) - Complete technical reference
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [AI-AGENT-DOCUMENTATION.md](./AI-AGENT-DOCUMENTATION.md) - AI Agent feature guide
- [ENVIRONMENT-SWITCHER.md](./ENVIRONMENT-SWITCHER.md) - Environment switcher guide
- [DEVOPS-PRESENTATION-GUIDE.md](./DEVOPS-PRESENTATION-GUIDE.md) - Presentation materials

### External Resources
- [Azure SDK for JavaScript](https://learn.microsoft.com/azure/developer/javascript/)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 💡 Pro Tips

### Tip 1: Quick Backend Restart

```bash
# One-liner to kill and restart backend
pkill -9 -f "node.*server.js" && sleep 3 && npm start &
```

### Tip 2: Test AI Agent Without UI

```bash
# Use cURL to test AI Agent API directly
curl -X POST http://localhost:5000/api/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"context":{}}' \
  | jq
```

### Tip 3: Monitor Real-time Logs

```bash
# Follow backend logs
npm start | tee backend.log

# In another terminal, tail logs
tail -f backend.log
```

### Tip 4: Quick Environment Variable Check

```bash
# Print all Azure-related env vars
env | grep AZURE
```

### Tip 5: Bulk Resource Creation Testing

```bash
# Create test resources for cloning experiments
for i in {1..5}; do
  az storage account create \
    --name "teststorage$RANDOM" \
    --resource-group test-rg \
    --location eastus \
    --sku Standard_LRS
done
```

---

## 🆘 Emergency Contacts

- **Technical Lead**: [Name] - [Email] - [Phone]
- **DevOps Engineer**: [Name] - [Email] - [Phone]
- **Azure Architect**: [Name] - [Email] - [Phone]

### Escalation Path

1. **Level 1**: Check this Quick Reference Guide
2. **Level 2**: Check TROUBLESHOOTING.md
3. **Level 3**: Contact Technical Lead
4. **Level 4**: Open incident ticket
5. **Level 5**: Page on-call engineer

---

**Document Version**: 1.0.0  
**Last Updated**: November 10, 2025  
**Maintained By**: [Your Name]

---

**Print this guide and keep it handy!** 📌

