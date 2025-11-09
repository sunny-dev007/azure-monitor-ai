# 🚀 Quick Start: Azure-Central-AI-Hub Environment

## For Using Azure-Central-AI-Hub Service Principal

### Step 1: Backup Your Current Configuration
```bash
cd /Users/sunny.kushwaha/projects/Personal/Azure-Monitor-AI-Assistant

# Backup your current .env file
cp .env .env.backup.personal.$(date +%Y%m%d)

# List backups to confirm
ls -la .env.backup.*
```

### Step 2: Get Your Subscription ID

You need to know which Azure subscription you want to use with this application.

**Option A: Using Azure Portal**
1. Go to https://portal.azure.com
2. Search for "Subscriptions"
3. Find your subscription and copy the Subscription ID

**Option B: Using Azure CLI**
```bash
# Login to Azure
az login

# List all subscriptions
az account list --output table

# Copy the Subscription ID for the subscription you want to use
```

### Step 3: Update .env File with New Credentials

**IMPORTANT**: You need your **Subscription ID** before proceeding.

Edit your .env file:
```bash
nano .env
```

Update ONLY these lines (keep everything else the same):
```env
AZURE_TENANT_ID=a8f047ad-e0cb-4b81-badd-4556c4cd71f4
AZURE_CLIENT_ID=1f16c4c4-8c61-4083-bda0-b5cd4f847dff
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL
AZURE_SUBSCRIPTION_ID=PUT_YOUR_SUBSCRIPTION_ID_HERE
```

**Keep all other settings unchanged** (OpenAI endpoint, API keys, PORT, etc.)

Save the file: `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Assign Azure Permissions

This is the **most important step** to fix the 403 authorization errors.

```bash
# Run the automated permission fix script
./fix-azure-permissions.sh
```

The script will:
- ✅ Check your Azure CLI login
- ✅ Load your new credentials from .env
- ✅ Assign "Reader" role to the service principal
- ✅ Assign "Cost Management Reader" role to the service principal
- ✅ Verify all roles are assigned correctly

**Important Notes:**
- You must be logged in with an account that has **Owner** or **User Access Administrator** role on the subscription
- Role assignments can take 5-10 minutes to propagate

### Step 5: Restart the Application

```bash
# If the server is running, stop it (Ctrl+C)

# Start the backend
npm run dev
```

In another terminal:
```bash
# Start the frontend
cd client
npm start
```

### Step 6: Verify Everything Works

**Test 1: Health Check**
```bash
curl http://localhost:5000/api/health | jq
```

Expected output:
```json
{
  "status": "healthy",
  "services": {
    "azure": "ready",
    "ai": "ready"
  }
}
```

**Test 2: Permission Validation**
```bash
curl http://localhost:5000/api/azure/validate-permissions | jq
```

Expected output:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "clientId": "1f16c4c4-8c61-4083-bda0-b5cd4f847dff",
    "validationResults": [
      {
        "role": "Reader",
        "status": "valid"
      },
      {
        "role": "Cost Management Reader",
        "status": "valid"
      }
    ]
  }
}
```

**Test 3: Access the Frontend**
Open your browser: http://localhost:3000

You should see:
- ✅ Dashboard loads without errors
- ✅ Resources are displayed
- ✅ Costs are shown
- ✅ No 403 errors in the console

---

## Switching Back to Your Personal Account

When you want to switch back to your personal account:

```bash
# Stop the application (Ctrl+C in both terminals)

# Restore your original .env
cp .env.backup.personal.20250109 .env

# Restart the application
npm run dev
cd client && npm start
```

**That's it!** Your personal account setup is restored.

---

## Troubleshooting

### ❌ "403 Authorization Failed" Errors

**Cause**: Service principal doesn't have required roles in the subscription.

**Solution**:
```bash
# Make sure you're logged in with the right account
az login
az account show

# Set the correct subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Run the fix script again
./fix-azure-permissions.sh

# Wait 5-10 minutes for propagation, then restart the app
```

### ❌ "Azure service not initialized"

**Cause**: Missing or incorrect credentials in .env file.

**Solution**:
```bash
# Check your .env file
cat .env | grep AZURE_

# Make sure all four values are set:
# - AZURE_TENANT_ID
# - AZURE_CLIENT_ID
# - AZURE_CLIENT_SECRET
# - AZURE_SUBSCRIPTION_ID
```

### ❌ "Permission denied to assign roles"

**Cause**: You don't have Owner or User Access Administrator role on the subscription.

**Solution**:
Contact your Azure subscription administrator and ask them to:
1. Assign "Reader" role to service principal `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`
2. Assign "Cost Management Reader" role to service principal `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`

Or share this command with them:
```bash
# Reader role
az role assignment create \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --role "Reader" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"

# Cost Management Reader role
az role assignment create \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --role "Cost Management Reader" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

---

## Summary Checklist

- [ ] Backup current .env file
- [ ] Get subscription ID from Azure Portal or CLI
- [ ] Update .env with new credentials
- [ ] Run `./fix-azure-permissions.sh`
- [ ] Wait 5-10 minutes for role propagation
- [ ] Restart the application
- [ ] Test with `curl http://localhost:5000/api/azure/validate-permissions`
- [ ] Access frontend at http://localhost:3000
- [ ] Verify no 403 errors

---

## Your Environment Details

**Service Principal**: Azure-Central-AI-Hub
- **Application (client) ID**: `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`
- **Directory (tenant) ID**: `a8f047ad-e0cb-4b81-badd-4556c4cd71f4`
- **Object ID**: `7219135a-05e0-48d0-95f5-4997300c6bb3`
- **Client Secret**: (Get from Azure Portal - Certificates & secrets)

**Required Subscription ID**: You need to provide this

**Required Roles** (in your subscription):
- Reader
- Cost Management Reader

---

## Need More Help?

- **Detailed Guide**: See [ENVIRONMENT-SWITCHING.md](ENVIRONMENT-SWITCHING.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Permission Issues**: Run `./fix-azure-permissions.sh`

---

**Ready?** Start with Step 1 above! 🚀

