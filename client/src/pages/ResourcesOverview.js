import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Search, 
  Filter, 
  MapPin, 
  FolderOpen,
  Eye,
  Activity,
  MoreHorizontal,
  DollarSign,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Globe,
  Database,
  Cpu,
  HardDrive,
  Network,
  Shield,
  Zap
} from 'lucide-react';
import { useAzure } from '../context/AzureContext';
import { motion } from 'framer-motion';

const ResourcesOverview = () => {
  const { 
    resources, 
    resourceGroups, 
    locations, 
    resourceTypes,
    costs,
    resourcesLoading,
    filterResources 
  } = useAzure();
  
  const [filteredResources, setFilteredResources] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    location: '',
    resourceGroup: '',
    search: '',
    costRange: ''
  });
  const [selectedResource, setSelectedResource] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (resources && resources.length > 0) {
      applyFilters();
    }
  }, [resources, filters, sortBy, sortOrder]);

  const applyFilters = () => {
    if (!resources || resources.length === 0) return;
    
    let filtered = filterResources(filters);
    
    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(resource => 
        resource.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        resource.type.toLowerCase().includes(filters.search.toLowerCase()) ||
        (getResourceGroupFromId(resource.id) && getResourceGroupFromId(resource.id).toLowerCase().includes(filters.search.toLowerCase()))
      );
    }
    
    // Apply cost range filter
    if (filters.costRange) {
      const [min, max] = filters.costRange.split('-').map(Number);
      filtered = filtered.filter(resource => {
        const cost = getResourceCost(resource.type, getResourceGroupFromId(resource.id));
        if (!cost) return true;
        if (max) {
          return cost >= min && cost <= max;
        }
        return cost >= min;
      });
    }
    
    // Sort resources
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'cost':
          aValue = getResourceCost(a.type, getResourceGroupFromId(a.id)) || 0;
          bValue = getResourceCost(b.type, getResourceGroupFromId(b.id)) || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredResources(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      location: '',
      resourceGroup: '',
      search: '',
      costRange: ''
    });
  };

  const getResourceTypeIcon = (type) => {
    if (type.includes('virtualMachines')) return '🖥️';
    if (type.includes('storageAccounts')) return '💾';
    if (type.includes('virtualNetworks')) return '🌐';
    if (type.includes('sqlServers')) return '🗄️';
    if (type.includes('appServices') || type.includes('sites')) return '⚡';
    if (type.includes('keyVaults')) return '🔑';
    if (type.includes('loadBalancers')) return '⚖️';
    if (type.includes('networkSecurityGroups')) return '🛡️';
    if (type.includes('CognitiveServices')) return '🧠';
    if (type.includes('insights')) return '📊';
    if (type.includes('searchServices')) return '🔍';
    if (type.includes('serverFarms')) return '🏗️';
    return '📦';
  };

  const getResourceTypeColor = (type) => {
    if (type.includes('virtualMachines')) return 'bg-blue-100 text-blue-800';
    if (type.includes('storageAccounts')) return 'bg-green-100 text-green-800';
    if (type.includes('virtualNetworks')) return 'bg-purple-100 text-purple-800';
    if (type.includes('sqlServers')) return 'bg-yellow-100 text-yellow-800';
    if (type.includes('appServices') || type.includes('sites')) return 'bg-red-100 text-red-800';
    if (type.includes('keyVaults')) return 'bg-cyan-100 text-cyan-800';
    if (type.includes('CognitiveServices')) return 'bg-indigo-100 text-indigo-800';
    if (type.includes('insights')) return 'bg-pink-100 text-pink-800';
    if (type.includes('searchServices')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatResourceType = (type) => {
    return type.split('/').pop();
  };

  const getResourceCost = (resourceType, resourceGroup) => {
    if (!costs || !costs.costs) return null;
    
    const costItem = costs.costs.find(c => 
      c.resourceType === resourceType && 
      c.resourceGroup === resourceGroup
    );
    
    return costItem ? costItem.cost : null;
  };

  const getResourceGroupFromId = (id) => {
    const parts = id.split('/');
    const resourceGroupIndex = parts.findIndex(part => part === 'resourceGroups');
    if (resourceGroupIndex !== -1 && resourceGroupIndex + 1 < parts.length) {
      return parts[resourceGroupIndex + 1];
    }
    return null;
  };

  const getResourceCategory = (type) => {
    if (type.includes('virtualMachines') || type.includes('appServices') || type.includes('sites')) return 'Compute';
    if (type.includes('storageAccounts')) return 'Storage';
    if (type.includes('virtualNetworks') || type.includes('networkSecurityGroups')) return 'Networking';
    if (type.includes('sqlServers')) return 'Database';
    if (type.includes('CognitiveServices')) return 'AI Services';
    if (type.includes('insights')) return 'Monitoring';
    if (type.includes('searchServices')) return 'Search';
    if (type.includes('keyVaults')) return 'Security';
    return 'Other';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Compute': return <Cpu className="w-5 h-5" />;
      case 'Storage': return <HardDrive className="w-5 h-5" />;
      case 'Networking': return <Network className="w-5 h-5" />;
      case 'Database': return <Database className="w-5 h-5" />;
      case 'AI Services': return <Zap className="w-5 h-5" />;
      case 'Monitoring': return <BarChart3 className="w-5 h-5" />;
      case 'Search': return <Search className="w-5 h-5" />;
      case 'Security': return <Shield className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Compute': return 'bg-blue-100 text-blue-800';
      case 'Storage': return 'bg-green-100 text-green-800';
      case 'Networking': return 'bg-purple-100 text-purple-800';
      case 'Database': return 'bg-yellow-100 text-yellow-800';
      case 'AI Services': return 'bg-indigo-100 text-indigo-800';
      case 'Monitoring': return 'bg-pink-100 text-pink-800';
      case 'Search': return 'bg-orange-100 text-orange-800';
      case 'Security': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate statistics
  const totalResources = resources?.length || 0;
  const totalCost = costs?.data?.totalCost || 0;
  const resourceCategories = resources?.reduce((acc, resource) => {
    const category = getResourceCategory(resource.type);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {}) || {};

  const topExpensiveResources = resources
    ?.map(resource => ({
      ...resource,
      cost: getResourceCost(resource.type, getResourceGroupFromId(resource.id)) || 0
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5) || [];

  if (resourcesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 loading-spinner mx-auto"></div>
        <span className="ml-2 text-gray-600">Loading resources...</span>
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="p-6 text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Resources Found</h2>
        <p className="text-gray-600">No Azure resources are currently available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resources Overview</h1>
          <p className="text-gray-600">
            Comprehensive view of your Azure resources with cost analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn-outline flex items-center space-x-2"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Resources</p>
              <p className="text-3xl font-bold">{totalResources}</p>
            </div>
            <Server className="w-8 h-8 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-r from-green-500 to-green-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Cost</p>
              <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Resource Groups</p>
              <p className="text-3xl font-bold">{resourceGroups?.length || 0}</p>
            </div>
            <FolderOpen className="w-8 h-8 text-purple-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Locations</p>
              <p className="text-3xl font-bold">{locations?.length || 0}</p>
            </div>
            <Globe className="w-8 h-8 text-orange-200" />
          </div>
        </motion.div>
      </div>

      {/* Resource Categories */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(resourceCategories).map(([category, count]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center mb-2">
                <div className={`p-2 rounded-full ${getCategoryColor(category)}`}>
                  {getCategoryIcon(category)}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900">{category}</p>
              <p className="text-2xl font-bold text-primary-600">{count}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Top Expensive Resources */}
      {topExpensiveResources.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Expensive Resources</h3>
          <div className="space-y-3">
            {topExpensiveResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {getResourceTypeIcon(resource.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{resource.name}</p>
                    <p className="text-sm text-gray-500">{resource.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${resource.cost.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">per month</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Resource Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="input-field"
            >
              <option value="">All Types</option>
              {Array.isArray(resourceTypes) && resourceTypes.map(type => (
                <option key={type} value={type}>
                  {formatResourceType(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="input-field"
            >
              <option value="">All Locations</option>
              {Array.isArray(locations) && locations.map(location => (
                <option key={location.name} value={location.name}>
                  {location.displayName || location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Range
            </label>
            <select
              value={filters.costRange}
              onChange={(e) => handleFilterChange('costRange', e.target.value)}
              className="input-field"
            >
              <option value="">All Costs</option>
              <option value="0-50">$0 - $50</option>
              <option value="50-100">$50 - $100</option>
              <option value="100-200">$100 - $200</option>
              <option value="200-">$200+</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field flex-1"
              >
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="location">Location</option>
                <option value="cost">Cost</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn-outline px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {filteredResources.length || resources.length} resources
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Resources Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(filteredResources.length > 0 ? filteredResources : resources).map((resource, index) => {
            const resourceGroup = getResourceGroupFromId(resource.id);
            const cost = getResourceCost(resource.type, resourceGroup);
            const category = getResourceCategory(resource.type);
            
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover:shadow-medium transition-shadow cursor-pointer"
                onClick={() => setSelectedResource(resource)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">
                    {getResourceTypeIcon(resource.type)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 truncate">
                  {resource.name}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResourceTypeColor(resource.type)}`}>
                      {formatResourceType(resource.type)}
                    </span>
                  </div>
                  
                  {resource.location && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{resource.location}</span>
                    </div>
                  )}
                  
                  {resourceGroup && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FolderOpen className="w-4 h-4" />
                      <span>{resourceGroup}</span>
                    </div>
                  )}
                  
                  {cost && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 font-medium">
                      <DollarSign className="w-4 h-4" />
                      <span>${cost.toFixed(2)}/month</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(filteredResources.length > 0 ? filteredResources : resources).map((resource) => {
                  const resourceGroup = getResourceGroupFromId(resource.id);
                  const cost = getResourceCost(resource.type, resourceGroup);
                  const category = getResourceCategory(resource.type);
                  
                  return (
                    <tr key={resource.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-xl mr-3">
                            {getResourceTypeIcon(resource.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {resource.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {resource.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                          {category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResourceTypeColor(resource.type)}`}>
                          {formatResourceType(resource.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resource.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resourceGroup || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cost ? (
                          <div className="flex items-center space-x-1 text-green-600 font-medium">
                            <DollarSign className="w-4 h-4" />
                            <span>${cost.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedResource(resource)}
                            className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
                            <Activity className="w-4 h-4" />
                            <span>Metrics</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resource Details Modal */}
      {selectedResource && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Resource Details
              </h3>
              <button
                onClick={() => setSelectedResource(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">
                  {getResourceTypeIcon(selectedResource.type)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedResource.name}
                  </h4>
                  <p className="text-gray-600">{selectedResource.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{selectedResource.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900">{getResourceCategory(selectedResource.type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{selectedResource.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource Group</label>
                  <p className="text-sm text-gray-900">{getResourceGroupFromId(selectedResource.id) || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">Active</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost</label>
                  <p className="text-sm text-gray-900">
                    {getResourceCost(selectedResource.type, getResourceGroupFromId(selectedResource.id)) 
                      ? `$${getResourceCost(selectedResource.type, getResourceGroupFromId(selectedResource.id)).toFixed(2)}/month`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              
              {selectedResource.tags && Object.keys(selectedResource.tags).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedResource.tags).map(([key, value]) => (
                      <span
                        key={key}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedResource(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button className="btn-primary">
                View in Azure Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesOverview;
