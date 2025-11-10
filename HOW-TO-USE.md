# 🎯 How to Use the Environment Switcher - Step by Step

## 🚀 Getting Started (First Time Users)

### Step 1: Start the Application

```bash
# Terminal 1 - Start Backend
cd /Users/sunny.kushwaha/projects/Personal/Azure-Monitor-AI-Assistant
npm run server

# Terminal 2 - Start Frontend
cd /Users/sunny.kushwaha/projects/Personal/Azure-Monitor-AI-Assistant/client
npm start
```

**Wait for**:
- Backend: `Server running on http://localhost:5000`
- Frontend: Browser opens to `http://localhost:3000`

### Step 2: Navigate to Environment Switcher

1. Look at the **left sidebar**
2. Find **"Environment Switcher"** (it has a "New" badge!)
3. Click it

You'll see three tabs:
- **Saved Environments** - Previously configured environments
- **Custom Environment** - Set up a new environment
- **Progress** - Watch operations in real-time

---

## 📋 Scenario 1: First Time - Setting Up a New Environment

### What You Need
Gather these from Azure Portal first:

1. **Tenant ID** (Directory ID)
   - Azure Portal → Azure Active Directory → Overview → Tenant ID
   
2. **Client ID** (Application ID)
   - Azure Portal → Azure Active Directory → App registrations → Your App → Overview
   
3. **Client Secret** (Secret Value)
   - Azure Portal → Azure Active Directory → App registrations → Your App → Certificates & secrets → New client secret
   
4. **Subscription ID**
   - Azure Portal → Subscriptions → Your Subscription → Subscription ID

### Steps

1. **Click "Custom Environment" Tab**

2. **Fill in the Form**:
   ```
   Environment Name: Production-Azure-Central
   Tenant ID: a8f047ad-e0cb-4b81-badd-4556c4cd71f4
   Client ID: 1f16c4c4-8c61-4083-bda0-b5cd4f847dff
   Client Secret: [Paste your secret]
   Subscription ID: 5588ec4e-3711-4cd3-a62a-52d031b0a6c8
   ```

3. **Validate First (Recommended)**:
   - Click **"Validate Credentials"** button
   - You'll automatically switch to the **Progress** tab
   - Watch the steps:
     - ✅ Validating Azure CLI installation
     - ✅ Testing service principal authentication
     - ✅ Validating subscription access
     - ✅ Checking current role assignments

4. **Review Validation Results**:
   - If all green ✅: Great! Proceed to switch
   - If some red ❌: Check the error messages and fix credentials
   - If yellow ⚠️: Roles are missing (you'll assign them next)

5. **Switch the Environment**:
   - Go back to **"Custom Environment"** tab
   - Click **"Switch Environment"** button
   - Progress tab shows:
     - ✅ Backing up current environment
     - ✅ Preserving application settings
     - ✅ Creating new environment configuration

6. **Assign Permissions**:
   - Green success box appears: "Environment Switched Successfully!"
   - Click **"Assign Azure Permissions"** button
   - Watch the process:
     - ✅ Logging into Azure CLI
     - ✅ Setting active subscription
     - ✅ Assigning Reader role
     - ✅ Assigning Cost Management Reader role
     - ✅ Verifying role assignments

7. **Complete Setup**:
   - Status shows: **PERMISSIONS_ASSIGNED** ✅
   - Follow the "Next Steps" instructions:
     1. Wait 5-10 minutes for Azure role propagation
     2. Stop backend server (Ctrl+C in Terminal 1)
     3. Restart: `npm run server`
     4. Click **"Refresh Application"** button

8. **Verify New Environment**:
   - Go to **Dashboard**
   - Check that resources from new environment appear
   - Verify subscription information matches

---

## 📋 Scenario 2: Switching Between Known Environments

### Steps

1. **Go to "Saved Environments" Tab**
   - You'll see cards for all previously used environments
   - Current environment has a **blue border**

2. **Select Environment**:
   - Find the environment card you want to switch to
   - Click **"Switch to this Environment"** button

3. **Enter Client Secret**:
   - The form will be pre-filled with Tenant ID, Client ID, and Subscription ID
   - You only need to enter the **Client Secret**
   - (Secrets are not saved for security reasons)

4. **Complete the Switch**:
   - Click **"Switch Environment"**
   - Monitor progress
   - Assign permissions if needed
   - Wait and restart backend

---

## 📋 Scenario 3: Testing Credentials Without Switching

This is useful when you want to verify credentials are correct before committing to a switch.

### Steps

1. **Go to "Custom Environment" Tab**

2. **Enter Credentials**:
   - Fill in all fields

3. **Validate Only**:
   - Click **"Validate Credentials"** button
   - Do NOT click "Switch Environment"

4. **Review Results**:
   - Check the Progress tab
   - If validation succeeds: Credentials are good!
   - If validation fails: Fix the issue before switching

5. **Stop Here or Continue**:
   - If you want to switch: Go back and click "Switch Environment"
   - If testing only: You're done!

---

## 🎯 Understanding the Progress Tab

### Status Colors

| Color | Meaning |
|-------|---------|
| 🔵 Blue | Operation in progress |
| ✅ Green | Successfully completed |
| ❌ Red | Failed with error |
| ⚠️ Yellow | Warning or partial success |

### Status Messages

- **VALIDATING** - Checking your credentials
- **VALIDATED** - Credentials are good!
- **SWITCHING** - Changing environments
- **SWITCHED** - Environment changed successfully
- **PERMISSIONS_ASSIGNED** - All roles assigned ✅
- **PERMISSIONS_PARTIAL** - Some roles assigned ⚠️
- **FAILED** - Something went wrong ❌

### Step Icons

- ⏳ **Pending** - Waiting to start
- 🔵 **Running** - Currently executing (spinner animation)
- ✅ **Completed** - Successfully done
- ❌ **Failed** - Encountered error
- ⚠️ **Warning** - Completed with issues

---

## 🔧 Troubleshooting Common Issues

### Issue: "Azure CLI not found"

**What it means**: Azure CLI is not installed on your system

**How to fix**:
```bash
# macOS
brew install azure-cli

# Windows (PowerShell as Admin)
winget install Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

After installation, refresh the page and try again.

---

### Issue: "Authentication failed"

**What it means**: The credentials you entered are incorrect

**How to fix**:
1. Double-check Tenant ID, Client ID, and Client Secret
2. Verify in Azure Portal → Azure AD → App registrations
3. Make sure the Client Secret hasn't expired
4. Ensure the Service Principal is not disabled

---

### Issue: "Cannot access subscription"

**What it means**: Your Service Principal doesn't have access to the subscription

**How to fix**:
1. Go to Azure Portal → Subscriptions
2. Select your subscription
3. Click "Access control (IAM)"
4. Click "Add" → "Add role assignment"
5. Select "Reader" role
6. Search for your Service Principal by Client ID
7. Assign the role
8. Wait 5-10 minutes for propagation
9. Try validation again

---

### Issue: "Permission assignment failed"

**What it means**: You don't have sufficient permissions to assign roles

**How to fix**:
- **Option 1**: Ask an Azure subscription Owner to assign the roles
- **Option 2**: Manually assign in Azure Portal:
  1. Go to Subscriptions → Your Subscription → IAM
  2. Assign these roles to your Service Principal:
     - Reader
     - Cost Management Reader
     - Monitoring Reader

---

### Issue: "After switching, dashboard shows old data"

**What it means**: Backend hasn't restarted yet or roles haven't propagated

**How to fix**:
1. **Wait**: Azure roles take 5-10 minutes to propagate
2. **Restart Backend**:
   ```bash
   # Stop the server (Ctrl+C)
   # Start again
   npm run server
   ```
3. **Clear Browser Cache**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. **Refresh Page**: F5 or click Refresh button

---

## 💡 Pro Tips

### Tip 1: Always Validate First
Before switching, always click "Validate Credentials" to catch issues early.

### Tip 2: Name Your Environments Meaningfully
Use descriptive names like:
- "Production-Main-Account"
- "Development-Testing"
- "Staging-PreProd"
- "Customer-A-Environment"

### Tip 3: Keep a Credential Document
Maintain a secure document (in a password manager or secure note) with:
- Environment name
- When it was created
- What it's used for
- When the client secret expires

### Tip 4: Document Role Expirations
Azure client secrets expire. Note the expiration date and set a reminder to renew.

### Tip 5: Test in Non-Production First
Before switching production environments, test the process with a development environment.

---

## 📸 Visual Guide

### Where to Find Everything

1. **Sidebar** → "Environment Switcher" (with "New" badge)
2. **Three Tabs at Top**:
   - Saved Environments
   - Custom Environment
   - Progress

3. **Custom Environment Form**:
   - All fields clearly labeled
   - Eye icon to show/hide secret
   - Two big buttons at bottom: Validate | Switch

4. **Progress Tab**:
   - Status card at top (color-coded)
   - Steps list below
   - Action buttons when needed

---

## 🎬 Quick Reference

### Quick Switch (Saved Environment)
1. Environment Switcher → Saved Environments
2. Click "Switch to this Environment"
3. Enter Client Secret
4. Switch → Assign Permissions → Restart

### New Environment Setup
1. Environment Switcher → Custom Environment
2. Fill in all fields
3. Validate Credentials
4. Switch Environment
5. Assign Permissions
6. Wait 5-10 min → Restart Backend → Refresh

### Just Test Credentials
1. Environment Switcher → Custom Environment
2. Fill in fields
3. Validate Credentials
4. Review results
5. Done!

---

## 📚 Additional Help

- **Full User Guide**: [ENVIRONMENT-SWITCHER.md](./ENVIRONMENT-SWITCHER.md)
- **Demo Guide**: [DEMO-ENVIRONMENT-SWITCHER.md](./DEMO-ENVIRONMENT-SWITCHER.md)
- **Quick Start**: [QUICK-START-ENVIRONMENT-SWITCHER.md](./QUICK-START-ENVIRONMENT-SWITCHER.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## ❓ Still Need Help?

1. Check the Progress tab for specific error messages
2. Review backend console logs
3. Check Azure Portal for service principal status
4. Verify Azure CLI: `az account show`
5. Review the comprehensive guides linked above

---

**Estimated Time**:
- First-time setup: 10-15 minutes
- Switching between known environments: 5 minutes
- Just validating credentials: 2 minutes

**Enjoy seamless environment switching!** 🎉

