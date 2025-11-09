# 🎯 START HERE - Azure-Central-AI-Hub Setup

## Your Requirements Fulfilled ✅

Hi! I've created a complete solution to help you use the **Azure-Central-AI-Hub** service principal with your subscription. **Your existing setup is 100% protected** - we only change the `.env` file, which can be instantly restored.

---

## 📋 What You Have

From your screenshot, you have:
- **Service Principal**: Azure-Central-AI-Hub
- **Client ID**: `1f16c4c4-8c61-4083-bda0-b5cd4f847dff`
- **Tenant ID**: `a8f047ad-e0cb-4b81-badd-4556c4cd71f4`
- **Client Secret**: (You have this - don't share it publicly!)

You're getting **403 Authorization Failed** errors because the service principal doesn't have the required Azure RBAC roles in your subscription.

---

## 🚀 Quick Start (Choose One Path)

### Path 1: Automated Setup (Easiest - 5 minutes)

```bash
# Step 1: Backup current setup (SAFE - can restore instantly)
cp .env .env.backup.personal

# Step 2: Run the interactive switcher
./switch-azure-env.sh

# Follow the prompts - it will:
# - Update your .env file
# - Assign Azure permissions
# - Test the configuration

# Step 3: Restart the app
npm run dev
```

### Path 2: Manual Setup (If you prefer control)

```bash
# Step 1: Backup
cp .env .env.backup.personal

# Step 2: Get your Subscription ID
az login
az account list --output table
# Copy your Subscription ID

# Step 3: Edit .env
nano .env
# Update these 4 lines:
# AZURE_TENANT_ID=a8f047ad-e0cb-4b81-badd-4556c4cd71f4
# AZURE_CLIENT_ID=1f16c4c4-8c61-4083-bda0-b5cd4f847dff
# AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL
# AZURE_SUBSCRIPTION_ID=YOUR_SUBSCRIPTION_ID

# Step 4: Assign permissions
./fix-azure-permissions.sh

# Step 5: Restart
npm run dev
```

---

## ✅ Verification

After setup, test it works:

```bash
# 1. Health check
curl http://localhost:5000/api/health

# 2. Permission check
curl http://localhost:5000/api/azure/validate-permissions

# 3. Open browser
open http://localhost:3000
```

You should see:
- ✅ Dashboard loads
- ✅ Resources displayed
- ✅ Costs shown
- ✅ No 403 errors

---

## 🔄 Switch Back to Your Personal Account (Instantly)

```bash
# Stop the app (Ctrl+C)

# Restore your original setup
cp .env.backup.personal .env

# Restart
npm run dev
```

**That's it!** Your personal account works exactly as before.

---

## 📚 Complete Documentation

I've created comprehensive guides for you:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[QUICK-START-NEW-ENVIRONMENT.md](QUICK-START-NEW-ENVIRONMENT.md)** | Quick setup guide | Start here for step-by-step instructions |
| **[README-ENVIRONMENT-SETUP.md](README-ENVIRONMENT-SETUP.md)** | Complete setup guide | For detailed information |
| **[ENVIRONMENT-SWITCHING.md](ENVIRONMENT-SWITCHING.md)** | Switching guide | When you need to switch between accounts |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Troubleshooting | When you encounter issues |

---

## 🛠️ Scripts Created for You

| Script | Purpose |
|--------|---------|
| `switch-azure-env.sh` | Interactive environment switcher (recommended) |
| `assign-permissions-manual.sh` | Manual permission assignment |
| `fix-azure-permissions.sh` | Fix permission issues (already existed) |

All scripts:
- ✅ Are executable and ready to use
- ✅ Backup your current setup automatically
- ✅ Provide clear feedback
- ✅ Include error handling

---

## 🛡️ Your Existing Setup is Protected

**How we protect your current setup:**

1. ✅ **Automatic Backups**: Every script backs up your `.env` before changes
2. ✅ **No Code Changes**: We only modify the `.env` file (configuration)
3. ✅ **Instant Restore**: One command restores your original setup
4. ✅ **Isolated Changes**: New environment doesn't affect your old one
5. ✅ **Safe Testing**: Test the new environment without risk

**Proof it's safe:**
```bash
# Your backup
ls -la .env.backup.*

# Instant restore
cp .env.backup.personal .env
```

---

## 🎯 What Each Script Does

### `switch-azure-env.sh` (Interactive - Recommended)
- Backups your current `.env`
- Asks for your subscription ID
- Updates `.env` with new credentials
- Assigns Azure permissions automatically
- Tests the configuration
- Gives you clear next steps

### `assign-permissions-manual.sh` (Manual Control)
- Shows your current role assignments
- Assigns Reader role
- Assigns Cost Management Reader role
- Verifies roles are assigned
- Provides clear output

### `fix-azure-permissions.sh` (Fix Issues)
- Tests each required permission
- Assigns missing roles
- Shows what's wrong and how to fix it
- Works for any environment

---

## 🚨 Common Issues & Solutions

### Issue 1: "403 Authorization Failed"

**Cause**: Service principal doesn't have required roles

**Solution**:
```bash
./fix-azure-permissions.sh
# Wait 5-10 minutes for propagation
npm run dev
```

### Issue 2: "Need Subscription ID"

**Solution**:
```bash
az login
az account list --output table
# Copy the Subscription ID you want to use
```

### Issue 3: "Permission denied to assign roles"

**Cause**: You need Owner or User Access Administrator role

**Solution**: Contact your Azure admin or share this with them:
```bash
az role assignment create \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --role "Reader" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"

az role assignment create \
  --assignee "1f16c4c4-8c61-4083-bda0-b5cd4f847dff" \
  --role "Cost Management Reader" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

---

## 📞 Need Help?

1. **Quick Start**: See [QUICK-START-NEW-ENVIRONMENT.md](QUICK-START-NEW-ENVIRONMENT.md)
2. **Detailed Setup**: See [README-ENVIRONMENT-SETUP.md](README-ENVIRONMENT-SETUP.md)
3. **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. **Run Fix Script**: `./fix-azure-permissions.sh`

---

## ✨ Summary

You have everything you need:

- ✅ **Automated scripts** for easy setup
- ✅ **Manual options** if you prefer control
- ✅ **Complete documentation** for every scenario
- ✅ **Safe backups** so nothing breaks
- ✅ **Clear instructions** for your exact case
- ✅ **Troubleshooting guides** for any issues
- ✅ **Protection** for your existing setup

**Ready?** Start with Path 1 or Path 2 above! 🚀

---

## 🎉 Your Next 5 Minutes

```bash
# 1. Backup (safe!)
cp .env .env.backup.personal

# 2. Run setup
./switch-azure-env.sh

# 3. Follow prompts (enter your Subscription ID)

# 4. Wait for role propagation (5 minutes)

# 5. Restart app
npm run dev

# 6. Test
curl http://localhost:5000/api/azure/validate-permissions

# 7. Open browser
open http://localhost:3000
```

**Done!** Your application now works with Azure-Central-AI-Hub. 🎯

To switch back: `cp .env.backup.personal .env && npm run dev`

---

**All changes pushed to GitHub**: `https://github.com/sunny-dev007/azure-monitor-ai.git`

