# 🔄 Switching Between Azure Environments

This guide explains how to use the Azure AI Assistant with multiple Azure subscriptions/accounts without impacting your existing setup.

## Quick Start

### Option 1: Use the Environment Switcher Script (Recommended)
```bash
./switch-azure-env.sh
```

This interactive script will:
1. Backup your current .env file
2. Help you configure the new environment
3. Fix Azure permissions automatically
4. Test the connection

### Option 2: Manual Configuration

1. **Backup your current .env file:**
```bash
cp .env .env.backup.personal
```

2. **Update .env with the new environment:**
```bash
nano .env
```

Update these values:
```env
AZURE_TENANT_ID=a8f047ad-e0cb-4b81-badd-4556c4cd71f4
AZURE_CLIENT_ID=1f16c4c4-8c61-4083-bda0-b5cd4f847dff
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL
AZURE_SUBSCRIPTION_ID=your-subscription-id-here
```

3. **Fix Azure permissions:**
```bash
./fix-azure-permissions.sh
```

4. **Restart your application:**
```bash
npm run dev
```

---

## Using Azure-Central-AI-Hub Environment

### Service Principal Details

From your screenshot:
- **Display Name**: Azure-Central-AI-Hub
- **Client ID**: `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`
- **Tenant ID**: `a8f047ad-e0cb-4b81-badd-4556c4cd71f4`
- **Client Secret**: (Get from Azure Portal - Certificates & secrets)

### Required Steps

1. **Get your Subscription ID:**
```bash
az login
az account list --output table
```

Copy the Subscription ID for the account you want to use.

2. **Update .env file:**
```bash
# Use the switcher script
./switch-azure-env.sh

# Or manually edit .env
nano .env
```

3. **Assign Required Roles:**

You need to assign these roles to the service principal in your subscription:

```bash
# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Assign Reader role
az role assignment create \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --role "Reader" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"

# Assign Cost Management Reader role
az role assignment create \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --role "Cost Management Reader" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

**Or use the automated script:**
```bash
./fix-azure-permissions.sh
```

4. **Verify Permissions:**
```bash
curl http://localhost:5000/api/azure/validate-permissions | jq
```

---

## Switching Between Environments

### Method 1: Swap .env Files
```bash
# Save current environment
cp .env .env.azure-central

# Restore personal environment
cp .env.backup.personal .env

# Restart server
npm run dev
```

### Method 2: Use the Switcher Script
```bash
./switch-azure-env.sh
```

Select the environment you want to use.

### Method 3: Manual Edit
```bash
# Edit .env directly
nano .env

# Update the Azure credentials
# Restart the server
npm run dev
```

---

## Important Notes

### 1. **Permissions are Subscription-Specific**

Each Azure subscription requires its own role assignments. The service principal must have:
- **Reader** role
- **Cost Management Reader** role

These must be assigned in **each subscription** where you want to use the application.

### 2. **No Impact on Existing Setup**

The application works with whatever credentials are in the `.env` file. By backing up and swapping `.env` files, you can switch between environments without any conflicts.

### 3. **Multiple .env Files Strategy**

Create separate .env files for each environment:
```bash
.env.personal           # Your personal account
.env.azure-central      # Azure-Central-AI-Hub account
.env.production         # Production environment
```

Then copy the one you want to use:
```bash
cp .env.azure-central .env
npm run dev
```

### 4. **Application Restart Required**

After changing the `.env` file, you must restart the application for changes to take effect:
```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

---

## Troubleshooting

### 403 Authorization Errors

If you see authorization errors after switching environments:

1. **Check the service principal has roles assigned:**
```bash
az role assignment list \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

2. **Run the fix script:**
```bash
./fix-azure-permissions.sh
```

3. **Wait for propagation:**
Role assignments can take 5-10 minutes to propagate. Wait and retry.

4. **Verify your subscription ID:**
Ensure the subscription ID in `.env` matches the one you assigned roles in.

### Credentials Not Working

1. **Verify the service principal exists:**
```bash
az ad sp show --id "1f16c4c4-8c61-4083-bda0-b5cd4f847dff"
```

2. **Test authentication:**
```bash
az login --service-principal \
  --username "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --password "YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL" \
  --tenant "a8f047ad-e0cb-4b81-badd-4556c4cd71f4"
```

3. **Check client secret expiration:**
Client secrets expire. Generate a new one if needed.

### Permission to Assign Roles

To assign roles to a service principal, you need:
- **Owner** role on the subscription, OR
- **User Access Administrator** role on the subscription

If you don't have these permissions, contact your subscription administrator.

---

## Complete Workflow Example

### Switching to Azure-Central-AI-Hub:

```bash
# 1. Backup current environment
cp .env .env.backup.$(date +%s)

# 2. Update credentials
cat > .env << 'EOF'
AZURE_TENANT_ID=a8f047ad-e0cb-4b81-badd-4556c4cd71f4
AZURE_CLIENT_ID=1f16c4c4-8c61-4083-bda0-b5cd4f847dff
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL
AZURE_SUBSCRIPTION_ID=YOUR_SUBSCRIPTION_ID_HERE

# Keep existing OpenAI and app settings
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
AZURE_OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL

PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF

# 3. Fix permissions
./fix-azure-permissions.sh

# 4. Restart server
npm run dev

# 5. Test
curl http://localhost:5000/api/health
curl http://localhost:5000/api/azure/validate-permissions
```

### Switching Back to Personal Account:

```bash
# 1. Restore backup
cp .env.backup.personal .env

# 2. Restart server
npm run dev
```

---

## Security Best Practices

1. **Never commit .env files** - They're already in .gitignore
2. **Rotate client secrets regularly** - Generate new secrets every 90-180 days
3. **Use least privilege** - Only assign roles that are needed
4. **Keep backups** - Save .env files securely for each environment
5. **Monitor role assignments** - Regularly audit who has access

---

## Summary

To use the Azure-Central-AI-Hub service principal:

1. ✅ **Backup current .env**: `cp .env .env.backup.personal`
2. ✅ **Update credentials** in .env with Azure-Central-AI-Hub details
3. ✅ **Get your subscription ID**: `az account list`
4. ✅ **Assign roles**: `./fix-azure-permissions.sh`
5. ✅ **Restart app**: `npm run dev`
6. ✅ **Test**: `curl http://localhost:5000/api/azure/validate-permissions`

To switch back: `cp .env.backup.personal .env && npm run dev`

---

**Need help?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

