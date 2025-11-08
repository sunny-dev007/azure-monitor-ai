import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const AzureContext = createContext();

export const useAzure = () => {
  const context = useContext(AzureContext);
  if (!context) {
    throw new Error('useAzure must be used within an AzureProvider');
  }
  return context;
};

export const AzureProvider = ({ children }) => {
  const [subscriptionSummary, setSubscriptionSummary] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Fetch subscription summary
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery(
    'azure-summary',
    async () => {
      const response = await axios.get('/api/azure/summary');
      return response.data;
    },
    {
      refetchInterval: 300000, // Refetch every 5 minutes
      retry: 3,
      onSuccess: (data) => {
        if (data.success) {
          setSubscriptionSummary(data.data);
          setIsConnected(true);
        }
      },
      onError: (error) => {
        console.error('Failed to fetch Azure summary:', error);
        setIsConnected(false);
        toast.error('Failed to connect to Azure. Please check your configuration.');
      }
    }
  );

  // Fetch resources
  const { data: resourcesData, isLoading: resourcesLoading, error: resourcesError } = useQuery(
    'azure-resources',
    async () => {
      const response = await axios.get('/api/azure/resources');
      return response.data;
    },
    {
      refetchInterval: 600000, // Refetch every 10 minutes
      retry: 3,
      enabled: isConnected
    }
  );

  // Fetch costs
  const { data: costsData, isLoading: costsLoading, error: costsError } = useQuery(
    'azure-costs',
    async () => {
      const response = await axios.get('/api/azure/costs');
      return response.data;
    },
    {
      refetchInterval: 900000, // Refetch every 15 minutes
      retry: 3,
      enabled: isConnected
    }
  );

  // Fetch recommendations
  const { data: recommendationsData, isLoading: recommendationsLoading, error: recommendationsError } = useQuery(
    'azure-recommendations',
    async () => {
      const response = await axios.get('/api/azure/recommendations');
      return response.data;
    },
    {
      refetchInterval: 1800000, // Refetch every 30 minutes
      retry: 3,
      enabled: isConnected
    }
  );

  // Fetch resource groups
  const { data: resourceGroupsData, isLoading: resourceGroupsLoading } = useQuery(
    'azure-resource-groups',
    async () => {
      const response = await axios.get('/api/azure/resource-groups');
      return response.data;
    },
    {
      refetchInterval: 1200000, // Refetch every 20 minutes
      retry: 3,
      enabled: isConnected
    }
  );

  // Fetch locations
  const { data: locationsData, isLoading: locationsLoading } = useQuery(
    'azure-locations',
    async () => {
      const response = await axios.get('/api/azure/locations');
      return response.data;
    },
    {
      refetchInterval: 3600000, // Refetch every hour
      retry: 3,
      enabled: isConnected
    }
  );

  // Fetch resource types
  const { data: resourceTypesData, isLoading: resourceTypesLoading } = useQuery(
    'azure-resource-types',
    async () => {
      const response = await axios.get('/api/azure/resource-types');
      return response.data;
    },
    {
      refetchInterval: 3600000, // Refetch every hour
      retry: 3,
      enabled: isConnected
    }
  );

  // Filter resources
  const filterResources = useCallback((filters = {}) => {
    if (!resourcesData?.success) return [];
    
    let filtered = resourcesData.data;
    
    if (filters.type) {
      filtered = filtered.filter(r => 
        r.type.toLowerCase().includes(filters.type.toLowerCase())
      );
    }
    
    if (filters.location) {
      filtered = filtered.filter(r => 
        r.location && r.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    if (filters.resourceGroup) {
      filtered = filtered.filter(r => 
        r.resourceGroup && r.resourceGroup.toLowerCase().includes(filters.resourceGroup.toLowerCase())
      );
    }
    
    return filtered;
  }, [resourcesData]);

  // Filter costs
  const filterCosts = useCallback((filters = {}) => {
    if (!costsData?.success) return [];
    
    let filtered = costsData.data.costs;
    
    if (filters.resourceType) {
      filtered = filtered.filter(c => 
        c.resourceType && c.resourceType.toLowerCase().includes(filters.resourceType.toLowerCase())
      );
    }
    
    if (filters.resourceGroup) {
      filtered = filtered.filter(c => 
        c.resourceGroup && c.resourceGroup.toLowerCase().includes(filters.resourceGroup.toLowerCase())
      );
    }
    
    return filtered;
  }, [costsData]);

  // Filter recommendations
  const filterRecommendations = useCallback((filters = {}) => {
    if (!recommendationsData?.success) return [];
    
    let filtered = recommendationsData.data.recommendations;
    
    if (filters.category) {
      filtered = filtered.filter(r => 
        r.category && r.category.toLowerCase() === filters.category.toLowerCase()
      );
    }
    
    if (filters.impact) {
      filtered = filtered.filter(r => 
        r.impact && r.impact.toLowerCase() === filters.impact.toLowerCase()
      );
    }
    
    if (filters.resourceType) {
      filtered = filtered.filter(r => 
        r.resourceType && r.resourceType.toLowerCase().includes(filters.resourceType.toLowerCase())
      );
    }
    
    return filtered;
  }, [recommendationsData]);

  // Get resource metrics
  const getResourceMetrics = useCallback(async (resourceId, metricNames = ['CPU Percentage', 'Memory Percentage']) => {
    try {
      const response = await axios.get(`/api/azure/resources/${resourceId}/metrics`, {
        params: { metrics: metricNames.join(',') }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch resource metrics:', error);
      toast.error('Failed to fetch resource metrics');
      return { success: false, error: error.message };
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries('azure-summary');
    queryClient.invalidateQueries('azure-resources');
    queryClient.invalidateQueries('azure-costs');
    queryClient.invalidateQueries('azure-recommendations');
    toast.success('Data refreshed successfully');
  }, [queryClient]);

  // Get cost trends
  const getCostTrends = useCallback(async (days = 30) => {
    try {
      const response = await axios.get('/api/azure/costs/trends', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch cost trends:', error);
      toast.error('Failed to fetch cost trends');
      return { success: false, error: error.message };
    }
  }, []);

  const value = {
    // State
    subscriptionSummary,
    isConnected,
    
    // Data
    resources: resourcesData?.data || [],
    costs: costsData?.data || {},
    recommendations: recommendationsData?.data || {},
    resourceGroups: resourceGroupsData?.data || [],
    locations: locationsData?.data || [],
    resourceTypes: resourceTypesData?.data || [],
    
    // Loading states
    summaryLoading,
    resourcesLoading,
    costsLoading,
    recommendationsLoading,
    resourceGroupsLoading,
    locationsLoading,
    resourceTypesLoading,
    
    // Errors
    summaryError,
    resourcesError,
    costsError,
    recommendationsError,
    
    // Functions
    filterResources,
    filterCosts,
    filterRecommendations,
    getResourceMetrics,
    getCostTrends,
    refreshData
  };

  return (
    <AzureContext.Provider value={value}>
      {children}
    </AzureContext.Provider>
  );
};
