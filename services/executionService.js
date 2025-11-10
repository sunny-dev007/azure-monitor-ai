const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Execution Service for Running Azure CLI Commands and Terraform
 * Enables autonomous execution of resource cloning operations
 */
class ExecutionService {
  constructor() {
    this.executions = new Map(); // Store execution sessions
  }
  
  /**
   * Execute Azure CLI commands with real-time progress
   */
  async executeAzureCLI(sessionId, script, options = {}) {
    const execution = {
      sessionId,
      type: 'azure-cli',
      status: 'running',
      steps: [],
      startTime: Date.now(),
      output: [],
      errors: []
    };
    
    this.executions.set(sessionId, execution);
    
    try {
      // Step 1: Authenticate with Azure CLI using service principal
      console.log(`🔐 Authenticating with Azure CLI...`);
      const authResult = await this.authenticateAzureCLI();
      
      if (!authResult.success) {
        execution.status = 'failed';
        execution.errors.push({
          step: 0,
          command: 'Azure CLI Authentication',
          error: authResult.error
        });
        console.error(`❌ Azure CLI authentication failed: ${authResult.error}`);
        return execution;
      }
      
      console.log(`✅ Azure CLI authenticated successfully`);
      
      // Step 2: Clean and prepare script
      const cleanedScript = this.cleanAIGeneratedScript(script);
      
      console.log(`🚀 Starting Azure CLI execution: ${sessionId}`);
      console.log(`📝 Cleaned script ready for execution`);
      
      // Save script to temporary file to avoid quote escaping issues
      const tmpDir = path.join(__dirname, '..', 'tmp');
      await fs.mkdir(tmpDir, { recursive: true });
      
      const scriptFile = path.join(tmpDir, `${sessionId}.sh`);
      await fs.writeFile(scriptFile, cleanedScript, { mode: 0o755 });
      
      console.log(`💾 Script saved to: ${scriptFile}`);
      
      // Add execution step
      const step = {
        index: 1,
        command: `bash ${scriptFile}`,
        status: 'running',
        output: '',
        error: '',
        startTime: Date.now()
      };
      
      execution.steps.push(step);
      
      console.log(`📝 Executing script file...`);
      
      // Execute the script file
      const result = await this.runCommand(`bash "${scriptFile}"`, options);
      
      // Update step
      step.status = result.code === 0 ? 'completed' : 'failed';
      step.output = result.output;
      step.error = result.error;
      step.duration = Date.now() - step.startTime;
      
      execution.output.push(result.output);
      
      if (result.code !== 0) {
        // Script failed
        step.status = 'failed';
        execution.status = 'failed';
        execution.errors.push({
          step: 1,
          command: 'Script execution',
          error: result.error
        });
        
        console.error(`❌ Script execution failed: ${result.error}`);
      } else {
        console.log(`✅ Script executed successfully`);
      }
      
      // Cleanup temporary file
      try {
        await fs.unlink(scriptFile);
        console.log(`🗑️ Cleaned up temporary script file`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${cleanupError.message}`);
      }
      
      // Mark as completed if no errors
      if (execution.status !== 'failed') {
        execution.status = 'completed';
      }
      
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      
      console.log(`✅ Execution ${sessionId} finished: ${execution.status}`);
      
      return execution;
      
    } catch (error) {
      console.error(`❌ Execution error: ${error.message}`);
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      throw error;
    }
  }
  
  /**
   * Authenticate Azure CLI using service principal from .env
   */
  async authenticateAzureCLI() {
    try {
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const tenantId = process.env.AZURE_TENANT_ID;
      const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
      
      if (!clientId || !clientSecret || !tenantId || !subscriptionId) {
        return {
          success: false,
          error: 'Azure credentials not found in .env file. Please configure AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, and AZURE_SUBSCRIPTION_ID.'
        };
      }
      
      console.log(`🔐 Logging in to Azure CLI with service principal...`);
      console.log(`   Tenant ID: ${tenantId}`);
      console.log(`   Client ID: ${clientId}`);
      console.log(`   Subscription ID: ${subscriptionId}`);
      
      // Step 1: Login with service principal
      const loginCmd = `az login --service-principal -u "${clientId}" -p "${clientSecret}" --tenant "${tenantId}" --allow-no-subscriptions --output json`;
      const loginResult = await this.runCommand(loginCmd, { timeout: 60000 });
      
      if (loginResult.code !== 0) {
        return {
          success: false,
          error: `Azure CLI login failed: ${loginResult.error}`
        };
      }
      
      console.log(`✅ Logged in to Azure CLI`);
      
      // Step 2: Set the subscription
      const setSubCmd = `az account set --subscription "${subscriptionId}"`;
      const setSubResult = await this.runCommand(setSubCmd, { timeout: 30000 });
      
      if (setSubResult.code !== 0) {
        return {
          success: false,
          error: `Failed to set subscription: ${setSubResult.error}`
        };
      }
      
      console.log(`✅ Subscription set to: ${subscriptionId}`);
      
      // Step 3: Refresh access token to ensure we have fresh credentials
      console.log(`🔄 Refreshing Azure access token...`);
      const refreshCmd = `az account get-access-token --output json`;
      const refreshResult = await this.runCommand(refreshCmd, { timeout: 30000 });
      
      if (refreshResult.code !== 0) {
        console.warn(`⚠️ Warning: Failed to refresh token, but proceeding anyway`);
      } else {
        console.log(`✅ Access token refreshed`);
      }
      
      // Step 4: Verify authentication
      const verifyCmd = `az account show --output json`;
      const verifyResult = await this.runCommand(verifyCmd, { timeout: 30000 });
      
      if (verifyResult.code !== 0) {
        return {
          success: false,
          error: `Failed to verify authentication: ${verifyResult.error}`
        };
      }
      
      console.log(`✅ Azure CLI authentication verified`);
      
      // Step 5: Check service principal permissions
      console.log(`🔍 Checking service principal roles...`);
      const rolesCmd = `az role assignment list --assignee "${clientId}" --subscription "${subscriptionId}" --output json`;
      const rolesResult = await this.runCommand(rolesCmd, { timeout: 30000 });
      
      if (rolesResult.code === 0 && rolesResult.output) {
        try {
          const roles = JSON.parse(rolesResult.output);
          const roleNames = roles.map(r => r.roleDefinitionName);
          console.log(`📋 Assigned roles: ${roleNames.join(', ')}`);
          
          const hasContributor = roles.some(r => 
            r.roleDefinitionName === 'Contributor' || 
            r.roleDefinitionName === 'Owner'
          );
          
          if (!hasContributor) {
            console.warn(`\n⚠️ ═══════════════════════════════════════════════════════════════`);
            console.warn(`⚠️  INSUFFICIENT PERMISSIONS FOR RESOURCE CREATION`);
            console.warn(`⚠️ ═══════════════════════════════════════════════════════════════`);
            console.warn(`⚠️  The service principal has: ${roleNames.join(', ')}`);
            console.warn(`⚠️  Required for AI Agent: Contributor or Owner`);
            console.warn(`⚠️  \n⚠️  Current capabilities:`);
            console.warn(`⚠️    ✅ Read subscription data`);
            console.warn(`⚠️    ✅ View resources`);
            console.warn(`⚠️    ✅ View costs`);
            console.warn(`⚠️    ❌ Create/modify resources (AI Agent cloning)`);
            console.warn(`⚠️  \n⚠️  To enable AI Agent resource cloning, assign Contributor role:`);
            console.warn(`⚠️    az role assignment create \\`);
            console.warn(`⚠️      --assignee "${clientId}" \\`);
            console.warn(`⚠️      --role "Contributor" \\`);
            console.warn(`⚠️      --subscription "${subscriptionId}"`);
            console.warn(`⚠️ ═══════════════════════════════════════════════════════════════\n`);
          } else {
            console.log(`✅ Service principal has ${roleNames.find(r => r === 'Contributor' || r === 'Owner')} role - can create resources`);
          }
        } catch (e) {
          console.warn(`⚠️ Could not parse role assignments: ${e.message}`);
        }
      }
      
      return {
        success: true,
        message: 'Azure CLI authenticated successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Authentication error: ${error.message}`
      };
    }
  }
  
  /**
   * Execute Terraform with real-time progress
   */
  async executeTerraform(sessionId, terraformConfig, options = {}) {
    const execution = {
      sessionId,
      type: 'terraform',
      status: 'running',
      steps: [],
      startTime: Date.now(),
      output: [],
      errors: []
    };
    
    this.executions.set(sessionId, execution);
    
    try {
      // Create temporary directory for terraform files
      const tmpDir = path.join(__dirname, '..', 'tmp', sessionId);
      await fs.mkdir(tmpDir, { recursive: true });
      
      // Write terraform configuration
      const tfFile = path.join(tmpDir, 'main.tf');
      await fs.writeFile(tfFile, terraformConfig);
      
      console.log(`🚀 Starting Terraform execution: ${sessionId}`);
      console.log(`   Working directory: ${tmpDir}`);
      
      // Step 1: terraform init
      let step = {
        index: 1,
        command: 'terraform init',
        status: 'running',
        output: '',
        error: '',
        startTime: Date.now()
      };
      execution.steps.push(step);
      
      console.log('📝 Step 1: terraform init');
      let result = await this.runCommand('terraform init', { cwd: tmpDir });
      step.status = result.code === 0 ? 'completed' : 'failed';
      step.output = result.output;
      step.error = result.error;
      step.duration = Date.now() - step.startTime;
      execution.output.push(result.output);
      
      if (result.code !== 0) {
        execution.status = 'failed';
        execution.errors.push({ step: 1, error: result.error });
        throw new Error('Terraform init failed: ' + result.error);
      }
      
      console.log('✅ Step 1 completed');
      
      // Step 2: terraform plan
      step = {
        index: 2,
        command: 'terraform plan',
        status: 'running',
        output: '',
        error: '',
        startTime: Date.now()
      };
      execution.steps.push(step);
      
      console.log('📝 Step 2: terraform plan');
      result = await this.runCommand('terraform plan -out=tfplan', { cwd: tmpDir });
      step.status = result.code === 0 ? 'completed' : 'failed';
      step.output = result.output;
      step.error = result.error;
      step.duration = Date.now() - step.startTime;
      execution.output.push(result.output);
      
      if (result.code !== 0) {
        execution.status = 'failed';
        execution.errors.push({ step: 2, error: result.error });
        throw new Error('Terraform plan failed: ' + result.error);
      }
      
      console.log('✅ Step 2 completed');
      
      // Step 3: terraform apply (only if not dry-run)
      if (!options.dryRun) {
        step = {
          index: 3,
          command: 'terraform apply',
          status: 'running',
          output: '',
          error: '',
          startTime: Date.now()
        };
        execution.steps.push(step);
        
        console.log('📝 Step 3: terraform apply');
        result = await this.runCommand('terraform apply -auto-approve tfplan', { cwd: tmpDir });
        step.status = result.code === 0 ? 'completed' : 'failed';
        step.output = result.output;
        step.error = result.error;
        step.duration = Date.now() - step.startTime;
        execution.output.push(result.output);
        
        if (result.code !== 0) {
          execution.status = 'failed';
          execution.errors.push({ step: 3, error: result.error });
          throw new Error('Terraform apply failed: ' + result.error);
        }
        
        console.log('✅ Step 3 completed');
      }
      
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      
      console.log(`✅ Terraform execution ${sessionId} completed successfully`);
      
      // Cleanup (optional)
      if (options.cleanup) {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
      
      return execution;
      
    } catch (error) {
      console.error(`❌ Terraform execution error: ${error.message}`);
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      throw error;
    }
  }
  
  /**
   * Run a single command
   */
  runCommand(command, options = {}) {
    return new Promise((resolve) => {
      console.log(`🔧 Executing: ${this.maskSensitiveData(command).substring(0, 150)}`);
      
      const startTime = Date.now();
      const childProcess = spawn(command, {
        shell: true,
        cwd: options.cwd || process.cwd(),
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      let timedOut = false;
      
      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(`  📤 ${chunk.substring(0, 200)}`);
      });
      
      childProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        // Some Azure CLI commands output to stderr even on success
        console.log(`  📤 ${chunk.substring(0, 200)}`);
      });
      
      childProcess.on('close', (code) => {
        if (!timedOut) {
          const duration = Date.now() - startTime;
          console.log(`  ⏱️ Command completed with code ${code} in ${duration}ms`);
          resolve({
            code,
            output,
            error,
            duration
          });
        }
      });
      
      childProcess.on('error', (err) => {
        if (!timedOut) {
          console.error(`  ❌ Command error: ${err.message}`);
          resolve({
            code: 1,
            output: '',
            error: err.message,
            duration: Date.now() - startTime
          });
        }
      });
      
      // Timeout (default 5 minutes for long operations)
      const timeout = setTimeout(() => {
        timedOut = true;
        console.error(`  ⏱️ Command timeout after ${options.timeout || 300000}ms`);
        childProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 2000);
        
        resolve({
          code: 1,
          output,
          error: 'Command timeout - execution took too long',
          duration: Date.now() - startTime
        });
      }, options.timeout || 300000); // 5 minutes default
      
      childProcess.on('exit', () => {
        clearTimeout(timeout);
      });
    });
  }
  
  /**
   * Parse script into individual commands
   */
  parseScript(script) {
    // First, clean the script from AI-generated prose and markdown
    let cleanedScript = this.cleanAIGeneratedScript(script);
    
    // Split by lines and handle multi-line commands (ending with \)
    const lines = cleanedScript.split('\n');
    const commands = [];
    let currentCommand = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        if (currentCommand) {
          commands.push(currentCommand);
          currentCommand = '';
        }
        continue;
      }
      
      // Handle comments
      if (trimmed.startsWith('#')) {
        continue;
      }
      
      // Skip non-shell lines (AI explanations, prose, etc.)
      if (!this.isValidShellLine(trimmed)) {
        continue;
      }
      
      // Handle multi-line commands (ending with \)
      if (trimmed.endsWith('\\')) {
        currentCommand += trimmed.slice(0, -1) + ' ';
        continue;
      }
      
      // Add to current command
      currentCommand += trimmed;
      
      // Complete command
      commands.push(currentCommand);
      currentCommand = '';
    }
    
    // Add any remaining command
    if (currentCommand) {
      commands.push(currentCommand);
    }
    
    return commands.filter(cmd => cmd.trim() && !cmd.trim().startsWith('#'));
  }
  
  /**
   * Clean AI-generated script from prose, markdown, and explanatory text
   * SUPER NUCLEAR MODE - Extract ONLY valid bash lines, remove ALL prose
   */
  cleanAIGeneratedScript(script) {
    console.log('🧹 Cleaning AI-generated script (SUPER NUCLEAR MODE - ABSOLUTE MAXIMUM AGGRESSION)...');
    console.log(`📝 Original script length: ${script.length} characters`);
    console.log(`📝 First 300 chars: ${script.substring(0, 300)}`);
    
    let cleaned = script;
    
    // STEP 0: CRITICAL - Remove common AI response prefixes
    const prefixPatterns = [
      /^Below is.*?(?=```|#!|$)/is,
      /^Here is.*?(?=```|#!|$)/is,
      /^Here's.*?(?=```|#!|$)/is,
      /^Great!.*?(?=```|#!|$)/is,
      /^Perfect!.*?(?=```|#!|$)/is,
      /^.*?requested bash script.*?(?=```|#!|$)/is,
    ];
    
    for (const pattern of prefixPatterns) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, '');
      if (before !== cleaned) {
        console.log(`✂️ Removed AI response prefix matching: ${pattern.source.substring(0, 50)}...`);
        break;
      }
    }
    
    // STEP 1: Try to extract from markdown code fences FIRST
    const markdownMatch = cleaned.match(/```(?:bash|sh|shell)?\s*\n([\s\S]*?)```/);
    if (markdownMatch && markdownMatch[1]) {
      console.log(`✅ Found script in markdown code fence`);
      cleaned = markdownMatch[1];
      console.log(`📝 Extracted from markdown, length: ${cleaned.length}`);
    } else {
      console.log(`⚠️ No markdown fence found, using aggressive extraction`);
      
      // Remove ALL markdown fences manually
      cleaned = cleaned.replace(/```(?:bash|sh|shell)?\s*\n?/gm, '');
      cleaned = cleaned.replace(/```\s*/gm, '');
    }
    
    // STEP 2: SUPER NUCLEAR OPTION - Find shebang and remove EVERYTHING before it
    const shebangMatch = cleaned.match(/^#!\/bin\/(ba)?sh/m);
    if (shebangMatch && shebangMatch.index !== undefined && shebangMatch.index > 0) {
      console.log(`✂️ Found shebang at position ${shebangMatch.index}, removing ${shebangMatch.index} chars before it`);
      console.log(`✂️ Removed text: "${cleaned.substring(0, Math.min(shebangMatch.index, 200))}..."`);
      cleaned = cleaned.substring(shebangMatch.index);
    } else if (shebangMatch) {
      console.log(`✅ Shebang found at start of script`);
    } else {
      console.log(`⚠️ No shebang found, will extract valid bash lines only`);
    }
    
    // STEP 3: NUCLEAR LINE-BY-LINE FILTERING - Keep ONLY valid bash lines
    const lines = cleaned.split('\n');
    const filteredLines = [];
    let foundShebang = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Always keep shebang
      if (trimmed.startsWith('#!/')) {
        filteredLines.push(line);
        foundShebang = true;
        console.log(`✅ Line ${i + 1}: Kept shebang`);
        continue;
      }
      
      // Keep empty lines (for structure)
      if (!trimmed) {
        if (foundShebang && filteredLines.length > 0) {
          filteredLines.push(line);
        }
        continue;
      }
      
      // Keep shell comments (but not markdown headers)
      if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
        filteredLines.push(line);
        console.log(`✅ Line ${i + 1}: Kept comment`);
        continue;
      }
      
      // CRITICAL: Check if it's VALID SHELL FIRST (before checking for prose)
      // This ensures echo, return, etc. are kept even if they contain prose-like text
      if (this.isValidShellLine(trimmed)) {
        filteredLines.push(line);
        console.log(`✅ Line ${i + 1}: Kept valid shell line`);
        continue;
      }
      
      // Only check for prose if it's NOT a valid shell line
      if (this.isProse(trimmed)) {
        console.log(`❌ Line ${i + 1}: REJECTED prose: "${trimmed.substring(0, 60)}..."`);
        continue;
      }
      
      // Everything else is REJECTED
      console.log(`❌ Line ${i + 1}: REJECTED (not valid bash): "${trimmed.substring(0, 60)}..."`);
    }
    
    console.log(`\n📊 Filtering summary:`);
    console.log(`  Original lines: ${lines.length}`);
    console.log(`  Kept lines: ${filteredLines.length}`);
    console.log(`  Rejected lines: ${lines.length - filteredLines.length}`);
    
    let cleanedScript = filteredLines.join('\n');
    
    // CRITICAL: Remove explanatory sections AFTER the script
    // Look for common markers that indicate the script has ended
    const explanationMarkers = [
      '### Explanation of the Script:',
      '### Explanation:',
      '## Explanation:',
      '# Explanation:',
      '### Notes:',
      '### Usage:',
      '### How it works:',
      '### Key Features:',
      '### How to Use:',
      '### Requirements:',
      'Explanation of the Script:',
      'This script',
      'The script',
      'Note:',
      'Important:',
      'Save this script',
      'Run this script',
    ];
    
    for (const marker of explanationMarkers) {
      const markerIndex = cleanedScript.indexOf(marker);
      if (markerIndex !== -1) {
        console.log(`✂️ Removing explanation section after script (found "${marker}" at position ${markerIndex})`);
        const removed = cleanedScript.substring(markerIndex, markerIndex + 100);
        console.log(`✂️ Removed section starts with: "${removed}..."`);
        cleanedScript = cleanedScript.substring(0, markerIndex).trim();
        break;
      }
    }
    
    // Ensure script starts with shebang
    if (!cleanedScript.trim().startsWith('#!')) {
      cleanedScript = '#!/bin/bash\n\n' + cleanedScript;
      console.log(`✅ Added shebang to script`);
    }
    
    console.log(`✨ Cleaned script length: ${cleanedScript.length} characters`);
    console.log(`📊 Removed ${script.length - cleanedScript.length} characters of prose`);
    
    // CRITICAL: Check if prose still exists in cleaned script
    const proseCheck = [
      'Below is',
      'Here is',
      'This script',
      'The script',
      'I have',
      'I\'ve',
      'will use',
      'will create',
      'uses Azure CLI',
      'includes error',
      '### Explanation',
      '## Explanation',
      '### Notes',
      '### Usage',
      '**Error Handling**',
      '**Idempotency**',
      '**Dependencies**',
      '**Validation**',
    ];
    
    for (const phrase of proseCheck) {
      if (cleanedScript.toLowerCase().includes(phrase.toLowerCase())) {
        console.error(`❌ CRITICAL: Prose still present in cleaned script: "${phrase}"`);
        console.error(`📝 First 500 chars of cleaned script:`);
        console.error(cleanedScript.substring(0, 500));
        console.error(`\n📝 First 500 chars of original script:`);
        console.error(script.substring(0, 500));
        throw new Error(`Script cleaning failed: AI prose "${phrase}" still present. Please regenerate the script.`);
      }
    }
    
    // Validate the cleaned script has content
    const nonEmptyLines = cleanedScript.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });
    
    if (nonEmptyLines.length === 0) {
      console.error(`❌ Cleaned script has no executable commands!`);
      console.error(`Original script: ${script.substring(0, 500)}`);
      throw new Error('Script cleaning removed all executable commands. Please check the script format.');
    }
    
    console.log(`✅ Validated: ${nonEmptyLines.length} executable lines`);
    console.log(`✅ No prose detected in cleaned script`);
    
    return cleanedScript;
  }
  
  /**
   * Check if a line is prose (not shell code)
   * NUCLEAR MODE - Very aggressive detection
   */
  isProse(line) {
    const trimmed = line.trim();
    
    if (!trimmed) return false;
    
    // CRITICAL: Common AI response patterns
    const criticalProsePatterns = [
      /^Below is/i,
      /^Here is/i,
      /^Here's/i,
      /^This is/i,
      /^This script/i,
      /^The script/i,
      /^I've/i,
      /^I have/i,
      /^Let me/i,
      /^Great!/i,
      /^Perfect!/i,
    ];
    
    for (const pattern of criticalProsePatterns) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }
    
    // Markdown headers (##, ###, etc.)
    if (/^#{2,}/.test(trimmed)) {
      return true;
    }
    
    // Bold markdown (**text**)
    if (/\*\*/.test(trimmed)) {
      return true;
    }
    
    // Prose indicators
    const proseIndicators = [
      // Common prose words/phrases at start
      /^(?:Below|Here|This|The|In|To|For|With|Using|After|Before|First|Second|Next|Finally|Note|Important|Explanation|Usage)\b/i,
      /\b(?:script|will|ensures|includes|provides|uses|creates|clones|deploys)\b.*\b(?:the|your|all|any)\b/i,
      /\b(?:from|to|in|on|at|with|for)\b.*\b(?:source|target|location|region|subscription)\b/i,
      
      // Full sentences (has subject, verb, and ends with period)
      /^[A-Z].+\s.+\.$/,
      
      // Questions
      /\?$/,
      
      // Lists with dashes or bullets
      /^[-*•]\s+/,
      
      // Numbered lists that aren't step comments
      /^\d+\.\s+[a-z]/,
      /^\d+\.\s+\*\*/,  // Numbered list with bold
    ];
    
    for (const indicator of proseIndicators) {
      if (indicator.test(trimmed)) {
        return true;
      }
    }
    
    // If it contains no shell operators and no assignment, likely prose
    const hasShellSyntax = /[=|<>&$();]/.test(trimmed) || 
                           trimmed.startsWith('#') ||
                           trimmed.startsWith('az ') ||
                           trimmed.startsWith('terraform ') ||
                           trimmed.startsWith('echo ') ||
                           trimmed.startsWith('export ') ||
                           trimmed.startsWith('local ') ||
                           trimmed.startsWith('if ') ||
                           trimmed.startsWith('then') ||
                           trimmed.startsWith('else') ||
                           trimmed.startsWith('fi') ||
                           trimmed.startsWith('for ') ||
                           trimmed.startsWith('while ') ||
                           trimmed.startsWith('function ') ||
                           /^[a-z_][a-z0-9_]*\(\)/.test(trimmed);
    
    // If no shell syntax and contains common English words, it's prose
    if (!hasShellSyntax && /\b(?:the|is|are|will|be|from|to|in|with|for|and|or)\b/i.test(trimmed)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a line is a valid shell command/statement
   * ENHANCED - Comprehensive detection including multi-line commands
   */
  isValidShellLine(line) {
    const trimmed = line.trim();
    
    // Empty or comment
    if (!trimmed || trimmed.startsWith('#')) {
      return true; // Comments are valid
    }
    
    // Multi-line continuation (previous line ends with \)
    // Check if this line is a continuation of a multi-line command
    if (trimmed.startsWith('--')) {
      return true; // Command flags (e.g., --name, --resource-group)
    }
    
    // Line is just a quoted string (argument to previous command)
    if (/^"[^"]*"$/.test(trimmed) || /^'[^']*'$/.test(trimmed)) {
      return true;
    }
    
    // Line ends with backslash (continuation line)
    if (trimmed.endsWith('\\')) {
      return true;
    }
    
    // Variable assignment (any case)
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(trimmed)) {
      return true;
    }
    
    // Local variable
    if (/^local\s+/.test(trimmed)) {
      return true;
    }
    
    // Function definition
    if (/^[a-z_][a-z0-9_]*\(\)\s*\{?/.test(trimmed)) {
      return true;
    }
    
    // Function call (lowercase_function_name with spaces or arguments)
    if (/^[a-z_][a-z0-9_]*(\s|$)/.test(trimmed)) {
      return true;
    }
    
    // Closing brace (end of function/block)
    if (trimmed === '}') {
      return true;
    }
    
    // Opening brace (start of block)
    if (trimmed === '{') {
      return true;
    }
    
    // Return statement (with or without value)
    if (/^return(\s|$)/.test(trimmed)) {
      return true;
    }
    
    // Test/condition brackets
    if (trimmed.startsWith('[') || trimmed.startsWith('[[')) {
      return true;
    }
    
    // Common shell commands
    const shellCommands = [
      'az', 'terraform', 'echo', 'export', 'cd', 'mkdir', 'rm', 'cp', 'mv',
      'cat', 'grep', 'awk', 'sed', 'curl', 'wget', 'git', 'npm', 'node',
      'python', 'pip', 'docker', 'kubectl', 'helm', 'make', 'chmod', 'chown',
      'sudo', 'apt', 'yum', 'brew', 'source', 'eval', 'sleep', 'wait', 'for',
      'if', 'while', 'do', 'done', 'then', 'fi', 'case', 'esac', 'function',
      'exit', 'break', 'continue', 'shift', 'read', 'set', 'unset', 'test'
    ];
    
    for (const cmd of shellCommands) {
      if (trimmed.startsWith(cmd + ' ') || trimmed === cmd) {
        return true;
      }
    }
    
    // Control structures (including standalone keywords)
    if (/^(if|then|else|elif|fi|for|while|do|done|case|esac)(\s|$)/.test(trimmed)) {
      return true;
    }
    
    // Pipes and redirects
    if (trimmed.includes('|') || trimmed.includes('>') || trimmed.includes('<') || trimmed.includes('&>')) {
      return true;
    }
    
    // Command substitution or subshell
    if (trimmed.includes('$(') || trimmed.includes('`')) {
      return true;
    }
    
    // Boolean operators
    if (trimmed.includes('&&') || trimmed.includes('||')) {
      return true;
    }
    
    // If it doesn't match any pattern, it's likely prose
    return false;
  }
  
  /**
   * Mask sensitive data in commands
   */
  maskSensitiveData(command) {
    return command
      .replace(/(-p|--password)\s+"[^"]+"/g, '$1 "***"')
      .replace(/(--secret)\s+"[^"]+"/g, '$1 "***"')
      .replace(/(--key)\s+"[^"]+"/g, '$1 "***"');
  }
  
  /**
   * Get execution status
   */
  getExecution(sessionId) {
    return this.executions.get(sessionId);
  }
  
  /**
   * Cancel execution
   */
  async cancelExecution(sessionId) {
    const execution = this.executions.get(sessionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      
      console.log(`🛑 Execution ${sessionId} cancelled`);
      
      return true;
    }
    return false;
  }
  
  /**
   * Cleanup old executions (older than 1 hour)
   */
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, execution] of this.executions.entries()) {
      if (execution.endTime && execution.endTime < oneHourAgo) {
        this.executions.delete(sessionId);
        console.log(`🧹 Cleaned up execution: ${sessionId}`);
      }
    }
  }
}

// Cleanup old executions every 30 minutes
const executionService = new ExecutionService();
setInterval(() => {
  executionService.cleanup();
}, 30 * 60 * 1000);

module.exports = executionService;

