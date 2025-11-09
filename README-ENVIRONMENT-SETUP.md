# 📋 Complete Setup Guide for Azure-Central-AI-Hub

## Overview

This guide will help you switch from your current Azure environment to the **Azure-Central-AI-Hub** service principal without affecting your existing setup.

## Prerequisites

- [ ] Azure CLI installed (`az --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Access to an Azure subscription
- [ ] Owner or User Access Administrator role on the subscription

## Your Service Principal Details

From the screenshot you provided:

| Property | Value |
|----------|-------|
| **Display Name** | Azure-Central-AI-Hub |
| **Application (client) ID** | `1f16c4c4-8c61-4083-bda0-b5cd4f847dff` |
| **Directory (tenant) ID** | `a8f047ad-e0cb-4b81-badd-4556c4cd71f4` |
| **Object ID** | `7219135a-05e0-48d0-95f5-4997300c6bb3` |
| **Client Secret** | (Get from Azure Portal - Certificates & secrets) |

## 🎯 Goal

Make the application work with your new Azure subscription using the Azure-Central-AI-Hub service principal while keeping your current setup safe.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Prepare Your Workspace

```bash
cd /Users/sunny.kushwaha/projects/Personal/Azure-Monitor-AI-Assistant

# Make sure you have the latest code
git pull origin main

# Backup your current configuration
cp .env .env.backup.personal.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Get Your Subscription ID

**Option A: Azure Portal**
1. Go to https://portal.azure.com
2. Search for "Subscriptions"
3. Copy the Subscription ID

**Option B: Azure CLI**
```bash
az login
az account list --output table
```

Copy the Subscription ID you want to use.

### Step 3: Use the Automated Setup Script

We provide two options:

**Option 1: Interactive Environment Switcher (Recommended)**
```bash
./switch-azure-env.sh
```

This will:
- Backup your current .env
- Update credentials
- Assign Azure permissions
- Test the configuration

**Option 2: Manual Permission Assignment**
```bash
# First, manually update your .env file (see Step 4 below)
# Then run:
./assign-permissions-manual.sh
```

### Step 4: Manual .env Configuration (If Not Using Scripts)

Edit `.env` file:
```bash
nano .env
```

Update these lines:
```env
AZURE_TENANT_ID=a8f047ad-e0cb-4b81-badd-4556c4cd71f4
AZURE_CLIENT_ID=1f16c4c4-8c61-4083-bda0-b5cd4f847dff
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL
AZURE_SUBSCRIPTION_ID=YOUR_SUBSCRIPTION_ID_HERE
```

**Important**: Keep all other settings (OpenAI, PORT, etc.) unchanged.

### Step 5: Assign Azure Permissions

If you didn't use the scripts, manually assign permissions:

```bash
# Login to Azure
az login

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

### Step 6: Restart the Application

```bash
# Stop current server (Ctrl+C)

# Start backend
npm run dev

# In another terminal, start frontend
cd client && npm start
```

### Step 7: Verify It Works

```bash
# Test 1: Health check
curl http://localhost:5000/api/health

# Test 2: Permission validation
curl http://localhost:5000/api/azure/validate-permissions

# Test 3: Get subscription summary
curl http://localhost:5000/api/azure/summary
```

Open browser: http://localhost:3000

You should see:
- ✅ Dashboard loads successfully
- ✅ Azure resources displayed
- ✅ Cost data showing
- ✅ No 403 errors

---

## 🔄 Switching Between Environments

### To Azure-Central-AI-Hub:
```bash
cp .env.azure-central .env
npm run dev
```

### Back to Personal Account:
```bash
cp .env.backup.personal .env
npm run dev
```

---

## 📁 Recommended File Organization

Create separate .env files for each environment:

```bash
# Current/Active configuration
.env

# Backups
.env.backup.personal         # Your personal Azure account
.env.azure-central           # Azure-Central-AI-Hub account
.env.production              # Production environment (if any)
```

Create the Azure-Central-AI-Hub configuration:
```bash
cat > .env.azure-central << 'EOF'
AZURE_TENANT_ID=a8f047ad-e0cb-4b81-badd-4556c4cd71f4
AZURE_CLIENT_ID=1f16c4c4-8c61-4083-bda0-b5cd4f847dff
AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL
AZURE_SUBSCRIPTION_ID=YOUR_SUBSCRIPTION_ID

# Copy your existing OpenAI settings here
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
AZURE_OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] No errors in terminal when starting the server
- [ ] Health check returns "healthy" status
- [ ] Permission validation returns "valid: true"
- [ ] Dashboard loads without errors
- [ ] Resources are displayed
- [ ] Costs are shown
- [ ] Chat functionality works
- [ ] No 403 errors in browser console

---

## 🔧 Troubleshooting

### Problem: 403 Authorization Failed

**Symptoms:**
```
AuthorizationFailed: The client 'xxx' does not have authorization...
```

**Solution:**
1. Wait 5-10 minutes for role propagation
2. Run `./fix-azure-permissions.sh` again
3. Verify roles: `az role assignment list --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff"`
4. Check subscription ID matches in .env

### Problem: "Azure service not initialized"

**Solution:**
1. Check all 4 Azure credentials are in .env
2. Verify tenant ID and client ID are correct
3. Test authentication: `az login --service-principal ...`

### Problem: "Permission denied to assign roles"

**Solution:**
You need Owner or User Access Administrator role. Contact your subscription admin with this:

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

## 📚 Additional Resources

- **Quick Start**: [QUICK-START-NEW-ENVIRONMENT.md](QUICK-START-NEW-ENVIRONMENT.md)
- **Environment Switching**: [ENVIRONMENT-SWITCHING.md](ENVIRONMENT-SWITCHING.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Main README**: [README.md](README.md)

---

## 🛡️ Protecting Your Current Setup

Your current setup is **completely safe** because:

1. ✅ We backup .env before any changes
2. ✅ Only .env file is modified (no code changes)
3. ✅ You can restore instantly: `cp .env.backup.personal .env`
4. ✅ Application works with whatever is in .env
5. ✅ No permanent changes to your system

To restore your original setup at any time:
```bash
cp .env.backup.personal.TIMESTAMP .env
npm run dev
```

---

## 📞 Need Help?

1. **Check Logs**: The application shows detailed error messages
2. **Validate Permissions**: `curl http://localhost:5000/api/azure/validate-permissions`
3. **Run Fix Script**: `./fix-azure-permissions.sh`
4. **Review Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Summary Commands

```bash
# 1. Backup current setup
cp .env .env.backup.personal

# 2. Update .env with new credentials
nano .env

# 3. Assign permissions
./fix-azure-permissions.sh

# 4. Restart app
npm run dev

# 5. Test
curl http://localhost:5000/api/azure/validate-permissions
```

---

**Ready to start?** Follow the Quick Setup above! 🚀

