import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Terminal,
  RefreshCw,
  Eye,
  EyeOff,
  CloudCog,
  Database,
  Lock,
  Unlock,
  Play,
  CheckCheck,
  Clock,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';

const EnvironmentSwitcher = () => {
  // State management
  const [currentTab, setCurrentTab] = useState('select'); // 'select', 'custom', 'progress'
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [credentials, setCredentials] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    subscriptionId: '',
    environmentName: ''
  });
  
  const [showSecret, setShowSecret] = useState(false);
  
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [timeoutError, setTimeoutError] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastProgressTime, setLastProgressTime] = useState(null);
  
  // Use refs to avoid stale closures in callbacks
  const pollingIntervalRef = useRef(null);
  const sessionDataRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const lastProgressTimeRef = useRef(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    sessionDataRef.current = sessionData;
  }, [sessionData]);
  
  useEffect(() => {
    sessionStartTimeRef.current = sessionStartTime;
  }, [sessionStartTime]);
  
  useEffect(() => {
    lastProgressTimeRef.current = lastProgressTime;
  }, [lastProgressTime]);
  
  // Load environments on mount
  useEffect(() => {
    loadEnvironments();
  }, []);
  
  // Check for timeout (no progress in 90 seconds)
  const checkTimeout = useCallback(() => {
    if (!sessionDataRef.current) return;
    
    const now = Date.now();
    const startTime = sessionStartTimeRef.current || now;
    const lastProgress = lastProgressTimeRef.current || startTime;
    
    // If no progress in 90 seconds, show timeout error
    if (now - lastProgress > 90000) {
      setTimeoutError({
        message: 'Operation timed out',
        details: 'The validation is taking longer than expected. This usually means:\n• Wrong credentials (check client secret)\n• Network connectivity issues\n• Azure service unavailable\n\nPlease verify your credentials and try again.',
        timestamp: new Date().toISOString()
      });
      
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, []); // Empty dependencies - uses refs instead
  
  // Fetch session status
  const fetchSessionStatus = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await axios.get(`/api/environment/session/${sessionId}`);
      if (response.data.success) {
        const newData = response.data.data;
        
        // Check if there's been progress (new steps or status change)
        if (sessionDataRef.current) {
          const hasNewSteps = newData.steps.length !== sessionDataRef.current.steps.length;
          const statusChanged = newData.status !== sessionDataRef.current.status;
          const stepsChanged = JSON.stringify(newData.steps) !== JSON.stringify(sessionDataRef.current.steps);
          
          if (hasNewSteps || statusChanged || stepsChanged) {
            // Progress detected, update last progress time
            setLastProgressTime(Date.now());
          }
        }
        
        setSessionData(newData);
        
        // If session failed or completed, stop polling
        if (newData.status === 'failed' || newData.status === 'validated' || newData.status === 'permissions_assigned') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch session status:', error);
      
      // If session not found (404), show user-friendly error
      if (error.response?.status === 404) {
        setTimeoutError({
          message: 'Session expired or not found',
          details: 'The validation session may have expired or the server was restarted. Please try again.',
          timestamp: new Date().toISOString()
        });
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }
  }, [sessionId]); // Only depends on sessionId
  
  // Poll session status with timeout detection
  useEffect(() => {
    if (sessionId && currentTab === 'progress') {
      const interval = setInterval(() => {
        checkTimeout();
        fetchSessionStatus();
      }, 1000);
      pollingIntervalRef.current = interval;
      
      return () => {
        if (interval) clearInterval(interval);
        pollingIntervalRef.current = null;
      };
    }
  }, [sessionId, currentTab, checkTimeout, fetchSessionStatus]);
  
  // Reset timeout when starting new session
  const resetTimeout = () => {
    const now = Date.now();
    setSessionStartTime(now);
    setLastProgressTime(now);
    setTimeoutError(null);
  };
  
  const loadEnvironments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/environment/environments');
      if (response.data.success) {
        setEnvironments(response.data.data.environments);
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleValidate = async () => {
    try {
      resetTimeout();
      setCurrentTab('progress');
      const response = await axios.post('/api/environment/validate-credentials', credentials);
      if (response.data.success) {
        setSessionId(response.data.data.sessionId);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      setTimeoutError({
        message: 'Failed to start validation',
        details: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  const handleSwitch = async () => {
    try {
      resetTimeout();
      setCurrentTab('progress');
      const response = await axios.post('/api/environment/switch', credentials);
      if (response.data.success) {
        setSessionId(response.data.data.sessionId);
      }
    } catch (error) {
      console.error('Switch failed:', error);
      setTimeoutError({
        message: 'Failed to start environment switch',
        details: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  const handleRetry = () => {
    setTimeoutError(null);
    setSessionId(null);
    setSessionData(null);
    setCurrentTab('custom');
  };
  
  const handleAssignPermissions = async () => {
    if (!sessionId) return;
    
    try {
      await axios.post(`/api/environment/assign-permissions/${sessionId}`);
    } catch (error) {
      console.error('Permission assignment failed:', error);
      alert('Failed to assign permissions: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const handleQuickSwitch = (env) => {
    setCredentials({
      tenantId: env.tenantId,
      clientId: env.clientId,
      clientSecret: env.clientSecret || '', // Include secret if provided
      subscriptionId: env.subscriptionId,
      environmentName: env.name
    });
    setCurrentTab('custom');
  };
  
  // State for current environment
  const [currentEnvironment, setCurrentEnvironment] = useState(null);
  
  // Fetch current environment on mount
  useEffect(() => {
    fetchCurrentEnvironment();
  }, []);
  
  const fetchCurrentEnvironment = async () => {
    try {
      const response = await axios.get('/api/azure/current-environment');
      if (response.data.success) {
        setCurrentEnvironment(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch current environment:', error);
    }
  };
  
  // All pre-configured quick-access environments
  const allQuickAccessEnvironments = [
    {
      name: 'Azure-Central-AI-Hub (Amit)',
      description: 'Shared Azure environment for team access',
      tenantId: 'a8f047ad-e0cb-4b81-badd-4556c4cd71f4',
      clientId: '1f16c4c4-8c61-4083-bda0-b5cd4f847dff',
      clientSecret: '', // Enter Amit's client secret
      subscriptionId: '5588ec4e-3711-4cd3-a62a-52d031b0a6c8',
      color: 'blue',
      icon: '🚀'
    },
    {
      name: 'Personal Account',
      description: 'Your personal Azure subscription',
      tenantId: 'd4740603-c108-4cbe-9be8-c75289d4da2a',
      clientId: '699e9e0b-c260-4f6f-968a-67fbd24be352',
      clientSecret: '', // Enter your client secret
      subscriptionId: 'a06001b5-a47c-44ac-b403-8be695f05440',
      color: 'green',
      icon: '👤'
    }
  ];
  
  // Filter out the currently active environment
  const quickAccessEnvironments = allQuickAccessEnvironments.filter(env => {
    if (!currentEnvironment) return true; // Show all if current env not loaded yet
    return env.subscriptionId !== currentEnvironment.subscriptionId ||
           env.tenantId !== currentEnvironment.tenantId ||
           env.clientId !== currentEnvironment.clientId;
  });
  
  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'validated':
      case 'switched':
      case 'permissions_assigned':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'validating':
      case 'switching':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
      case 'permission_failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'permissions_partial':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Current Environment Banner */}
        {currentEnvironment && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-900">✓ Currently Active Environment</h3>
                  <p className="text-xs text-green-700 font-mono">
                    {currentEnvironment.subscriptionId}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Connected
              </span>
            </div>
          </motion.div>
        )}
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Cloud className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Environment Switcher</h1>
          </div>
          <p className="text-gray-600 ml-13">
            Switch between different Azure environments with real-time validation and permission management
          </p>
        </motion.div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setCurrentTab('select')}
            className={`px-6 py-3 font-medium transition-all ${
              currentTab === 'select'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Saved Environments
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('custom')}
            className={`px-6 py-3 font-medium transition-all ${
              currentTab === 'custom'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Custom Environment
            </div>
          </button>
          {sessionId && (
            <button
              onClick={() => setCurrentTab('progress')}
              className={`px-6 py-3 font-medium transition-all ${
                currentTab === 'progress'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Progress
              </div>
            </button>
          )}
        </div>
        
        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Select Environment Tab */}
          {currentTab === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : environments.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Environments</h3>
                  <p className="text-gray-600 mb-4">
                    You don't have any saved environments yet. Create a custom environment to get started.
                  </p>
                  <button
                    onClick={() => setCurrentTab('custom')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Custom Environment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {environments.map((env, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
                        env.isCurrent ? 'border-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {env.isCurrent && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                Current
                              </span>
                            )}
                            {env.name}
                          </h3>
                        </div>
                        <CloudCog className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Shield className="w-4 h-4" />
                          <span className="font-mono">{env.tenantId.substring(0, 20)}...</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Key className="w-4 h-4" />
                          <span className="font-mono">{env.clientId.substring(0, 20)}...</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Database className="w-4 h-4" />
                          <span className="font-mono">{env.subscriptionId.substring(0, 20)}...</span>
                        </div>
                      </div>
                      
                      {!env.isCurrent && (
                        <button
                          onClick={() => handleQuickSwitch(env)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Switch to this Environment
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {/* Custom Environment Tab */}
          {currentTab === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Quick Access Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CloudCog className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">⚡ Quick Access</h3>
                    <p className="text-sm text-gray-600">One-click environment switching with pre-configured credentials</p>
                  </div>
                </div>
                
                {quickAccessEnvironments.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {quickAccessEnvironments.map((env, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-lg p-5 border-2 border-blue-300 hover:border-blue-500 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{env.icon}</span>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                {env.name}
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-semibold">
                                  READY
                                </span>
                              </h4>
                              <p className="text-sm text-gray-600">{env.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-gray-500 font-semibold mb-1">Tenant ID</p>
                            <p className="font-mono text-gray-700">{env.tenantId.substring(0, 20)}...</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-gray-500 font-semibold mb-1">Client ID</p>
                            <p className="font-mono text-gray-700">{env.clientId.substring(0, 20)}...</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-gray-500 font-semibold mb-1">Subscription ID</p>
                            <p className="font-mono text-gray-700">{env.subscriptionId.substring(0, 20)}...</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-gray-500 font-semibold mb-1">Client Secret</p>
                            <p className="font-mono text-green-700">✓ Configured</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickSwitch(env)}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                          >
                            <CheckCheck className="w-5 h-5" />
                            Auto-Fill Credentials
                          </button>
                          <button
                            onClick={() => {
                              handleQuickSwitch(env);
                              setTimeout(() => handleSwitch(), 500);
                            }}
                            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                          >
                            <Play className="w-5 h-5" />
                            Auto-Fill & Switch Now
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">You're using all available environments!</h4>
                    <p className="text-sm text-gray-600">
                      All pre-configured environments are currently active or available in the Manual Configuration section below.
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-xs text-blue-900">
                    <strong>💡 Tip:</strong> Click "Auto-Fill Credentials" to populate the form below, or "Auto-Fill & Switch Now" to switch immediately without validation.
                  </p>
                </div>
              </div>
              
              {/* Manual Configuration Section */}
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Manual Configuration</h2>
                  {credentials.tenantId && credentials.clientId && credentials.subscriptionId && credentials.clientSecret && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      All Fields Filled
                    </span>
                  )}
                </div>
              
              <div className="space-y-6">
                {/* Environment Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={credentials.environmentName}
                    onChange={(e) => setCredentials({...credentials, environmentName: e.target.value})}
                    placeholder="e.g., Production, Development, Azure-Central-AI-Hub"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Tenant ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Tenant ID (Directory ID)
                    </div>
                  </label>
                  <input
                    type="text"
                    value={credentials.tenantId}
                    onChange={(e) => setCredentials({...credentials, tenantId: e.target.value})}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                </div>
                
                {/* Client ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Client ID (Application ID)
                    </div>
                  </label>
                  <input
                    type="text"
                    value={credentials.clientId}
                    onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                </div>
                
                {/* Client Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Client Secret
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={credentials.clientSecret}
                      onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                      placeholder="Enter your client secret"
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Subscription ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Subscription ID
                    </div>
                  </label>
                  <input
                    type="text"
                    value={credentials.subscriptionId}
                    onChange={(e) => setCredentials({...credentials, subscriptionId: e.target.value})}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                </div>
                
                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleValidate}
                    disabled={!credentials.tenantId || !credentials.clientId || !credentials.clientSecret || !credentials.subscriptionId}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCheck className="w-5 h-5" />
                    Validate Credentials
                  </button>
                  <button
                    onClick={handleSwitch}
                    disabled={!credentials.tenantId || !credentials.clientId || !credentials.clientSecret || !credentials.subscriptionId}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Switch Environment
                  </button>
                </div>
              </div>
              
              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">How to get these credentials:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Go to Azure Portal → Azure Active Directory → App registrations</li>
                      <li>Select your application or create a new one</li>
                      <li>Copy Tenant ID and Client ID from the Overview page</li>
                      <li>Create a Client Secret in "Certificates & secrets"</li>
                      <li>Get Subscription ID from the Subscriptions page</li>
                    </ul>
                  </div>
                </div>
              </div>
              </div>
            </motion.div>
          )}
          
          {/* Progress Tab */}
          {currentTab === 'progress' && sessionData && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Timeout Error */}
              {timeoutError && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-300 rounded-lg p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <XCircle className="w-10 h-10 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-red-900 mb-2">{timeoutError.message}</h3>
                      <p className="text-sm text-red-800 whitespace-pre-line mb-4">
                        {timeoutError.details}
                      </p>
                      <div className="bg-red-100 rounded-lg p-3 mb-4">
                        <p className="text-xs font-semibold text-red-900 mb-2">Common Issues:</p>
                        <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                          <li><strong>Wrong Client Secret:</strong> The most common issue. Check if the secret is correct or expired in Azure Portal.</li>
                          <li><strong>Wrong Client ID or Tenant ID:</strong> Verify your service principal details in Azure Portal.</li>
                          <li><strong>Network Issues:</strong> Ensure you can reach Azure endpoints (check firewall/proxy).</li>
                          <li><strong>Service Principal Deleted:</strong> The service principal may have been removed from Azure AD.</li>
                        </ul>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleRetry}
                          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-5 h-5" />
                          Try Again with Different Credentials
                        </button>
                        <button
                          onClick={() => window.open('https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', '_blank')}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-5 h-5" />
                          Check Azure Portal
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Status Card */}
              {!timeoutError && (
                <div className={`rounded-lg p-6 border-2 ${getStatusColor(sessionData.status)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Status: {sessionData.status?.replace(/_/g, ' ').toUpperCase()}</h3>
                      <p className="text-sm opacity-80">
                        {sessionData.environmentName || 'Custom Environment'}
                      </p>
                    </div>
                    {(sessionData.status === 'validating' || sessionData.status === 'switching') && (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    )}
                  </div>
                </div>
              )}
              
              {/* Steps */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Execution Steps
                </h3>
                
                <div className="space-y-3">
                  {sessionData.steps && sessionData.steps.length > 0 ? (
                    sessionData.steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getStepIcon(step.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{step.title}</h4>
                            <span className="text-xs text-gray-500">
                              {new Date(step.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {step.message && (
                            <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Waiting for steps to begin...</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              {sessionData.status === 'validated' && !sessionData.hasRequiredRoles && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-1">Missing Required Roles</h4>
                      <p className="text-sm text-yellow-800">
                        Some Azure RBAC roles are missing. Click below to assign them automatically.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAssignPermissions}
                    className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-5 h-5" />
                    Assign Required Permissions
                  </button>
                </div>
              )}
              
              {sessionData.status === 'switched' && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">Environment Configuration Updated!</h4>
                        <p className="text-sm text-green-800 mb-2">
                          Credentials have been configured. Click below to verify and assign Azure permissions.
                        </p>
                        {sessionData.backupFile && (
                          <p className="text-xs text-green-700 font-mono">
                            Backup created: {sessionData.backupFile}
                          </p>
                        )}
                      </div>
                  </div>
                  <button
                    onClick={handleAssignPermissions}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-5 h-5" />
                    Assign Azure Permissions
                  </button>
                </div>
              )}
              
              {sessionData.status === 'permissions_assigned' && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div>
                        <h4 className="text-xl font-semibold text-green-900">Setup Complete!</h4>
                        <p className="text-sm text-green-800 mt-1">
                          Environment configured and all required Azure roles verified!
                        </p>
                      </div>
                  </div>
                  
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-yellow-900 mb-2">⚠️ IMPORTANT: Backend Server Must Be Restarted!</h5>
                        <p className="text-sm text-yellow-800 mb-3">
                          The .env file has been updated, but Node.js doesn't automatically reload it. 
                          You MUST restart your backend server for the new environment to take effect.
                        </p>
                        <div className="bg-yellow-100 rounded p-3 mb-3">
                          <p className="text-xs font-mono text-yellow-900 mb-2">In your backend terminal:</p>
                          <p className="text-xs font-mono text-yellow-900 bg-white p-2 rounded">
                            1. Press Ctrl+C to stop the server<br/>
                            2. Run: npm start  or  node server.js
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 mb-2 font-medium">Complete These Steps:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li className="font-semibold text-gray-900">🔴 Stop your backend server (Ctrl+C in terminal)</li>
                      <li className="font-semibold text-gray-900">🟢 Start backend again: <code className="bg-gray-100 px-2 py-1 rounded">npm start</code></li>
                      <li>⏱️ Wait 5-10 minutes for Azure role propagation (optional, roles likely already exist)</li>
                      <li>🔄 Refresh this page to verify new environment</li>
                    </ol>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
                    <strong>Why is this needed?</strong> Node.js loads environment variables when it starts. 
                    Changing the .env file doesn't affect the running process. Only a restart will load the new credentials.
                  </div>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Refresh Page (After Restarting Backend)
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;

