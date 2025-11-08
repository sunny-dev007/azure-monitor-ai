import React, { useState, useEffect } from 'react';
import { 
  Server, 
  DollarSign, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  MessageSquare,
  FolderOpen,
  MapPin
} from 'lucide-react';
import { useAzure } from '../context/AzureContext';
import { useChat } from '../context/ChatContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { 
    subscriptionSummary, 
    resources, 
    costs, 
    recommendations,
    resourceGroups,
    locations,
    resourceTypes,
    isConnected,
    getCostTrends,
    getResourceMetrics
  } = useAzure();
  
  const { getInsights } = useChat();
  
  const [costTrends, setCostTrends] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadCostTrends();
      loadInsights();
    }
  }, [isConnected]);

  const loadCostTrends = async () => {
    try {
      const trends = await getCostTrends(30);
      if (trends?.success) {
        setCostTrends(trends.data);
      }
    } catch (error) {
      console.error('Failed to load cost trends:', error);
    }
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const aiInsights = await getInsights();
      setInsights(aiInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getResourceTypeIcon = (type) => {
    if (type.includes('virtualMachines')) return '🖥️';
    if (type.includes('storageAccounts')) return '💾';
    if (type.includes('virtualNetworks')) return '🌐';
    if (type.includes('sqlServers')) return '🗄️';
    if (type.includes('appServices') || type.includes('sites')) return '⚡';
    if (type.includes('keyVaults')) return '🔑';
    if (type.includes('CognitiveServices')) return '🧠';
    if (type.includes('insights')) return '📊';
    if (type.includes('searchServices')) return '🔍';
    if (type.includes('serverFarms')) return '🏗️';
    return '📦';
  };

  const getResourceTypeColor = (type) => {
    if (type.includes('virtualMachines')) return '#3b82f6';
    if (type.includes('storageAccounts')) return '#10b981';
    if (type.includes('virtualNetworks')) return '#8b5cf6';
    if (type.includes('sqlServers')) return '#f59e0b';
    if (type.includes('appServices') || type.includes('sites')) return '#ef4444';
    if (type.includes('keyVaults')) return '#06b6d4';
    if (type.includes('CognitiveServices')) return '#6366f1';
    if (type.includes('insights')) return '#ec4899';
    if (type.includes('searchServices')) return '#f97316';
    if (type.includes('serverFarms')) return '#8b5a2b';
    return '#6b7280';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  // Calculate real metrics from Azure data
  const totalResources = resources?.length || 0;
  const totalCost = costs?.data?.totalCost || 0;
  const totalResourceGroups = resourceGroups?.length || 0;
  const totalLocations = locations?.length || 0;
  const totalRecommendations = recommendations?.data?.recommendations?.length || 0;

  // Calculate resource type distribution from real data
  const resourceTypeDistribution = resources?.reduce((acc, resource) => {
    const type = resource.type;
    if (!acc[type]) {
      acc[type] = { count: 0, resources: [] };
    }
    acc[type].count += 1;
    acc[type].resources.push(resource);
    return acc;
  }, {}) || {};

  // Calculate cost trend based on real data
  const getCostTrendIcon = () => {
    // For now, show stable since we're using mock cost data
    return <Activity className="w-5 h-5 text-gray-500" />;
  };

  const getCostTrendText = () => {
    return 'Stable';
  };

  const getCostTrendColor = () => {
    return 'text-gray-600';
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Server className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Connected to Azure</h2>
        <p className="text-gray-600">Please check your Azure configuration and try again.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Overview of your Azure environment - {subscriptionSummary?.subscriptionName || 'Pay-As-You-Go'}
          </p>
          {subscriptionSummary?.subscriptionId && (
            <p className="text-sm text-gray-500 mt-1">
              Subscription ID: {subscriptionSummary.subscriptionId}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadInsights}
            disabled={loadingInsights}
            className="btn-primary flex items-center space-x-2"
          >
            {loadingInsights ? (
              <div className="w-4 h-4 loading-spinner" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
            <span>Get AI Insights</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Resources</p>
              <p className="metric-value">{formatNumber(totalResources)}</p>
              <p className="text-xs text-gray-500 mt-1">Real-time from Azure</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Monthly Cost</p>
              <p className="metric-value">{formatCurrency(totalCost)}</p>
              <div className="flex items-center space-x-1 mt-1">
                {getCostTrendIcon()}
                <span className={`metric-change ${getCostTrendColor()}`}>
                  {getCostTrendText()}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Recommendations</p>
              <p className="metric-value">{formatNumber(totalRecommendations)}</p>
              <p className="text-xs text-gray-500 mt-1">Cost optimization tips</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Resource Groups</p>
              <p className="metric-value">{formatNumber(totalResourceGroups)}</p>
              <p className="text-xs text-gray-500 mt-1">Organized by groups</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Locations</p>
              <p className="metric-value">{formatNumber(totalLocations)}</p>
              <p className="text-xs text-gray-500 mt-1">Azure regions</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Resource Types</p>
              <p className="metric-value">{formatNumber(Object.keys(resourceTypeDistribution).length)}</p>
              <p className="text-xs text-gray-500 mt-1">Different services</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="metric-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Last Updated</p>
              <p className="metric-value text-sm">
                {subscriptionSummary?.lastUpdated ? 
                  new Date(subscriptionSummary.lastUpdated).toLocaleTimeString() : 
                  'Just now'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">Real-time data</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trends Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trends (Last 30 Days)</h3>
          {costTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [`$${value}`, 'Cost']}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Cost data will appear here</p>
                <p className="text-sm text-gray-400">Currently using mock data</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Resource Types Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Types Distribution</h3>
          {Object.keys(resourceTypeDistribution).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(resourceTypeDistribution).map(([type, data]) => ({
                    name: type.split('/').pop(),
                    value: data.count,
                    color: getResourceTypeColor(type)
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {Object.entries(resourceTypeDistribution).map(([type, data], index) => (
                    <Cell key={`cell-${index}`} fill={getResourceTypeColor(type)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Server className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Resource data will appear here</p>
                <p className="text-sm text-gray-400">Loading from Azure...</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Top Resources by Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Resources by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(resourceTypeDistribution)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 6)
            .map(([type, data]) => (
              <div key={type} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="text-2xl">{getResourceTypeIcon(type)}</div>
                  <div>
                    <p className="font-medium text-gray-900">{type.split('/').pop()}</p>
                    <p className="text-sm text-gray-500">{data.count} resources</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {data.resources.slice(0, 3).map((resource, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                      <span className="truncate">{resource.name}</span>
                    </div>
                  ))}
                  {data.resources.length > 3 && (
                    <p className="text-xs text-gray-400">+{data.resources.length - 3} more</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </motion.div>

      {/* AI Insights */}
      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
              <p className="text-sm text-gray-600">Generated by Azure OpenAI</p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">{insights.insights}</div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Start AI Chat</p>
              <p className="text-sm text-gray-600">Ask questions about your Azure environment</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </button>

          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Explore Resources</p>
              <p className="text-sm text-gray-600">View and manage your Azure resources</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </button>

          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">View Recommendations</p>
              <p className="text-sm text-gray-600">Optimize your Azure environment</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
