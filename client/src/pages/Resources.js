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
  TrendingUp
} from 'lucide-react';
import { useAzure } from '../context/AzureContext';
import { motion } from 'framer-motion';

const Resources = () => {
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
    search: ''
  });
  const [selectedResource, setSelectedResource] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (resources && resources.length > 0) {
      applyFilters();
    }
  }, [resources, filters]);

  const applyFilters = () => {
    if (!resources || resources.length === 0) return;
    
    let filtered = filterResources(filters);
    
    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(resource => 
        resource.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        resource.type.toLowerCase().includes(filters.search.toLowerCase()) ||
        (resource.resourceGroup && resource.resourceGroup.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }
    
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
      search: ''
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
          <h1 className="text-3xl font-bold text-gray-900">Azure Resources</h1>
          <p className="text-gray-600">
            Manage and monitor your Azure resources ({filteredResources.length || resources.length} total)
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

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {/* Resource Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Group
            </label>
            <select
              value={filters.resourceGroup}
              onChange={(e) => handleFilterChange('resourceGroup', e.target.value)}
              className="input-field"
            >
              <option value="">All Groups</option>
              {Array.isArray(resourceGroups) && resourceGroups.map(group => (
                <option key={group.name} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
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
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
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

export default Resources;
