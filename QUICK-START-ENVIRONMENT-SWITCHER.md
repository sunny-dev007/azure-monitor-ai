# ⚡ Quick Start: Environment Switcher

## What You'll Need (5 minutes to gather)

Before you begin, collect these Azure credentials:

1. **Tenant ID** (Azure AD Directory ID)
2. **Client ID** (Service Principal Application ID)
3. **Client Secret** (Service Principal Secret Key)
4. **Subscription ID** (Azure Subscription ID)

### Where to Find Them

**Azure Portal** → **Azure Active Directory** → **App registrations** → **Your App**

- **Tenant ID & Client ID**: Overview page
- **Client Secret**: Certificates & secrets → New client secret
- **Subscription ID**: Subscriptions page

---

## Option 1: Quick Switch (2 minutes)

### For Existing Environments

1. **Open the App**
   ```
   Navigate to http://localhost:3000
   ```

2. **Go to Environment Switcher**
   - Click **"Environment Switcher"** in the sidebar (look for the "New" badge)

3. **Select Environment**
   - See list of saved environments
   - Click **"Switch to this Environment"** on the one you want

4. **Enter Secret**
   - Provide the Client Secret when prompted

5. **Watch Progress**
   - Sit back and watch real-time progress
   - Click **"Assign Permissions"** when prompted

6. **Done!**
   - Wait 5-10 minutes for Azure role propagation
   - Restart backend: `npm run server`
   - Refresh page

---

## Option 2: Custom Environment (5 minutes)

### For New Environments

1. **Open Environment Switcher**
   ```
   Sidebar → Environment Switcher → Custom Environment tab
   ```

2. **Fill in Credentials**
   ```
   Environment Name: [Your choice, e.g., "Production"]
   Tenant ID: [from Azure Portal]
   Client ID: [from Azure Portal]
   Client Secret: [from Azure Portal]
   Subscription ID: [from Azure Portal]
   ```

3. **Validate (Recommended)**
   - Click **"Validate Credentials"** button
   - Watch the Progress tab
   - Verify all checks pass ✅

4. **Switch**
   - Return to Custom Environment tab
   - Click **"Switch Environment"** button
   - Monitor progress in Progress tab

5. **Assign Permissions**
   - Click **"Assign Azure Permissions"** when prompted
   - Wait for all roles to be assigned

6. **Complete**
   - Wait 5-10 minutes for role propagation
   - Restart backend server
   - Refresh application
   - Done! 🎉

---

## What Happens Behind the Scenes

### During Validation
1. ✅ Checks Azure CLI installation
2. ✅ Tests authentication with your credentials
3. ✅ Verifies subscription access
4. ✅ Checks existing role assignments
5. ✅ Identifies missing roles

### During Switch
1. 💾 Backs up your current `.env` file
2. 📝 Preserves non-Azure settings (OpenAI configs, etc.)
3. ✨ Creates new `.env` with your credentials
4. ✅ Confirms switch success

### During Permission Assignment
1. 🔐 Logs into Azure CLI
2. 🎯 Sets active subscription
3. 👤 Assigns "Reader" role
4. 💰 Assigns "Cost Management Reader" role
5. 📊 Assigns "Monitoring Reader" role
6. ✅ Verifies all roles

---

## Example: Azure-Central-AI-Hub

Here's a complete example using specific credentials:

```
Environment Name: Azure-Central-AI-Hub
Tenant ID: a8f047ad-e0cb-4b81-badd-4556c4cd71f4
Client ID: 1f16c4c4-8c61-4083-bda0-b5cd4f847dff
Client Secret: [Your Secret - get from Azure Portal]
Subscription ID: 5588ec4e-3711-4cd3-a62a-52d031b0a6c8
```

1. Open Environment Switcher
2. Go to Custom Environment tab
3. Enter the above details
4. Click "Validate Credentials"
5. Watch progress ✅
6. Click "Switch Environment"
7. Click "Assign Azure Permissions"
8. Wait for completion
9. Restart backend and refresh!

---

## Troubleshooting Quick Fixes

### "Azure CLI not found"
```bash
# macOS
brew install azure-cli

# Windows
winget install Microsoft.AzureCLI
```

### "Authentication failed"
- Double-check Tenant ID, Client ID, and Client Secret
- Verify in Azure Portal → App registrations

### "Cannot access subscription"
- Verify Subscription ID
- Ensure Service Principal has Reader role on subscription

### "Permission assignment failed"
- You may need Owner role to assign permissions
- Assign manually in Azure Portal → Subscriptions → IAM

---

## Pro Tips 💡

1. **Always validate first** - Catch issues before switching
2. **Name your environments** - Makes them easy to identify later
3. **Wait for propagation** - Give Azure 5-10 minutes after assigning roles
4. **Keep backups** - The system auto-backs up, but keep manual backups too
5. **Test in development** - Try with a dev environment first

---

## Next Steps

After switching:

1. **Verify Connection**
   - Go to Dashboard
   - Check that resources are loading
   - Verify subscription information

2. **Test Features**
   - Browse Resources page
   - Check Costs page
   - Try AI Chat

3. **Document**
   - Note which environment is for which purpose
   - Keep credentials secure
   - Share access appropriately

---

## Need More Help?

- 📖 [Full Environment Switcher Guide](./ENVIRONMENT-SWITCHER.md)
- 🎬 [Demo Guide](./DEMO-ENVIRONMENT-SWITCHER.md)
- 🐛 [Troubleshooting Guide](./TROUBLESHOOTING.md)
- 📚 [Main README](./README.md)

---

**Time to Complete**: 5-10 minutes
**Difficulty**: Easy 🟢
**Prerequisites**: Azure credentials

🎉 **You're all set! Enjoy seamless environment switching!**

