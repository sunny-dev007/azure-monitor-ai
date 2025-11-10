# 🎬 Environment Switcher Demo Guide

## Quick Demo (5 minutes)

This guide helps you showcase the Environment Switcher feature to stakeholders or team members.

## 🎯 Demo Scenario

**Goal**: Switch from the current Azure environment to "Azure-Central-AI-Hub" environment while showing all validation, switching, and permission assignment steps in real-time.

---

## 📋 Pre-Demo Checklist

Before starting the demo:

- [ ] Backend server is running (`npm run server`)
- [ ] Frontend is running (`npm start`)
- [ ] Azure CLI is installed (`az --version`)
- [ ] You have credentials for the target environment
- [ ] Browser is open to `http://localhost:3000`

---

## 🎭 Demo Script

### Part 1: Introduction (30 seconds)

**Say**: 
> "Today I'll show you our new Environment Switcher feature that makes it incredibly easy to switch between different Azure environments. Previously, this required manual file editing and running multiple command-line scripts. Now, it's all visual, interactive, and provides complete visibility into the process."

**Show**: Navigate to the sidebar and highlight the "Environment Switcher" menu item with the "New" badge.

---

### Part 2: Saved Environments (1 minute)

**Navigate**: Click "Environment Switcher" in the sidebar

**Say**: 
> "The Environment Switcher has three main sections. First, let's look at Saved Environments, which shows all previously configured Azure environments."

**Show**:
1. Point to the **"Saved Environments"** tab
2. Highlight the current environment (blue border)
3. Show environment cards with masked credentials
4. Explain: "Each card shows the Tenant ID, Client ID, and Subscription ID for quick reference"

**Interaction**:
- Hover over a non-current environment card
- Show the "Switch to this Environment" button

---

### Part 3: Custom Environment Setup (1.5 minutes)

**Navigate**: Click the **"Custom Environment"** tab

**Say**: 
> "For new environments, we use the Custom Environment tab. Let me show you how easy it is to configure a new Azure environment."

**Show** and **Fill**:

1. **Environment Name**: `Azure-Central-AI-Hub`
   - **Say**: "First, we give it a friendly name"

2. **Tenant ID**: `a8f047ad-e0cb-4b81-badd-4556c4cd71f4`
   - **Say**: "This is the Azure Active Directory tenant ID"

3. **Client ID**: `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`
   - **Say**: "The application or service principal ID"

4. **Client Secret**: `[Your Secret]`
   - **Say**: "The client secret, which is securely hidden by default"
   - **Show**: Click the eye icon to toggle visibility

5. **Subscription ID**: `5588ec4e-3711-4cd3-a62a-52d031b0a6c8`
   - **Say**: "And finally, the Azure subscription we want to manage"

**Highlight**: Point to the info box at the bottom showing where to find these credentials

---

### Part 4: Validation (1 minute)

**Say**: 
> "Before switching, let's validate these credentials to ensure everything is configured correctly."

**Action**: Click the **"Validate Credentials"** button

**Show**: 
- Automatic navigation to the "Progress" tab
- Status card showing "VALIDATING"
- Real-time steps appearing:
  1. ✅ Validating Azure CLI installation
  2. ✅ Testing service principal authentication
  3. ✅ Validating subscription access
  4. ✅ Checking current role assignments

**Say**: 
> "Notice how each step shows its status in real-time - running with a spinning indicator, completed with a green checkmark, or failed with a red X. This complete visibility helps us understand exactly what's happening and troubleshoot if needed."

**Point out**:
- Timestamps on each step
- Detailed messages (e.g., "Roles: Reader ✓, Cost Management Reader (missing)")
- Status changing to "VALIDATED"

---

### Part 5: Environment Switch (1 minute)

**Say**: 
> "Great! The credentials are valid. Now let's actually switch the environment."

**Navigate**: Back to "Custom Environment" tab (if not already there)

**Action**: Click **"Switch Environment"** button

**Show**:
- Progress tab automatically opens
- Status: "SWITCHING"
- Steps appearing:
  1. 🔵 Backing up current environment
  2. ✅ Preserving application settings
  3. ✅ Creating new environment configuration

**Say**: 
> "The system automatically backs up our current .env file, preserves all non-Azure settings like OpenAI configurations, and creates the new environment configuration. This ensures we never lose our previous setup."

**Highlight**: 
- The backup file name shown in the completion message
- Status changes to "SWITCHED"
- Yellow warning box appears suggesting permission assignment

---

### Part 6: Permission Assignment (1 minute)

**Say**: 
> "The environment is switched, but we still need to assign the necessary Azure RBAC permissions for our service principal to access resources."

**Action**: Click **"Assign Azure Permissions"** button

**Show**:
- New steps appearing:
  1. ✅ Logging into Azure CLI
  2. ✅ Setting active subscription
  3. 🔵 Assigning Reader role
  4. 🔵 Assigning Cost Management Reader role
  5. ✅ Verifying role assignments

**Say**: 
> "Watch as the system logs into Azure CLI with the new credentials, sets the correct subscription, and assigns each required role one by one. It then verifies that all roles were successfully assigned."

**Point out**:
- Each Azure CLI command is being executed in the background
- Real-time responses
- Final status: "PERMISSIONS_ASSIGNED"

---

### Part 7: Completion (30 seconds)

**Show**: 
- Green success card with checkmark
- "Setup Complete!" message
- Next steps instructions

**Say**: 
> "That's it! The environment has been switched and all permissions are assigned. The system gives us clear next steps: wait 5-10 minutes for Azure role propagation, restart the backend server, and refresh the page to see our new environment in action."

**Read the next steps box**:
1. Wait 5-10 minutes for Azure role propagation
2. Restart your backend server
3. Refresh this page to see your new environment

---

### Part 8: Verification (Optional - 30 seconds)

**If time permits**:

**Navigate**: Go to Dashboard

**Show**: 
- Resources from the new environment
- Subscription information
- Cost data

**Say**: 
> "And here's the Dashboard now showing resources and data from our Azure-Central-AI-Hub environment. The switch was seamless!"

---

## 🎯 Key Points to Emphasize

1. **No Command Line Required** - Everything is visual and guided
2. **Real-Time Visibility** - You see exactly what's happening at each step
3. **Automatic Backup** - Previous environment is safely backed up
4. **Validation Before Switching** - Test credentials without making changes
5. **One-Click Permissions** - No need to manually run Azure CLI commands
6. **Clear Status Indicators** - Color-coded, with icons and timestamps
7. **Mobile Responsive** - Works on any device

---

## 🐛 Common Demo Issues & Fixes

### Issue: Azure CLI not installed
**Fix**: Have a backup video or screenshots ready, or demo the error handling (it gracefully shows "Azure CLI not found" with installation instructions)

### Issue: Credentials invalid during demo
**Fix**: Validate credentials before the demo starts. Keep a backup environment that you know works.

### Issue: Network timeout
**Fix**: Ensure stable internet connection. Can also demo the timeout error handling.

---

## 💡 Demo Variations

### Quick Demo (2 minutes)
- Skip validation step
- Go directly to "Switch Environment"
- Show just the progress and final success

### Technical Deep Dive (10 minutes)
- Show the API calls in browser DevTools Network tab
- Display backend console logs side-by-side
- Explain each Azure CLI command being executed
- Show the `.env` file before and after

### Error Handling Demo (5 minutes)
- Intentionally enter wrong credentials
- Show validation failure messages
- Demonstrate the clear error messages and suggested fixes
- Show how easy it is to correct and retry

---

## 📸 Screenshot Checklist

For documentation, capture screenshots of:

- [ ] Saved Environments tab with environment cards
- [ ] Custom Environment tab with filled credentials
- [ ] Progress tab during validation (VALIDATING status)
- [ ] Progress tab showing completed validation steps
- [ ] Progress tab during switching (SWITCHING status)
- [ ] Progress tab during permission assignment
- [ ] Final success screen (PERMISSIONS_ASSIGNED)
- [ ] Dashboard showing new environment data
- [ ] Sidebar with "Environment Switcher" menu item

---

## 🎤 Talking Points for Q&A

**Q: What happens to my old environment?**
> "It's automatically backed up to a `.env.backup.[timestamp]` file. You can switch back anytime by selecting it from Saved Environments."

**Q: Can I have multiple environments?**
> "Absolutely! You can configure as many environments as you need and switch between them instantly."

**Q: What if permission assignment fails?**
> "The system shows exactly which role failed and why. It also provides Azure CLI commands you can run manually, or instructions for assigning roles through the Azure Portal."

**Q: Is this secure?**
> "Yes! The client secret is never logged or displayed in console output. It's only used once during authentication and then discarded. The `.env` file is also git-ignored."

**Q: Does this work in production?**
> "Yes! In production, you'd typically use one environment, but this is perfect for teams managing multiple Azure tenants or subscriptions, or for developers who need to test across different environments."

**Q: What if Azure CLI commands take too long?**
> "Each command has a 30-second timeout. If it times out, you'll see a clear error message and can retry."

---

## 🌟 Bonus Features to Mention

- **Session Management** - Each operation creates a tracked session
- **Auto-cleanup** - Sessions expire after 10 minutes of inactivity
- **Responsive Design** - Works perfectly on mobile and tablets
- **Framer Motion Animations** - Smooth, professional transitions
- **Real-time Polling** - Progress updates every second automatically

---

## 📚 Additional Resources to Share

After the demo, share these links:
- [ENVIRONMENT-SWITCHER.md](./ENVIRONMENT-SWITCHER.md) - Complete user guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [README.md](./README.md) - Main project documentation

---

**Happy Demoing!** 🎉

*Pro tip: Practice the demo once before presenting to ensure smooth flow and timing.*

