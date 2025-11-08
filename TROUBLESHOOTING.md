# 🔧 Troubleshooting Guide - Azure AI Assistant

## Common Issues and Solutions

### 1. Authorization Failed (403) Errors

#### Problem
You see errors like:
```
AuthorizationFailed: The client 'xxx' does not have authorization to perform action 'Microsoft.Resources/subscriptions/read' over scope '/subscriptions/xxx'
```

#### Root Cause
The service principal (Azure AD application) doesn't have the required Azure RBAC (Role-Based Access Control) permissions assigned to the subscription.

#### Solution

**Option 1: Use the Fix Script (Recommended)**
```bash
./fix-azure-permissions.sh
```

This script will:
- Check current role assignments
- Assign missing roles automatically
- Verify all required roles are assigned

**Option 2: Manual Fix via Azure CLI**

1. Ensure you're logged in with an account that has "Owner" or "User Access Administrator" role:
```bash
az login
az account show
```

2. Assign the required roles:
```bash
# Get your Client ID and Subscription ID from .env file
CLIENT_ID="your-client-id"
SUBSCRIPTION_ID="your-subscription-id"

# Assign Reader role (for subscription and resource access)
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Assign Cost Management Reader role (for cost data access)
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "Cost Management Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

**Option 3: Manual Fix via Azure Portal**

1. Go to Azure Portal → Subscriptions → Your Subscription → Access control (IAM)
2. Click "Add" → "Add role assignment"
3. Select "Reader" role
4. Assign access to "User, group, or service principal"
5. Search for your service principal (Client ID) and select it
6. Click "Save"
7. Repeat steps 2-6 for "Cost Management Reader" role

#### Required Azure RBAC Roles

| Role | Purpose | Required Actions |
|------|---------|------------------|
| **Reader** | Read subscription and resource data | `Microsoft.Resources/subscriptions/read`<br>`Microsoft.Resources/subscriptions/resources/read`<br>`Microsoft.Resources/subscriptions/resourceGroups/read` |
| **Cost Management Reader** | Read cost and billing data | `Microsoft.CostManagement/Query/read` |

#### Verify Permissions

After assigning roles, verify they're working:

1. **Using the API endpoint:**
```bash
curl http://localhost:5000/api/azure/validate-permissions
```

2. **Using Azure CLI:**
```bash
az role assignment list \
  --assignee "YOUR_CLIENT_ID" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID" \
  --output table
```

#### Important Notes

- **Role Propagation**: Role assignments can take 5-10 minutes to propagate. Wait a few minutes after assigning roles before testing.
- **Permissions Required**: You need "Owner" or "User Access Administrator" role on the subscription to assign roles to service principals.
- **Different Subscriptions**: If you're using a different Azure account/subscription, you need to assign roles in that subscription as well.

---

### 2. Azure Service Not Initialized

#### Problem
```
⚠️ Azure credentials not configured, using mock data mode
```

#### Solution

1. **Check your .env file exists and has all required variables:**
```bash
cat .env
```

Required variables:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_SUBSCRIPTION_ID`

2. **Verify credentials are correct:**
```bash
# Test authentication
az login --service-principal \
  --username "$AZURE_CLIENT_ID" \
  --password "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID"
```

3. **Check service principal exists:**
```bash
az ad sp show --id "$AZURE_CLIENT_ID"
```

---

### 3. Cost Management API Returns 403

#### Problem
```
AuthorizationFailed: does not have authorization to perform action 'Microsoft.CostManagement/Query/read'
```

#### Solution

This specific error means the "Cost Management Reader" role is missing:

```bash
az role assignment create \
  --assignee "$AZURE_CLIENT_ID" \
  --role "Cost Management Reader" \
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID"
```

**Note**: Cost Management Reader role is separate from Reader role and must be assigned explicitly.

---

### 4. Different Azure Account/Subscription Issues

#### Problem
The application works with your personal account but fails with a different Azure account.

#### Solution

1. **Check which subscription the service principal has access to:**
```bash
az role assignment list \
  --assignee "$AZURE_CLIENT_ID" \
  --all \
  --output table
```

2. **Verify the subscription ID in .env matches the account you're using:**
```bash
# List all subscriptions
az account list --output table

# Set the correct subscription
az account set --subscription "SUBSCRIPTION_ID"
```

3. **Assign roles in the correct subscription:**
```bash
# Make sure you're using the right subscription
az account show

# Assign roles
./fix-azure-permissions.sh
```

---

### 5. Service Principal Not Found

#### Problem
```
Service principal not found or invalid
```

#### Solution

1. **Verify the service principal exists:**
```bash
az ad sp show --id "$AZURE_CLIENT_ID"
```

2. **If it doesn't exist, create a new one:**
```bash
az ad sp create-for-rbac \
  --name "azure-ai-assistant" \
  --role "Reader" \
  --scopes "/subscriptions/$AZURE_SUBSCRIPTION_ID" \
  --sdk-auth
```

3. **Update your .env file with the new credentials**

---

### 6. Rate Limiting (429 Errors)

#### Problem
```
Rate limit exceeded
```

#### Solution

The application already handles rate limiting with automatic retries. If you see this frequently:

1. **Reduce request frequency** - The app throttles requests to 200ms intervals
2. **Check Azure subscription limits** - Some subscriptions have lower rate limits
3. **Wait and retry** - Rate limits are temporary

---

## Quick Diagnostic Commands

### Check Service Principal Status
```bash
# Check if service principal exists
az ad sp show --id "$AZURE_CLIENT_ID"

# List all role assignments
az role assignment list \
  --assignee "$AZURE_CLIENT_ID" \
  --all \
  --output table
```

### Test Authentication
```bash
# Test service principal authentication
az login --service-principal \
  --username "$AZURE_CLIENT_ID" \
  --password "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID"

# Verify access
az account show
az account list-locations
```

### Validate Permissions via API
```bash
# Check permissions endpoint
curl http://localhost:5000/api/azure/validate-permissions | jq

# Check health endpoint
curl http://localhost:5000/api/health | jq
```

### Check Application Logs
```bash
# Backend logs will show detailed error messages
npm run dev

# Look for:
# - 🔒 AUTHORIZATION FAILED (403)
# - Required Action and Role information
# - Fix commands
```

---

## Best Practices

1. **Always assign both roles**: Reader + Cost Management Reader
2. **Use the fix script**: `./fix-azure-permissions.sh` handles everything automatically
3. **Verify after changes**: Use the validate-permissions endpoint to check
4. **Check logs**: The application provides detailed error messages with fix commands
5. **Wait for propagation**: Role assignments can take 5-10 minutes to take effect

---

## Getting Help

If you're still experiencing issues:

1. **Check the application logs** for detailed error messages
2. **Run the validation endpoint**: `GET /api/azure/validate-permissions`
3. **Verify your Azure CLI access**: `az account show`
4. **Check service principal permissions**: `az role assignment list --assignee "$AZURE_CLIENT_ID"`

The application now provides clear error messages with specific fix commands when authorization fails. Look for the `🔒 AUTHORIZATION FAILED` messages in the logs.

---

## Required Permissions Summary

| What You Need | Why | How to Fix |
|--------------|-----|------------|
| **Reader** role | Read subscription, resources, resource groups | `az role assignment create --assignee "$CLIENT_ID" --role "Reader" --scope "/subscriptions/$SUBSCRIPTION_ID"` |
| **Cost Management Reader** role | Read cost and billing data | `az role assignment create --assignee "$CLIENT_ID" --role "Cost Management Reader" --scope "/subscriptions/$SUBSCRIPTION_ID"` |
| **Owner** or **User Access Administrator** (for you) | To assign roles to service principal | Contact subscription administrator |

---

**Remember**: The fix script (`./fix-azure-permissions.sh`) automates all of this for you!

