import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Search,
  Copy,
  Download,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Loader,
  MessageSquare,
  Code,
  FileCode,
  DollarSign,
  GitBranch,
  Server,
  Database,
  Network,
  HardDrive,
  Cpu,
  Send,
  RefreshCw,
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AIAgent = () => {
  // State
  const [resourceGroups, setResourceGroups] = useState([]);
  const [selectedResourceGroup, setSelectedResourceGroup] = useState('');
  const [targetResourceGroup, setTargetResourceGroup] = useState('');
  const [discoveredResources, setDiscoveredResources] = useState(null);
  const [analysisStrategy, setAnalysisStrategy] = useState(null);
  const [generatedScripts, setGeneratedScripts] = useState({ terraform: null, cli: null });
  const [costEstimate, setCostEstimate] = useState(null);
  const [loading, setLoading] = useState({ discover: false, analyze: false, terraform: false, cli: false, cost: false });
  const [currentStep, setCurrentStep] = useState('select'); // select, discover, analyze, generate
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your Azure AI Agent. I can help you clone entire resource groups with all their resources and configurations. What would you like to do today?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  // Execution state
  const [executionSession, setExecutionSession] = useState(null);
  const [executionData, setExecutionData] = useState(null);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executionType, setExecutionType] = useState(null); // 'terraform' or 'cli'
  const [executionPolling, setExecutionPolling] = useState(null);
  
  // Load resource groups on mount
  useEffect(() => {
    loadResourceGroups();
  }, []);
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  /**
   * Load available resource groups
   */
  const loadResourceGroups = async () => {
    try {
      const response = await axios.get('/api/ai-agent/resource-groups');
      if (response.data.success) {
        setResourceGroups(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load resource groups:', error);
      toast.error('Failed to load resource groups');
    }
  };
  
  /**
   * Discover resources in selected resource group
   */
  const handleDiscover = async () => {
    if (!selectedResourceGroup) {
      toast.error('Please select a resource group');
      return;
    }
    
    setLoading({ ...loading, discover: true });
    setCurrentStep('discover');
    
    try {
      const response = await axios.post('/api/ai-agent/discover', {
        resourceGroupName: selectedResourceGroup
      });
      
      if (response.data.success) {
        setDiscoveredResources(response.data.data);
        toast.success(`Discovered ${response.data.data.totalResources} resources!`);
        
        // Add to chat
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ I found ${response.data.data.totalResources} resources in "${selectedResourceGroup}". Ready to analyze and generate cloning strategy!`
        }]);
      }
    } catch (error) {
      console.error('Discovery failed:', error);
      toast.error('Failed to discover resources');
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Failed to discover resources: ${error.response?.data?.message || error.message}`
      }]);
    } finally {
      setLoading({ ...loading, discover: false });
    }
  };
  
  /**
   * Analyze resources and generate strategy
   */
  const handleAnalyze = async () => {
    if (!discoveredResources || !targetResourceGroup) {
      toast.error('Please provide target resource group name');
      return;
    }
    
    setLoading({ ...loading, analyze: true });
    setCurrentStep('analyze');
    
    try {
      const response = await axios.post('/api/ai-agent/analyze', {
        resourceGroupData: discoveredResources,
        targetResourceGroupName: targetResourceGroup
      });
      
      if (response.data.success) {
        setAnalysisStrategy(response.data.data);
        toast.success('Analysis complete!');
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎯 Analysis complete! I've identified the resources, dependencies, and deployment order. Ready to generate scripts?`
        }]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze resources');
    } finally {
      setLoading({ ...loading, analyze: false });
    }
  };
  
  /**
   * Generate Terraform configuration
   */
  const handleGenerateTerraform = async () => {
    if (!discoveredResources) return;
    
    setLoading({ ...loading, terraform: true });
    setCurrentStep('generate');
    
    try {
      const response = await axios.post('/api/ai-agent/generate-terraform', {
        resourceGroupData: discoveredResources,
        targetResourceGroupName: targetResourceGroup
      });
      
      if (response.data.success) {
        setGeneratedScripts({ ...generatedScripts, terraform: response.data.data });
        toast.success('Terraform configuration generated!');
      }
    } catch (error) {
      console.error('Terraform generation failed:', error);
      toast.error('Failed to generate Terraform');
    } finally {
      setLoading({ ...loading, terraform: false });
    }
  };
  
  /**
   * Generate Azure CLI script
   */
  const handleGenerateCLI = async () => {
    if (!discoveredResources) return;
    
    setLoading({ ...loading, cli: true });
    setCurrentStep('generate');
    
    try {
      const response = await axios.post('/api/ai-agent/generate-cli', {
        resourceGroupData: discoveredResources,
        targetResourceGroupName: targetResourceGroup
      });
      
      if (response.data.success) {
        setGeneratedScripts({ ...generatedScripts, cli: response.data.data });
        toast.success('Azure CLI script generated!');
      }
    } catch (error) {
      console.error('CLI generation failed:', error);
      toast.error('Failed to generate CLI script');
    } finally {
      setLoading({ ...loading, cli: false });
    }
  };
  
  /**
   * Estimate cost
   */
  const handleEstimateCost = async () => {
    if (!discoveredResources) return;
    
    setLoading({ ...loading, cost: true });
    
    try {
      const response = await axios.post('/api/ai-agent/estimate-cost', {
        resourceGroupData: discoveredResources
      });
      
      if (response.data.success) {
        setCostEstimate(response.data.data);
        toast.success('Cost estimate ready!');
      }
    } catch (error) {
      console.error('Cost estimation failed:', error);
      toast.error('Failed to estimate cost');
    } finally {
      setLoading({ ...loading, cost: false });
    }
  };
  
  /**
   * Execute Azure CLI script
   */
  const handleExecuteCLI = async () => {
    if (!generatedScripts.cli) return;
    
    // Show confirmation
    const confirmed = window.confirm(
      `⚠️ EXECUTE AZURE CLI SCRIPT?\n\n` +
      `This will create REAL Azure resources in your account.\n\n` +
      `Target Resource Group: ${targetResourceGroup}\n` +
      `Resources to create: ${discoveredResources?.totalResources || 0}\n\n` +
      `Are you sure you want to proceed?`
    );
    
    if (!confirmed) return;
    
    try {
      toast.loading('Starting execution...', { id: 'execute-cli' });
      
      const response = await axios.post('/api/ai-agent/execute-cli', {
        script: generatedScripts.cli.script,
        options: {}
      });
      
      if (response.data.success) {
        const sessionId = response.data.data.sessionId;
        setExecutionSession(sessionId);
        setExecutionType('cli');
        setShowExecutionModal(true);
        
        // Start polling for status
        startExecutionPolling(sessionId);
        
        toast.success('Execution started!', { id: 'execute-cli' });
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Execution started! Session ID: ${sessionId}\n\nI'm now executing the Azure CLI commands to clone your resources. You can watch the progress in real-time!`
        }]);
      }
    } catch (error) {
      console.error('Execution failed:', error);
      toast.error('Failed to start execution', { id: 'execute-cli' });
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Failed to start execution: ${error.response?.data?.message || error.message}`
      }]);
    }
  };
  
  /**
   * Execute Terraform configuration
   */
  const handleExecuteTerraform = async () => {
    if (!generatedScripts.terraform) return;
    
    // Show confirmation
    const confirmed = window.confirm(
      `⚠️ EXECUTE TERRAFORM?\n\n` +
      `This will create REAL Azure resources in your account.\n\n` +
      `Target Resource Group: ${targetResourceGroup}\n` +
      `Resources to create: ${discoveredResources?.totalResources || 0}\n\n` +
      `Are you sure you want to proceed?`
    );
    
    if (!confirmed) return;
    
    try {
      toast.loading('Starting Terraform execution...', { id: 'execute-tf' });
      
      const response = await axios.post('/api/ai-agent/execute-terraform', {
        terraform: generatedScripts.terraform.terraform,
        options: { dryRun: false }
      });
      
      if (response.data.success) {
        const sessionId = response.data.data.sessionId;
        setExecutionSession(sessionId);
        setExecutionType('terraform');
        setShowExecutionModal(true);
        
        // Start polling for status
        startExecutionPolling(sessionId);
        
        toast.success('Terraform execution started!', { id: 'execute-tf' });
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Terraform execution started! Session ID: ${sessionId}\n\nI'm now running terraform init, plan, and apply. This may take several minutes.`
        }]);
      }
    } catch (error) {
      console.error('Terraform execution failed:', error);
      toast.error('Failed to start Terraform execution', { id: 'execute-tf' });
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Failed to start Terraform execution: ${error.response?.data?.message || error.message}`
      }]);
    }
  };
  
  /**
   * Start polling for execution status
   */
  const startExecutionPolling = (sessionId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/ai-agent/execution-status/${sessionId}`);
        
        if (response.data.success) {
          setExecutionData(response.data.data);
          
          // Stop polling if execution is complete
          if (response.data.data.status === 'completed' || response.data.data.status === 'failed' || response.data.data.status === 'cancelled') {
            clearInterval(pollInterval);
            setExecutionPolling(null);
            
            if (response.data.data.status === 'completed') {
              toast.success('Execution completed successfully!');
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `🎉 Execution completed successfully!\n\nYour resources have been cloned to "${targetResourceGroup}".\n\nDuration: ${(response.data.data.duration / 1000).toFixed(1)}s\n\nYou can now verify the resources in Azure Portal.`
              }]);
            } else if (response.data.data.status === 'failed') {
              toast.error('Execution failed');
              const errorDetails = response.data.data.errors?.map(e => `Step ${e.step}: ${e.error}`).join('\n') || 'Unknown error';
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Execution failed.\n\nErrors:\n${errorDetails}\n\nPlease check the execution modal for details.`
              }]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch execution status:', error);
        if (error.response?.status === 404) {
          clearInterval(pollInterval);
          setExecutionPolling(null);
        }
      }
    }, 2000); // Poll every 2 seconds
    
    setExecutionPolling(pollInterval);
  };
  
  /**
   * Cancel execution
   */
  const handleCancelExecution = async () => {
    if (!executionSession) return;
    
    if (!window.confirm('Are you sure you want to cancel the execution?')) {
      return;
    }
    
    try {
      await axios.post(`/api/ai-agent/cancel-execution/${executionSession}`);
      
      if (executionPolling) {
        clearInterval(executionPolling);
        setExecutionPolling(null);
      }
      
      toast.success('Execution cancelled');
      setShowExecutionModal(false);
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `🛑 Execution cancelled by user.`
      }]);
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      toast.error('Failed to cancel execution');
    }
  };
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (executionPolling) {
        clearInterval(executionPolling);
      }
    };
  }, [executionPolling]);
  
  /**
   * Send chat message
   */
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setChatLoading(true);
    
    try {
      const response = await axios.post('/api/ai-agent/chat', {
        messages: [...chatMessages, { role: 'user', content: userMessage }],
        context: {
          resourceGroupData: discoveredResources,
          analysisStrategy,
          targetResourceGroup
        }
      });
      
      if (response.data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.data.message
        }]);
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };
  
  /**
   * Copy to clipboard
   */
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };
  
  /**
   * Download file
   */
  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };
  
  /**
   * Get resource icon
   */
  const getResourceIcon = (resourceType) => {
    const type = resourceType?.toLowerCase() || '';
    if (type.includes('compute') || type.includes('virtualmachine')) return <Cpu className="w-5 h-5" />;
    if (type.includes('storage') || type.includes('storageaccount')) return <HardDrive className="w-5 h-5" />;
    if (type.includes('network') || type.includes('virtualnetwork')) return <Network className="w-5 h-5" />;
    if (type.includes('database') || type.includes('sql')) return <Database className="w-5 h-5" />;
    return <Server className="w-5 h-5" />;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Azure AI Agent
              </h1>
              <p className="text-gray-600 mt-1">
                Intelligent resource cloning powered by GPT-4o
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-800">AI-Powered</span>
            </div>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Resource Group */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Step 1: Select Source Resource Group</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Resource Group
                  </label>
                  <select
                    value={selectedResourceGroup}
                    onChange={(e) => setSelectedResourceGroup(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select resource group...</option>
                    {resourceGroups.map(rg => (
                      <option key={rg.id} value={rg.name}>{rg.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Resource Group Name
                  </label>
                  <input
                    type="text"
                    value={targetResourceGroup}
                    onChange={(e) => setTargetResourceGroup(e.target.value)}
                    placeholder="my-cloned-resources"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <button
                onClick={handleDiscover}
                disabled={!selectedResourceGroup || loading.discover}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                {loading.discover ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Discovering Resources...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Discover Resources
                  </>
                )}
              </button>
            </motion.div>
            
            {/* Discovered Resources */}
            {discoveredResources && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Server className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Discovered Resources ({discoveredResources.totalResources})
                    </h2>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={!targetResourceGroup || loading.analyze}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading.analyze ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyze with AI
                      </>
                    )}
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {discoveredResources.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="p-2 bg-white rounded-lg">
                        {getResourceIcon(resource.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{resource.name}</p>
                        <p className="text-sm text-gray-600 truncate">{resource.type}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {resource.location}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* Analysis Strategy */}
            {analysisStrategy && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <GitBranch className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">AI Analysis & Strategy</h2>
                </div>
                
                {analysisStrategy.summary && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-800">{analysisStrategy.summary}</p>
                  </div>
                )}
                
                {analysisStrategy.warnings && analysisStrategy.warnings.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      Warnings
                    </h3>
                    <div className="space-y-2">
                      {analysisStrategy.warnings.map((warning, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={handleGenerateTerraform}
                    disabled={loading.terraform}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading.terraform ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileCode className="w-4 h-4" />
                        Generate Terraform
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleGenerateCLI}
                    disabled={loading.cli}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading.cli ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Code className="w-4 h-4" />
                        Generate Azure CLI
                      </>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={handleEstimateCost}
                  disabled={loading.cost}
                  className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading.cost ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Estimating...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Estimate Cost
                    </>
                  )}
                </button>
              </motion.div>
            )}
            
            {/* Generated Scripts */}
            {(generatedScripts.terraform || generatedScripts.cli) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Code className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Generated Scripts</h2>
                </div>
                
                {generatedScripts.terraform && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">Terraform Configuration</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(generatedScripts.terraform.terraform, 'Terraform')}
                          className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(generatedScripts.terraform.terraform, generatedScripts.terraform.filename)}
                          className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleExecuteTerraform}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 text-sm font-semibold shadow-lg"
                          title="Execute Terraform automatically"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Execute Now
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                      {generatedScripts.terraform.terraform}
                    </pre>
                  </div>
                )}
                
                {generatedScripts.cli && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">Azure CLI Script</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(generatedScripts.cli.script, 'Azure CLI')}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(generatedScripts.cli.script, generatedScripts.cli.filename)}
                          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleExecuteCLI}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2 text-sm font-semibold shadow-lg"
                          title="Execute Azure CLI automatically"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Execute Now
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 bg-gray-900 text-blue-400 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                      {generatedScripts.cli.script}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Cost Estimate */}
            {costEstimate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Cost Estimate</h2>
                </div>
                
                {costEstimate.totalEstimatedCost && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 mb-1">Estimated Monthly Cost</p>
                    <p className="text-3xl font-bold text-green-600">${costEstimate.totalEstimatedCost}</p>
                  </div>
                )}
                
                {costEstimate.breakdown && (
                  <div className="space-y-2">
                    {costEstimate.breakdown.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{item.resource}</span>
                          <span className="font-bold text-green-600">${item.estimatedCost}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{item.resourceType}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
          
          {/* Right Panel - AI Chat */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden sticky top-6 border border-purple-100"
              style={{ height: 'calc(100vh - 8rem)' }}
            >
              {/* Chat Header - Enhanced */}
              <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-lg rounded-xl shadow-lg animate-pulse">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      AI Assistant
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </h2>
                    <p className="text-xs text-purple-100 mt-0.5">Powered by GPT-4o · Always ready to help</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-lg rounded-full">
                    <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                    <span className="text-xs font-semibold text-white">Online</span>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages - Enhanced with better height */}
              <div 
                className="overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50/30 to-blue-50/30"
                style={{ height: 'calc(100vh - 20rem)' }}
              >
                {chatMessages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg'
                          : 'bg-gradient-to-br from-green-400 to-blue-500 shadow-lg'
                      }`}>
                        {msg.role === 'user' ? (
                          <span className="text-white text-sm font-bold">U</span>
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-4 rounded-2xl shadow-md ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-sm'
                              : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-900 mb-3 mt-2" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-lg font-bold text-gray-800 mb-2 mt-2" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-base font-bold text-gray-800 mb-2 mt-2" {...props} />,
                                  h4: ({node, ...props}) => <h4 className="text-sm font-bold text-gray-700 mb-1 mt-1" {...props} />,
                                  p: ({node, ...props}) => <p className="mb-2 text-gray-800 leading-relaxed" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                  em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 ml-2 space-y-1" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 ml-2 space-y-1" {...props} />,
                                  li: ({node, ...props}) => <li className="text-gray-800 leading-relaxed" {...props} />,
                                  code: ({node, inline, ...props}) => 
                                    inline ? (
                                      <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                                    ) : (
                                      <code className="block bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-2" {...props} />
                                    ),
                                  pre: ({node, ...props}) => <pre className="bg-gray-900 rounded-lg p-3 mb-2 overflow-x-auto" {...props} />,
                                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-2 bg-blue-50 text-gray-700 italic" {...props} />,
                                  hr: ({node, ...props}) => <hr className="my-3 border-gray-300" {...props} />,
                                  a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                                  table: ({node, ...props}) => (
                                    <div className="overflow-x-auto mb-2">
                                      <table className="min-w-full divide-y divide-gray-300 border border-gray-300" {...props} />
                                    </div>
                                  ),
                                  thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                                  tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-200" {...props} />,
                                  tr: ({node, ...props}) => <tr {...props} />,
                                  th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" {...props} />,
                                  td: ({node, ...props}) => <td className="px-3 py-2 text-sm text-gray-800" {...props} />
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 mt-1 px-2">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-md border border-gray-100">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Helpful Prompts - New Feature */}
              <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-purple-100">
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Quick suggestions:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChatInput("How much will this cloning cost?")}
                    className="px-2 py-1 text-xs bg-white hover:bg-purple-100 border border-purple-200 rounded-full transition-colors"
                  >
                    💰 Estimate costs
                  </button>
                  <button
                    onClick={() => setChatInput("What resources did you find?")}
                    className="px-2 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-200 rounded-full transition-colors"
                  >
                    🔍 Show resources
                  </button>
                  <button
                    onClick={() => setChatInput("Explain the cloning process")}
                    className="px-2 py-1 text-xs bg-white hover:bg-green-100 border border-green-200 rounded-full transition-colors"
                  >
                    📚 Explain process
                  </button>
                </div>
              </div>
              
              {/* Chat Input - Enhanced */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message here..."
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder-gray-400"
                    disabled={chatLoading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {chatLoading ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to send
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Execution Modal */}
      <AnimatePresence>
        {showExecutionModal && executionData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => {
              if (executionData.status !== 'running') {
                setShowExecutionModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {executionType === 'terraform' ? (
                    <FileCode className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Code className="w-6 h-6 text-blue-600" />
                  )}
                  {executionType === 'terraform' ? 'Terraform' : 'Azure CLI'} Execution
                </h2>
                {executionData.status !== 'running' && (
                  <button
                    onClick={() => setShowExecutionModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Status */}
              <div className="mb-4">
                <div className={`px-4 py-3 rounded-lg font-semibold text-center ${
                  executionData.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  executionData.status === 'completed' ? 'bg-green-100 text-green-800' :
                  executionData.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {executionData.status === 'running' && <Loader className="w-5 h-5 inline animate-spin mr-2" />}
                  {executionData.status === 'completed' && <CheckCircle2 className="w-5 h-5 inline mr-2" />}
                  {executionData.status === 'failed' && <AlertCircle className="w-5 h-5 inline mr-2" />}
                  Status: {executionData.status.toUpperCase()}
                  {executionData.duration && ` (${(executionData.duration / 1000).toFixed(1)}s)`}
                </div>
              </div>
              
              {/* Steps */}
              <div className="space-y-3 mb-4">
                {executionData.steps.map((step, index) => (
                  <div key={index} className={`p-3 rounded-lg border-2 ${
                    step.status === 'running' ? 'border-blue-300 bg-blue-50' :
                    step.status === 'completed' ? 'border-green-300 bg-green-50' :
                    step.status === 'failed' ? 'border-red-300 bg-red-50' :
                    'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {step.status === 'running' && <Loader className="w-4 h-4 animate-spin text-blue-600" />}
                        {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {step.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-600" />}
                        <span className="font-semibold text-sm">Step {step.index}</span>
                      </div>
                      {step.duration && (
                        <span className="text-xs text-gray-600">{(step.duration / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    
                    <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto mb-2">
                      {step.command}
                    </pre>
                    
                    {step.output && (
                      <div className="text-xs text-gray-700 bg-white p-2 rounded max-h-32 overflow-y-auto font-mono">
                        {step.output}
                      </div>
                    )}
                    
                    {step.error && (
                      <div className="text-xs text-red-700 bg-red-50 p-2 rounded mt-2 font-mono">
                        {step.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                {executionData.status === 'running' && (
                  <button
                    onClick={handleCancelExecution}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Cancel Execution
                  </button>
                )}
                {executionData.status !== 'running' && (
                  <button
                    onClick={() => setShowExecutionModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAgent;

