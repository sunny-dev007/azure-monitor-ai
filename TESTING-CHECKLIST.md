# ✅ Testing Checklist: Environment Switcher

## Pre-Testing Setup

- [ ] Backend server is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] Azure CLI is installed
- [ ] Have valid Azure credentials ready
- [ ] Browser DevTools open (for debugging)

---

## 1. Existing Functionality Tests (Non-Breaking Validation)

### Dashboard Page
- [ ] Dashboard loads without errors
- [ ] Resource counts display correctly
- [ ] Subscription summary shows
- [ ] Charts render properly
- [ ] No console errors

### Resources Page
- [ ] Resource list loads
- [ ] Can filter resources
- [ ] Resource details display
- [ ] No breaking changes

### Costs Page
- [ ] Cost data loads
- [ ] Charts display
- [ ] Date filters work
- [ ] Export functionality works

### Recommendations Page
- [ ] Recommendations load
- [ ] Categories display
- [ ] No errors

### Settings Page
- [ ] Settings page loads
- [ ] Configuration options work
- [ ] No breaking changes

### AI Chat Page
- [ ] Chat interface loads
- [ ] Can send messages
- [ ] Responses work
- [ ] Session management works

### Navigation
- [ ] All sidebar links work
- [ ] Active state highlights correctly
- [ ] Mobile menu works
- [ ] Page transitions smooth

---

## 2. Environment Switcher - UI Tests

### Sidebar Navigation
- [ ] "Environment Switcher" appears in sidebar
- [ ] Has "New" badge
- [ ] Highlighted with gradient background
- [ ] Blue icon color
- [ ] Clicking navigates to `/environment-switcher`

### Saved Environments Tab
- [ ] Tab is accessible
- [ ] Shows loading spinner initially
- [ ] Lists all saved environments
- [ ] Current environment has blue border
- [ ] Environment cards show:
  - [ ] Environment name
  - [ ] Truncated Tenant ID
  - [ ] Truncated Client ID
  - [ ] Truncated Subscription ID
- [ ] "Switch to this Environment" button appears on non-current envs
- [ ] Empty state shows if no environments saved

### Custom Environment Tab
- [ ] Tab is accessible
- [ ] Form renders correctly
- [ ] All input fields present:
  - [ ] Environment Name (optional)
  - [ ] Tenant ID
  - [ ] Client ID
  - [ ] Client Secret (password field)
  - [ ] Subscription ID
- [ ] Eye icon toggles secret visibility
- [ ] Info box displays at bottom
- [ ] "Validate Credentials" button present
- [ ] "Switch Environment" button present
- [ ] Both buttons disabled when fields empty
- [ ] Both buttons enabled when all required fields filled

### Progress Tab
- [ ] Tab appears after starting validation/switch
- [ ] Status card displays current status
- [ ] Status card has appropriate color coding
- [ ] Steps list shows all steps
- [ ] Each step has:
  - [ ] Icon (matching status)
  - [ ] Title
  - [ ] Message
  - [ ] Timestamp
- [ ] Empty state shows when no steps yet

---

## 3. Environment Switcher - Functionality Tests

### Validation Flow
- [ ] **Start Validation**
  - [ ] Click "Validate Credentials"
  - [ ] Navigates to Progress tab automatically
  - [ ] Status shows "VALIDATING"
  - [ ] Session ID generated

- [ ] **Azure CLI Check**
  - [ ] Step "Validating Azure CLI installation" appears
  - [ ] Shows "running" status with spinner
  - [ ] Completes with green checkmark
  - [ ] Message shows "Azure CLI is installed"

- [ ] **Authentication Test**
  - [ ] Step "Testing service principal authentication" appears
  - [ ] Shows "running" status
  - [ ] Completes successfully (or shows error if invalid)
  - [ ] Message indicates success

- [ ] **Subscription Access**
  - [ ] Step "Validating subscription access" appears
  - [ ] Shows "running" status
  - [ ] Completes with subscription ID in message
  
- [ ] **Role Check**
  - [ ] Step "Checking current role assignments" appears
  - [ ] Shows existing roles with ✓
  - [ ] Shows missing roles with "(missing)"
  - [ ] Completes successfully

- [ ] **Final Status**
  - [ ] Status changes to "VALIDATED"
  - [ ] Yellow warning box appears if roles missing
  - [ ] "Assign Required Permissions" button shows

### Switch Flow
- [ ] **Start Switch**
  - [ ] Click "Switch Environment"
  - [ ] Navigates to Progress tab
  - [ ] Status shows "SWITCHING"
  - [ ] Session ID generated

- [ ] **Backup Current Environment**
  - [ ] Step appears
  - [ ] Shows "running" status
  - [ ] Completes with backup filename
  - [ ] Backup file created in project root

- [ ] **Preserve Settings**
  - [ ] Step appears
  - [ ] Completes successfully
  
- [ ] **Create New Configuration**
  - [ ] Step appears
  - [ ] Completes successfully
  - [ ] New `.env` file created
  - [ ] Contains new credentials

- [ ] **Final Status**
  - [ ] Status changes to "SWITCHED"
  - [ ] Green success box appears
  - [ ] Backup filename displayed
  - [ ] "Assign Azure Permissions" button shows

### Permission Assignment Flow
- [ ] **Start Assignment**
  - [ ] Click "Assign Azure Permissions"
  - [ ] New steps begin appearing

- [ ] **Login to Azure CLI**
  - [ ] Step appears
  - [ ] Completes successfully

- [ ] **Set Subscription**
  - [ ] Step appears
  - [ ] Completes successfully

- [ ] **Assign Reader Role**
  - [ ] Step appears
  - [ ] Shows "running" status
  - [ ] Completes (or shows "already exists")

- [ ] **Assign Cost Management Reader Role**
  - [ ] Step appears
  - [ ] Shows "running" status
  - [ ] Completes (or shows "already exists")

- [ ] **Verify Roles**
  - [ ] Step appears
  - [ ] Shows "running" status
  - [ ] Completes with verification message

- [ ] **Final Status**
  - [ ] Status changes to "PERMISSIONS_ASSIGNED"
  - [ ] Green completion box appears
  - [ ] Next steps instructions show
  - [ ] "Refresh Application" button appears

### Quick Switch from Saved Environment
- [ ] Click saved environment card
- [ ] Navigates to Custom Environment tab
- [ ] Pre-fills all fields except Client Secret
- [ ] Can enter Client Secret
- [ ] Can complete switch

---

## 4. Error Handling Tests

### Invalid Credentials
- [ ] Enter wrong Tenant ID
- [ ] Validation fails gracefully
- [ ] Error message is clear
- [ ] Can correct and retry

### Network Issues
- [ ] Disable internet
- [ ] Attempt validation
- [ ] Appropriate error message
- [ ] Enable internet and retry works

### Missing Azure CLI
- [ ] (If possible) Temporarily rename `az` command
- [ ] Validation shows "Azure CLI not found"
- [ ] Clear instructions provided
- [ ] Restore and retry works

### Permission Denied
- [ ] Use credentials without Owner role
- [ ] Permission assignment shows warning
- [ ] Clear message about manual assignment
- [ ] Links to Azure Portal provided

### Session Timeout
- [ ] Start validation
- [ ] Wait 30+ seconds
- [ ] Timeout error shows
- [ ] Can retry

---

## 5. Backend API Tests

### GET /api/environment/environments
```bash
curl http://localhost:5000/api/environment/environments
```
- [ ] Returns 200 status
- [ ] JSON response with environments array
- [ ] Includes current environment
- [ ] Includes backup files

### POST /api/environment/validate-credentials
```bash
curl -X POST http://localhost:5000/api/environment/validate-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "...",
    "clientId": "...",
    "clientSecret": "...",
    "subscriptionId": "..."
  }'
```
- [ ] Returns 200 status
- [ ] Returns sessionId
- [ ] Session created in backend

### GET /api/environment/session/:sessionId
```bash
curl http://localhost:5000/api/environment/session/[sessionId]
```
- [ ] Returns 200 status
- [ ] Returns session data
- [ ] Includes steps array
- [ ] Shows current status

### POST /api/environment/switch
```bash
curl -X POST http://localhost:5000/api/environment/switch \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "...",
    "clientId": "...",
    "clientSecret": "...",
    "subscriptionId": "...",
    "environmentName": "Test Environment"
  }'
```
- [ ] Returns 200 status
- [ ] Returns sessionId
- [ ] Creates backup file
- [ ] Creates new .env file

### POST /api/environment/assign-permissions/:sessionId
```bash
curl -X POST http://localhost:5000/api/environment/assign-permissions/[sessionId]
```
- [ ] Returns 200 status
- [ ] Assigns roles in Azure
- [ ] Updates session with steps

---

## 6. Integration Tests

### Full Switch Workflow
1. [ ] Open Environment Switcher
2. [ ] Enter valid credentials
3. [ ] Validate credentials
4. [ ] All validations pass
5. [ ] Switch environment
6. [ ] Backup created
7. [ ] New .env created
8. [ ] Assign permissions
9. [ ] All roles assigned
10. [ ] Wait 5-10 minutes
11. [ ] Restart backend
12. [ ] Refresh frontend
13. [ ] Dashboard shows new environment
14. [ ] Resources from new environment load
15. [ ] Costs from new environment load

### Switch Back to Original
1. [ ] Go to Saved Environments
2. [ ] Select original environment
3. [ ] Enter secret
4. [ ] Switch back
5. [ ] Verify original resources show

---

## 7. Responsive Design Tests

### Desktop (1920x1080)
- [ ] All elements visible
- [ ] No horizontal scroll
- [ ] Proper spacing

### Tablet (768x1024)
- [ ] Layout adjusts
- [ ] All elements accessible
- [ ] Forms usable

### Mobile (375x667)
- [ ] Mobile menu works
- [ ] Forms scrollable
- [ ] Buttons accessible
- [ ] Text readable

---

## 8. Performance Tests

- [ ] Page loads in < 3 seconds
- [ ] Validation completes in < 30 seconds
- [ ] Switch completes in < 15 seconds
- [ ] Permission assignment completes in < 60 seconds
- [ ] No memory leaks (check DevTools)
- [ ] Smooth animations
- [ ] No UI lag

---

## 9. Security Tests

- [ ] Client Secret not visible in console logs
- [ ] Client Secret not in browser Network tab (except initial POST)
- [ ] .env file not accessible via API
- [ ] Session cleanup after 10 minutes
- [ ] No sensitive data in localStorage
- [ ] HTTPS recommended for production

---

## 10. Documentation Tests

- [ ] README.md updated
- [ ] ENVIRONMENT-SWITCHER.md created and complete
- [ ] DEMO-ENVIRONMENT-SWITCHER.md created
- [ ] QUICK-START-ENVIRONMENT-SWITCHER.md created
- [ ] All links work
- [ ] Screenshots/images present (if applicable)
- [ ] Examples are accurate

---

## 11. Regression Tests (Existing Features)

### Azure Service Integration
- [ ] Azure API calls still work
- [ ] Cost data fetches correctly
- [ ] Resource data fetches correctly
- [ ] No authentication issues with existing features

### Chat Functionality
- [ ] Chat still works
- [ ] AI responses generate
- [ ] Session management intact

### All Other Pages
- [ ] No errors on any existing page
- [ ] All existing features functional
- [ ] No CSS conflicts
- [ ] No JavaScript errors

---

## Test Results Summary

| Category | Tests Passed | Tests Failed | Notes |
|----------|--------------|--------------|-------|
| Existing Functionality | __ / __ | __ / __ | |
| Environment Switcher UI | __ / __ | __ / __ | |
| Environment Switcher Functionality | __ / __ | __ / __ | |
| Error Handling | __ / __ | __ / __ | |
| Backend API | __ / __ | __ / __ | |
| Integration | __ / __ | __ / __ | |
| Responsive Design | __ / __ | __ / __ | |
| Performance | __ / __ | __ / __ | |
| Security | __ / __ | __ / __ | |
| Documentation | __ / __ | __ / __ | |
| Regression | __ / __ | __ / __ | |
| **TOTAL** | **__ / __** | **__ / __** | |

---

## Sign-off

- [ ] All tests passed
- [ ] No regressions found
- [ ] Documentation complete
- [ ] Ready for production

**Tested by**: _________________  
**Date**: _________________  
**Environment**: _________________  
**Notes**: _________________

---

## Known Issues

List any known issues found during testing:

1. 
2. 
3. 

---

## Future Improvements

Suggestions for future enhancements:

1. 
2. 
3. 

---

**Testing Status**: ⏳ In Progress / ✅ Complete / ❌ Failed

*Last updated: [Date]*

