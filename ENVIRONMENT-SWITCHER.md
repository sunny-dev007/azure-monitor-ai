# 🌐 Environment Switcher - User Guide

## Overview

The **Environment Switcher** is a powerful web-based interface that allows you to seamlessly switch between different Azure environments without manually editing configuration files or running command-line scripts. It provides real-time visibility into the validation, switching, and permission assignment processes.

## ✨ Key Features

### 1. **Visual Interface**
- Beautiful, modern UI built with React and Framer Motion
- Real-time progress tracking for all operations
- Color-coded status indicators
- Mobile-responsive design

### 2. **Multiple Switch Modes**

#### **Saved Environments**
- View all previously configured Azure environments
- Quick-switch to any saved environment
- Visual indicator showing your current environment
- Display of tenant, client, and subscription IDs

#### **Custom Environment**
- Enter credentials manually for new environments
- Secure password field with show/hide toggle
- Option to name your environment for easy identification
- Validation and instructions included

### 3. **Real-Time Validation**
The Environment Switcher validates your credentials in real-time:
- ✅ **Azure CLI Installation** - Checks if Azure CLI is installed
- ✅ **Service Principal Authentication** - Tests login with provided credentials
- ✅ **Subscription Access** - Verifies access to the subscription
- ✅ **Current Role Assignments** - Checks existing RBAC roles
- ✅ **Missing Permissions** - Identifies which roles need to be assigned

### 4. **Interactive Progress Tracking**
Every operation is displayed with:
- **Step-by-step progress** - See exactly what's happening
- **Command outputs** - View responses from Azure CLI
- **Timestamps** - Track how long each step takes
- **Status icons**:
  - 🔵 Running (animated spinner)
  - ✅ Completed (green checkmark)
  - ❌ Failed (red X)
  - ⚠️ Warning (yellow triangle)

### 5. **Automated Permission Assignment**
- One-click permission assignment
- Assigns required roles:
  - Reader
  - Cost Management Reader
  - Monitoring Reader
- Real-time verification of role assignments

### 6. **Environment Backup**
- Automatically backs up your current `.env` file
- Named backups for easy restoration
- Preserves non-Azure settings (OpenAI configs, ports, etc.)

## 🚀 How to Use

### Method 1: Switch to a Saved Environment

1. Navigate to **Environment Switcher** from the sidebar (look for the "New" badge!)
2. You'll see the **"Saved Environments"** tab with all available environments
3. Current environment is highlighted with a blue border
4. Click **"Switch to this Environment"** on any other environment
5. Enter the Client Secret when prompted
6. Watch the real-time progress as the switch happens
7. Once complete, click **"Assign Azure Permissions"** if needed

### Method 2: Configure a Custom Environment

1. Click the **"Custom Environment"** tab
2. Fill in the required credentials:
   - **Environment Name** (optional) - e.g., "Production", "Development"
   - **Tenant ID** - Your Azure AD Directory ID
   - **Client ID** - Your Service Principal Application ID
   - **Client Secret** - Your Service Principal secret key
   - **Subscription ID** - Your Azure Subscription ID

3. Choose an action:
   - **Validate Credentials** - Test without switching (recommended first)
   - **Switch Environment** - Switch and validate in one step

4. Monitor the **"Progress"** tab for real-time updates

### Method 3: Quick Validation

Before switching, you can validate your credentials:
1. Fill in all credential fields
2. Click **"Validate Credentials"**
3. Watch the progress to see:
   - If authentication works
   - If you have subscription access
   - Which roles are already assigned
   - Which roles are missing

## 📊 Progress Screen Details

### Status Indicators

| Status | Meaning |
|--------|---------|
| **VALIDATING** | Credentials are being checked |
| **VALIDATED** | Credentials are valid; ready to switch or assign permissions |
| **SWITCHING** | Environment is being switched |
| **SWITCHED** | Environment switched successfully; permissions may need assignment |
| **PERMISSIONS_ASSIGNED** | All roles assigned successfully |
| **PERMISSIONS_PARTIAL** | Some roles assigned; manual intervention may be needed |
| **FAILED** | Operation failed; check error messages |

### Step Statuses

Each step in the process shows:
- ⏳ **Pending** - Waiting to start
- 🔵 **Running** - Currently executing
- ✅ **Completed** - Successfully finished
- ❌ **Failed** - Encountered an error
- ⚠️ **Warning** - Completed with minor issues

## 🔒 Security Best Practices

1. **Never share your Client Secret** - It's shown in password field by default
2. **Use environment-specific Service Principals** - Don't reuse credentials across environments
3. **Limit permissions** - Only assign the minimum required roles
4. **Regular rotation** - Rotate client secrets periodically
5. **Monitor access** - Check Azure AD sign-in logs regularly

## 🔧 Troubleshooting

### "Azure CLI not found"
**Solution**: Install Azure CLI:
```bash
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### "Authentication failed"
**Possible causes**:
- Wrong Client ID or Client Secret
- Wrong Tenant ID
- Client Secret expired
- Service Principal disabled

**Solution**: Verify credentials in Azure Portal → Azure AD → App registrations

### "Cannot access subscription"
**Possible causes**:
- Wrong Subscription ID
- Service Principal not added to subscription
- Insufficient permissions

**Solution**: 
1. Verify Subscription ID in Azure Portal → Subscriptions
2. Ensure Service Principal has at least Reader role on subscription

### "Permission assignment failed"
**Possible causes**:
- Current user/service principal lacks Owner or User Access Administrator role
- Role already exists (not necessarily a failure)

**Solution**: 
- Have an Azure subscription Owner assign the roles manually
- Use the Azure Portal to assign roles:
  - Go to Subscriptions → Your Subscription → Access control (IAM)
  - Click "Add" → "Add role assignment"
  - Select role and assign to your Service Principal

### "Command timeout"
**Possible causes**:
- Network issues
- Azure CLI not responding
- Azure API slowness

**Solution**: 
- Check internet connection
- Try again in a few minutes
- Restart Azure CLI: `az logout` then retry

## 🎯 Best Practices

### 1. Test Before Switching
Always use "Validate Credentials" first to ensure everything works before switching environments.

### 2. Name Your Environments
Give meaningful names like:
- "Production-Main"
- "Development-Testing"
- "Staging-PreProd"

This makes it easier to identify environments later.

### 3. Document Your Credentials
Keep a secure record of:
- Which Service Principal belongs to which environment
- When Client Secrets expire
- Who has access to each environment

### 4. Wait for Role Propagation
After assigning permissions:
- Wait 5-10 minutes for Azure to propagate roles
- Restart your backend server
- Refresh the application

### 5. Keep Backups
The system automatically backs up your `.env` file, but you should also:
- Keep manual backups of important configurations
- Document any custom settings
- Test restoration procedures

## 🌟 Advanced Features

### API Integration

You can also use the backend API directly:

#### List Environments
```bash
GET /api/environment/environments
```

#### Validate Credentials
```bash
POST /api/environment/validate-credentials
{
  "tenantId": "xxx",
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx"
}
```

#### Switch Environment
```bash
POST /api/environment/switch
{
  "tenantId": "xxx",
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "environmentName": "My Environment"
}
```

#### Get Session Status
```bash
GET /api/environment/session/{sessionId}
```

#### Assign Permissions
```bash
POST /api/environment/assign-permissions/{sessionId}
```

### Session Management

- Sessions are stored in memory on the backend
- Each validation/switch creates a unique session ID
- Sessions auto-expire after 10 minutes of inactivity
- You can track multiple operations by switching tabs

## 📝 Example Workflow

### Scenario: Switching from Personal to Production Environment

1. **Open Environment Switcher**
   - Click "Environment Switcher" in the sidebar

2. **Choose Custom Environment**
   - Click "Custom Environment" tab

3. **Enter Production Credentials**
   - Environment Name: "Production-Azure-Central"
   - Tenant ID: `a8f047ad-e0cb-4b81-badd-4556c4cd71f4`
   - Client ID: `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`
   - Client Secret: (enter your secret)
   - Subscription ID: `5588ec4e-3711-4cd3-a62a-52d031b0a6c8`

4. **Validate First**
   - Click "Validate Credentials"
   - Watch the Progress tab
   - Confirm all checks pass

5. **Switch Environment**
   - Return to Custom Environment tab
   - Click "Switch Environment"
   - Monitor progress

6. **Assign Permissions**
   - When prompted, click "Assign Azure Permissions"
   - Wait for all roles to be assigned
   - Verify success

7. **Complete Setup**
   - Wait 5-10 minutes for role propagation
   - Restart backend: `npm run server`
   - Refresh frontend
   - Verify new environment in Dashboard

## 🆘 Support

If you encounter issues:

1. Check the **Progress** tab for detailed error messages
2. Review the **TROUBLESHOOTING.md** file
3. Check backend console logs for Azure API responses
4. Verify credentials in Azure Portal
5. Ensure Azure CLI is logged in: `az account show`

## 🎨 UI Highlights

- **Gradient Backgrounds** - Modern, professional appearance
- **Framer Motion Animations** - Smooth transitions between states
- **Lucide React Icons** - Consistent, beautiful icons
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Color-Coded Status** - Instant visual feedback
- **Dark Mode Support** - (Coming soon)

## 🔄 Version History

### v1.0.0 (Current)
- Initial release of Environment Switcher
- Full credential validation
- Real-time progress tracking
- Automated permission assignment
- Environment backup and restore
- Saved environments list
- Custom environment configuration

---

**Need Help?** Check out our other documentation:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [README.md](./README.md) - Main project documentation
- [SETUP.md](./SETUP.md) - Initial setup guide

