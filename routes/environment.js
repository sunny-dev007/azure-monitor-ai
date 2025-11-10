const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Store active environment switching sessions
const switchingSessions = new Map();

// Get list of available environments (from backup files)
router.get('/environments', async (req, res) => {
  try {
    const projectRoot = path.join(__dirname, '..');
    const files = await fs.readdir(projectRoot);
    
    // Find all .env backup files
    const backupFiles = files.filter(f => f.startsWith('.env.backup.'));
    
    // Get current environment
    let currentEnv = null;
    try {
      const envContent = await fs.readFile(path.join(projectRoot, '.env'), 'utf-8');
      const tenantMatch = envContent.match(/AZURE_TENANT_ID=(.+)/);
      const clientMatch = envContent.match(/AZURE_CLIENT_ID=(.+)/);
      const subMatch = envContent.match(/AZURE_SUBSCRIPTION_ID=(.+)/);
      
      if (tenantMatch && clientMatch && subMatch) {
        currentEnv = {
          tenantId: tenantMatch[1].trim(),
          clientId: clientMatch[1].trim(),
          subscriptionId: subMatch[1].trim(),
          name: 'Current Environment',
          isCurrent: true
        };
      }
    } catch (error) {
      console.error('Error reading current .env:', error);
    }
    
    // Parse backup files
    const environments = await Promise.all(
      backupFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(projectRoot, file), 'utf-8');
          const tenantMatch = content.match(/AZURE_TENANT_ID=(.+)/);
          const clientMatch = content.match(/AZURE_CLIENT_ID=(.+)/);
          const subMatch = content.match(/AZURE_SUBSCRIPTION_ID=(.+)/);
          
          if (tenantMatch && clientMatch && subMatch) {
            return {
              name: file.replace('.env.backup.', ''),
              fileName: file,
              tenantId: tenantMatch[1].trim(),
              clientId: clientMatch[1].trim(),
              subscriptionId: subMatch[1].trim(),
              isCurrent: false
            };
          }
        } catch (error) {
          console.error(`Error reading backup file ${file}:`, error);
        }
        return null;
      })
    );
    
    const validEnvironments = environments.filter(e => e !== null);
    
    if (currentEnv) {
      validEnvironments.unshift(currentEnv);
    }
    
    res.json({
      success: true,
      data: {
        environments: validEnvironments,
        count: validEnvironments.length
      }
    });
  } catch (error) {
    console.error('Failed to get environments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get environments',
      message: error.message
    });
  }
});

// Validate Azure credentials
router.post('/validate-credentials', async (req, res) => {
  try {
    const { tenantId, clientId, clientSecret, subscriptionId } = req.body;
    
    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials'
      });
    }
    
    // Create session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const validation = {
      sessionId,
      status: 'validating',
      steps: [],
      credentials: { tenantId, clientId, subscriptionId }
    };
    
    switchingSessions.set(sessionId, validation);
    
    res.json({
      success: true,
      data: {
        sessionId,
        message: 'Validation started'
      }
    });
    
    // Start validation process in background
    validateCredentialsBackground(sessionId, { tenantId, clientId, clientSecret, subscriptionId });
    
  } catch (error) {
    console.error('Failed to validate credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate credentials',
      message: error.message
    });
  }
});

// Get validation/switching session status
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = switchingSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      message: error.message
    });
  }
});

// Switch environment
router.post('/switch', async (req, res) => {
  try {
    const { tenantId, clientId, clientSecret, subscriptionId, environmentName } = req.body;
    
    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials'
      });
    }
    
    // Create session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const switchSession = {
      sessionId,
      status: 'switching',
      steps: [],
      credentials: { tenantId, clientId, clientSecret, subscriptionId }, // Store ALL credentials including secret
      environmentName: environmentName || 'Custom Environment'
    };
    
    switchingSessions.set(sessionId, switchSession);
    
    res.json({
      success: true,
      data: {
        sessionId,
        message: 'Environment switch started'
      }
    });
    
    // Start switching process in background
    switchEnvironmentBackground(sessionId, { tenantId, clientId, clientSecret, subscriptionId, environmentName });
    
  } catch (error) {
    console.error('Failed to switch environment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch environment',
      message: error.message
    });
  }
});

// Assign permissions
router.post('/assign-permissions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = switchingSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        message: 'Permission assignment started'
      }
    });
    
    // Start permission assignment in background
    assignPermissionsBackground(sessionId, session.credentials);
    
  } catch (error) {
    console.error('Failed to assign permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign permissions',
      message: error.message
    });
  }
});

// Background validation function
async function validateCredentialsBackground(sessionId, credentials) {
  const session = switchingSessions.get(sessionId);
  if (!session) return;
  
  try {
    // Step 1: Test Azure CLI login
    addStep(sessionId, 'Validating Azure CLI installation', 'running');
    const cliCheck = await executeCommand('az --version');
    if (cliCheck.code === 0) {
      updateStep(sessionId, 'Validating Azure CLI installation', 'completed', 'Azure CLI is installed');
    } else {
      updateStep(sessionId, 'Validating Azure CLI installation', 'failed', 'Azure CLI not found');
      session.status = 'failed';
      return;
    }
    
    // Step 2: Test authentication
    addStep(sessionId, 'Testing service principal authentication', 'running');
    
    // First logout to ensure clean state
    await executeCommand('az logout 2>/dev/null || true');
    
    // Use non-interactive login with proper flags
    const authCmd = `az login --service-principal -u "${credentials.clientId}" -p "${credentials.clientSecret}" --tenant "${credentials.tenantId}" --allow-no-subscriptions --output json`;
    const authResult = await executeCommand(authCmd, true); // masked output
    
    if (authResult.code === 0) {
      updateStep(sessionId, 'Testing service principal authentication', 'completed', 'Authentication successful');
    } else {
      // Extract specific error from Azure CLI
      let errorMsg = 'Authentication failed';
      if (authResult.error) {
        if (authResult.error.includes('AADSTS')) {
          const aadMatch = authResult.error.match(/AADSTS\d+: (.+?)(\n|$)/);
          errorMsg = aadMatch ? aadMatch[1] : 'Invalid credentials or expired secret';
        } else if (authResult.error.includes('timeout')) {
          errorMsg = 'Request timeout - check network connectivity';
        } else {
          errorMsg = authResult.error.split('\n')[0].substring(0, 100);
        }
      }
      updateStep(sessionId, 'Testing service principal authentication', 'failed', errorMsg);
      session.status = 'failed';
      await executeCommand('az logout 2>/dev/null || true');
      return;
    }
    
    // Step 3: Validate subscription access
    addStep(sessionId, 'Validating subscription access', 'running');
    const subCmd = `az account set --subscription "${credentials.subscriptionId}"`;
    const subResult = await executeCommand(subCmd);
    
    if (subResult.code === 0) {
      const subInfo = await executeCommand('az account show');
      updateStep(sessionId, 'Validating subscription access', 'completed', `Subscription accessible: ${credentials.subscriptionId}`);
    } else {
      updateStep(sessionId, 'Validating subscription access', 'failed', `Cannot access subscription: ${subResult.error}`);
      session.status = 'failed';
      await executeCommand('az logout');
      return;
    }
    
    // Step 4: Check current roles
    addStep(sessionId, 'Checking current role assignments', 'running');
    const rolesCmd = `az role assignment list --assignee "${credentials.clientId}" --scope "/subscriptions/${credentials.subscriptionId}"`;
    const rolesResult = await executeCommand(rolesCmd);
    
    let hasReader = false;
    let hasCostManagement = false;
    
    if (rolesResult.code === 0 && rolesResult.output) {
      try {
        const roles = JSON.parse(rolesResult.output);
        hasReader = roles.some(r => r.roleDefinitionName === 'Reader');
        hasCostManagement = roles.some(r => r.roleDefinitionName === 'Cost Management Reader');
      } catch (e) {
        console.error('Error parsing roles:', e);
      }
    }
    
    const roleStatus = [];
    if (hasReader) roleStatus.push('Reader ✓');
    if (hasCostManagement) roleStatus.push('Cost Management Reader ✓');
    if (!hasReader) roleStatus.push('Reader (missing)');
    if (!hasCostManagement) roleStatus.push('Cost Management Reader (missing)');
    
    updateStep(sessionId, 'Checking current role assignments', 'completed', `Roles: ${roleStatus.join(', ')}`);
    
    session.hasRequiredRoles = hasReader && hasCostManagement;
    session.status = 'validated';
    
    // Logout
    await executeCommand('az logout');
    
  } catch (error) {
    console.error('Validation error:', error);
    session.status = 'failed';
    addStep(sessionId, 'Validation failed', 'failed', error.message);
  }
}

// Background environment switching function
async function switchEnvironmentBackground(sessionId, credentials) {
  const session = switchingSessions.get(sessionId);
  if (!session) return;
  
  try {
    const projectRoot = path.join(__dirname, '..');
    
    // Step 1: Backup current .env
    addStep(sessionId, 'Backing up current environment', 'running');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = `.env.backup.${credentials.environmentName || timestamp}`;
    
    try {
      await fs.copyFile(
        path.join(projectRoot, '.env'),
        path.join(projectRoot, backupFile)
      );
      updateStep(sessionId, 'Backing up current environment', 'completed', `Backup created: ${backupFile}`);
    } catch (error) {
      updateStep(sessionId, 'Backing up current environment', 'warning', 'No existing .env to backup');
    }
    
    // Step 2: Read current .env to preserve non-Azure settings
    addStep(sessionId, 'Preserving application settings', 'running');
    let existingSettings = {};
    try {
      const envContent = await fs.readFile(path.join(projectRoot, '.env'), 'utf-8');
      const lines = envContent.split('\n');
      lines.forEach(line => {
        if (!line.startsWith('AZURE_') && !line.startsWith('#') && line.includes('=')) {
          const [key, ...values] = line.split('=');
          existingSettings[key.trim()] = values.join('=').trim();
        }
      });
      updateStep(sessionId, 'Preserving application settings', 'completed', 'Settings preserved');
    } catch (error) {
      updateStep(sessionId, 'Preserving application settings', 'warning', 'Using default settings');
    }
    
    // Step 3: Create new .env
    addStep(sessionId, 'Creating new environment configuration', 'running');
    
    const newEnvContent = `# Azure Configuration - ${credentials.environmentName || 'Custom Environment'}
AZURE_TENANT_ID=${credentials.tenantId}
AZURE_CLIENT_ID=${credentials.clientId}
AZURE_CLIENT_SECRET=${credentials.clientSecret}
AZURE_SUBSCRIPTION_ID=${credentials.subscriptionId}

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=${existingSettings.AZURE_OPENAI_ENDPOINT || 'your_openai_endpoint'}
AZURE_OPENAI_API_KEY=${existingSettings.AZURE_OPENAI_API_KEY || 'your_openai_api_key'}
AZURE_OPENAI_DEPLOYMENT_NAME=${existingSettings.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini'}

# Application Configuration
PORT=${existingSettings.PORT || '5000'}
NODE_ENV=${existingSettings.NODE_ENV || 'development'}
CORS_ORIGIN=${existingSettings.CORS_ORIGIN || 'http://localhost:3000'}

# Security
JWT_SECRET=${existingSettings.JWT_SECRET || ''}
RATE_LIMIT_WINDOW_MS=${existingSettings.RATE_LIMIT_WINDOW_MS || '900000'}
RATE_LIMIT_MAX_REQUESTS=${existingSettings.RATE_LIMIT_MAX_REQUESTS || '100'}
`;
    
    await fs.writeFile(path.join(projectRoot, '.env'), newEnvContent);
    updateStep(sessionId, 'Creating new environment configuration', 'completed', 'Configuration created');
    
    session.status = 'switched';
    session.backupFile = backupFile;
    
  } catch (error) {
    console.error('Switch error:', error);
    session.status = 'failed';
    addStep(sessionId, 'Environment switch failed', 'failed', error.message);
  }
}

// Background permission assignment function
async function assignPermissionsBackground(sessionId, credentials) {
  const session = switchingSessions.get(sessionId);
  if (!session) return;
  
  try {
    // Step 1: Login
    addStep(sessionId, 'Logging into Azure CLI', 'running');
    
    // Get credentials from current session
    const tenantId = credentials.tenantId || session.credentials?.tenantId;
    const clientId = credentials.clientId || session.credentials?.clientId;
    const clientSecret = credentials.clientSecret || session.credentials?.clientSecret;
    const subscriptionId = credentials.subscriptionId || session.credentials?.subscriptionId;
    
    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      updateStep(sessionId, 'Logging into Azure CLI', 'failed', 'Missing credentials. Please provide all required credentials.');
      session.status = 'permission_failed';
      return;
    }
    
    console.log('🔐 Attempting Azure CLI login with service principal...');
    console.log('  Tenant ID:', tenantId);
    console.log('  Client ID:', clientId);
    console.log('  Subscription ID:', subscriptionId);
    
    // First logout to ensure clean state
    await executeCommand('az logout 2>/dev/null || true');
    
    // Use non-interactive login with proper flags
    const authCmd = `az login --service-principal -u "${clientId}" -p "${clientSecret}" --tenant "${tenantId}" --allow-no-subscriptions --output json`;
    const authResult = await executeCommand(authCmd, true, 60000);
    
    if (authResult.code !== 0) {
      let errorMsg = 'Authentication failed';
      if (authResult.error) {
        if (authResult.error.includes('AADSTS')) {
          const aadMatch = authResult.error.match(/AADSTS\d+: (.+?)(\n|$)/);
          errorMsg = aadMatch ? aadMatch[1] : 'Invalid credentials or expired secret';
        } else if (authResult.error.includes('timeout')) {
          errorMsg = 'Request timeout - check network connectivity';
        } else {
          errorMsg = authResult.error.split('\n')[0].substring(0, 100);
        }
      }
      console.error('❌ Azure CLI login failed:', errorMsg);
      updateStep(sessionId, 'Logging into Azure CLI', 'failed', errorMsg);
      session.status = 'permission_failed';
      session.errorDetails = {
        step: 'login',
        error: errorMsg,
        suggestion: 'Verify credentials in Azure Portal. The client secret may have expired.'
      };
      return;
    }
    updateStep(sessionId, 'Logging into Azure CLI', 'completed', 'Logged in successfully');
    
    // Step 2: Set subscription
    addStep(sessionId, 'Setting active subscription', 'running');
    const subResult = await executeCommand(`az account set --subscription "${subscriptionId}"`);
    if (subResult.code !== 0) {
      const errorMsg = subResult.error || 'Failed to set subscription';
      console.error('❌ Failed to set subscription:', errorMsg);
      updateStep(sessionId, 'Setting active subscription', 'failed', `Failed: ${errorMsg.substring(0, 200)}`);
      session.status = 'permission_failed';
      await executeCommand('az logout');
      return;
    }
    updateStep(sessionId, 'Setting active subscription', 'completed', 'Subscription set');
    
    // Step 3: Check existing roles FIRST
    addStep(sessionId, 'Checking existing role assignments', 'running');
    const checkRolesCmd = `az role assignment list --assignee "${clientId}" --scope "/subscriptions/${subscriptionId}"`;
    const checkRolesResult = await executeCommand(checkRolesCmd);
    
    let currentlyHasReader = false;
    let currentlyHasCostManagement = false;
    
    if (checkRolesResult.code === 0 && checkRolesResult.output) {
      try {
        const existingRoles = JSON.parse(checkRolesResult.output);
        currentlyHasReader = existingRoles.some(r => r.roleDefinitionName === 'Reader');
        currentlyHasCostManagement = existingRoles.some(r => r.roleDefinitionName === 'Cost Management Reader');
        
        console.log('📋 Current roles found:');
        existingRoles.forEach(r => {
          console.log(`  ✓ ${r.roleDefinitionName}`);
        });
      } catch (e) {
        console.error('Error parsing existing roles:', e);
      }
    }
    
    const existingRolesList = [];
    if (currentlyHasReader) existingRolesList.push('Reader ✓');
    if (currentlyHasCostManagement) existingRolesList.push('Cost Management Reader ✓');
    if (!currentlyHasReader) existingRolesList.push('Reader (missing)');
    if (!currentlyHasCostManagement) existingRolesList.push('Cost Management Reader (missing)');
    
    updateStep(sessionId, 'Checking existing role assignments', 'completed', existingRolesList.join(', '));
    
    // Step 4: Assign Reader role (only if not already exists)
    addStep(sessionId, 'Ensuring Reader role', 'running');
    if (currentlyHasReader) {
      updateStep(sessionId, 'Ensuring Reader role', 'completed', 'Already exists ✓ (no action needed)');
      console.log('✓ Reader role already exists, skipping assignment');
    } else {
      console.log('📝 Reader role missing, attempting to assign...');
      const readerCmd = `az role assignment create --assignee "${clientId}" --role "Reader" --scope "/subscriptions/${subscriptionId}"`;
      const readerResult = await executeCommand(readerCmd);
      
      if (readerResult.code === 0) {
        updateStep(sessionId, 'Ensuring Reader role', 'completed', 'Successfully assigned ✓');
        currentlyHasReader = true;
      } else if (readerResult.error.includes('already exists') || readerResult.error.includes('ConflictingOperation')) {
        updateStep(sessionId, 'Ensuring Reader role', 'completed', 'Already exists ✓');
        currentlyHasReader = true;
      } else if (readerResult.error.includes('Authorization')) {
        updateStep(sessionId, 'Ensuring Reader role', 'warning', 'Cannot auto-assign. Please assign manually in Azure Portal. (Service principal needs Owner role to assign roles)');
      } else {
        updateStep(sessionId, 'Ensuring Reader role', 'warning', `Could not assign: ${readerResult.error.substring(0, 100)}`);
      }
    }
    
    // Step 5: Assign Cost Management Reader role (only if not already exists)
    addStep(sessionId, 'Ensuring Cost Management Reader role', 'running');
    if (currentlyHasCostManagement) {
      updateStep(sessionId, 'Ensuring Cost Management Reader role', 'completed', 'Already exists ✓ (no action needed)');
      console.log('✓ Cost Management Reader role already exists, skipping assignment');
    } else {
      console.log('📝 Cost Management Reader role missing, attempting to assign...');
      const costCmd = `az role assignment create --assignee "${clientId}" --role "Cost Management Reader" --scope "/subscriptions/${subscriptionId}"`;
      const costResult = await executeCommand(costCmd);
      
      if (costResult.code === 0) {
        updateStep(sessionId, 'Ensuring Cost Management Reader role', 'completed', 'Successfully assigned ✓');
        currentlyHasCostManagement = true;
      } else if (costResult.error.includes('already exists') || costResult.error.includes('ConflictingOperation')) {
        updateStep(sessionId, 'Ensuring Cost Management Reader role', 'completed', 'Already exists ✓');
        currentlyHasCostManagement = true;
      } else if (costResult.error.includes('Authorization')) {
        updateStep(sessionId, 'Ensuring Cost Management Reader role', 'warning', 'Cannot auto-assign. Please assign manually in Azure Portal. (Service principal needs Owner role to assign roles)');
      } else {
        updateStep(sessionId, 'Ensuring Cost Management Reader role', 'warning', `Could not assign: ${costResult.error.substring(0, 100)}`);
      }
    }
    
    // Step 6: Final verification (re-check to confirm)
    addStep(sessionId, 'Final role verification', 'running');
    const verifyCmd = `az role assignment list --assignee "${clientId}" --scope "/subscriptions/${subscriptionId}"`;
    const verifyResult = await executeCommand(verifyCmd);
    
    let finalHasReader = currentlyHasReader; // Start with what we know
    let finalHasCostManagement = currentlyHasCostManagement;
    
    if (verifyResult.code === 0 && verifyResult.output) {
      try {
        const roles = JSON.parse(verifyResult.output);
        finalHasReader = roles.some(r => r.roleDefinitionName === 'Reader');
        finalHasCostManagement = roles.some(r => r.roleDefinitionName === 'Cost Management Reader');
        
        console.log('✅ Final role verification:');
        roles.forEach(r => {
          console.log(`  - ${r.roleDefinitionName}`);
        });
      } catch (e) {
        console.error('Error parsing roles in final verification:', e);
      }
    }
    
    if (finalHasReader && finalHasCostManagement) {
      updateStep(sessionId, 'Final role verification', 'completed', `All required roles confirmed: Reader ✓, Cost Management Reader ✓`);
      session.status = 'permissions_assigned';
    } else {
      const roleStatus = [];
      if (finalHasReader) roleStatus.push('Reader ✓');
      else roleStatus.push('Reader (missing)');
      if (finalHasCostManagement) roleStatus.push('Cost Management Reader ✓');
      else roleStatus.push('Cost Management Reader (missing)');
      
      updateStep(sessionId, 'Final role verification', 'completed', `Status: ${roleStatus.join(', ')}`);
      session.status = finalHasReader || finalHasCostManagement ? 'permissions_partial' : 'permissions_failed';
    }
    
    // Logout
    await executeCommand('az logout');
    
  } catch (error) {
    console.error('Permission assignment error:', error);
    session.status = 'permission_failed';
    addStep(sessionId, 'Permission assignment failed', 'failed', error.message);
    await executeCommand('az logout');
  }
}

// Helper functions
function addStep(sessionId, title, status, message = '') {
  const session = switchingSessions.get(sessionId);
  if (!session) return;
  
  session.steps.push({
    title,
    status, // 'pending', 'running', 'completed', 'failed', 'warning'
    message,
    timestamp: new Date().toISOString()
  });
}

function updateStep(sessionId, title, status, message) {
  const session = switchingSessions.get(sessionId);
  if (!session) return;
  
  const step = session.steps.find(s => s.title === title);
  if (step) {
    step.status = status;
    step.message = message;
    step.timestamp = new Date().toISOString();
  }
}

function executeCommand(command, maskOutput = false, timeoutMs = 45000) {
  return new Promise((resolve) => {
    console.log(`🔧 Executing command: ${maskOutput ? command.replace(/(-p|--password)\s+"[^"]+"/g, '$1 "***"') : command}`);
    const startTime = Date.now();
    
    const childProcess = spawn(command, {
      shell: true,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    let timedOut = false;
    let hasOutput = false;
    
    childProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      hasOutput = true;
      if (!maskOutput) {
        console.log(`📤 stdout: ${chunk.substring(0, 200)}`);
      }
    });
    
    childProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      error += chunk;
      hasOutput = true;
      if (!maskOutput) {
        console.log(`📤 stderr: ${chunk.substring(0, 200)}`);
      }
      
      // Detect immediate authentication failures
      if (chunk.includes('AADSTS') || chunk.includes('authentication failed') || chunk.includes('invalid_client')) {
        console.error(`🚨 Authentication error detected immediately, killing process`);
        childProcess.kill('SIGTERM');
      }
    });
    
    childProcess.on('close', (code) => {
      if (!timedOut) {
        const duration = Date.now() - startTime;
        console.log(`✅ Command completed with code: ${code} in ${duration}ms`);
        resolve({
          code,
          output: maskOutput ? '***' : output,
          error: error
        });
      }
    });
    
    childProcess.on('error', (err) => {
      if (!timedOut) {
        console.error(`❌ Command error: ${err.message}`);
        resolve({
          code: 1,
          output: '',
          error: err.message
        });
      }
    });
    
    // Timeout after specified ms (default 45 seconds)
    const timeout = setTimeout(() => {
      timedOut = true;
      const duration = Date.now() - startTime;
      console.error(`⏱️ Command timeout after ${duration}ms (limit: ${timeoutMs}ms)`);
      console.error(`   Has output: ${hasOutput ? 'Yes' : 'No - likely hanging'}`);
      
      childProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!childProcess.killed) {
          console.error(`   Force killing with SIGKILL`);
          childProcess.kill('SIGKILL');
        }
      }, 2000);
      
      resolve({
        code: 1,
        output: '',
        error: hasOutput 
          ? `Command timeout after ${timeoutMs / 1000} seconds. Check credentials and network connectivity.`
          : `Command timeout - no response from Azure. Possible causes: wrong credentials, network issues, or Azure service unavailable.`
      });
    }, timeoutMs);
    
    // Clear timeout if process completes
    childProcess.on('exit', () => {
      clearTimeout(timeout);
    });
  });
}

// Cleanup old sessions (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of switchingSessions.entries()) {
    const lastStep = session.steps[session.steps.length - 1];
    if (lastStep) {
      const stepTime = new Date(lastStep.timestamp).getTime();
      if (now - stepTime > 600000) { // 10 minutes
        switchingSessions.delete(sessionId);
      }
    }
  }
}, 600000);

module.exports = router;

