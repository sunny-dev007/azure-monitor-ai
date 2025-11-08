import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const queryClient = useQueryClient();

  // Create new chat session
  const createSession = useCallback(async () => {
    try {
      setIsSessionLoading(true);
      console.log('🔄 Creating new chat session...');
      
      const response = await axios.post('/api/chat/sessions');
      console.log('📡 Session creation response:', response.data);
      
      if (response.data.success) {
        const sessionId = response.data.data.id;
        console.log('✅ Session created with ID:', sessionId);
        
        // Set session ID immediately
        setCurrentSessionId(sessionId);
        setChatHistory([]);
        
        // Store session ID in localStorage
        localStorage.setItem('azure-chat-session', sessionId);
        
        toast.success('New chat session created');
        setIsSessionLoading(false);
        
        // Wait a moment for state to be fully updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return sessionId;
      } else {
        console.error('❌ Session creation failed:', response.data);
        toast.error('Failed to create chat session');
        setIsSessionLoading(false);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to create chat session:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      toast.error('Failed to create chat session');
      setIsSessionLoading(false);
      return null;
    }
  }, []);

  // Load existing session from localStorage
  useEffect(() => {
    const initializeSession = async () => {
      console.log('🔄 Loading existing session from localStorage...');
      const savedSessionId = localStorage.getItem('azure-chat-session');
      console.log('📱 Saved session ID:', savedSessionId);
      
      if (savedSessionId) {
        console.log('✅ Loading existing session:', savedSessionId);
        setCurrentSessionId(savedSessionId);
        // Load chat history for existing session
        await loadChatHistory(savedSessionId);
        setIsSessionLoading(false);
      } else {
        console.log('🆕 No saved session, creating new one...');
        // Create new session if none exists
        await createSession();
      }
    };
    
    initializeSession();
  }, []); // Remove createSession from dependencies to prevent infinite loop

  // Ensure we always have a valid session
  useEffect(() => {
    console.log('🔍 Checking session validity. Current session ID:', currentSessionId);
    if (!currentSessionId && !isSessionLoading) {
      console.log('⚠️ No current session, creating new one...');
      createSession();
    } else if (currentSessionId) {
      console.log('✅ Valid session exists:', currentSessionId);
    }
  }, [currentSessionId, isSessionLoading, createSession]);

  // Load chat history
  const loadChatHistory = useCallback(async (sessionId) => {
    try {
      const response = await axios.get(`/api/chat/sessions/${sessionId}`);
      if (response.data.success) {
        const messages = response.data.data.messages || [];
        // Convert backend message format to frontend format
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.role === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp,
          metadata: msg.metadata || {}
        }));
        setChatHistory(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation(
    async ({ message, context = {} }) => {
      if (!currentSessionId) {
        throw new Error('No active chat session');
      }
      
      console.log(`Sending message to session: ${currentSessionId}`);
      
      const response = await axios.post(`/api/chat/sessions/${currentSessionId}/messages`, {
        content: message,
        context
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data.success) {
          // Add AI response to chat history
          const aiMessage = {
            id: uuidv4(),
            content: data.data.aiMessage.content,
            type: 'assistant',
            timestamp: data.data.aiMessage.timestamp,
            metadata: {
              model: data.data.aiMessage.metadata?.model,
              usage: data.data.aiMessage.metadata?.usage
            }
          };
          
          setChatHistory(prev => [...prev, aiMessage]);
        }
        setIsTyping(false);
      },
      onError: (error) => {
        console.error('Failed to send message:', error);
        
        // If it's a session not found error, try to create a new session
        if (error.response?.status === 404 && error.response?.data?.error === 'Chat session not found') {
          console.log('Session not found, creating new one...');
          createSession();
        }
        
        toast.error('Failed to get AI response');
        setIsTyping(false);
      }
    }
  );

  // Send message
  const sendMessage = useCallback(async (message, context = {}) => {
    console.log('📤 Attempting to send message:', message);
    console.log('🔑 Current session ID:', currentSessionId);
    console.log('⏳ Session loading state:', isSessionLoading);
    
    if (!message || !message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Don't send if session is still loading
    if (isSessionLoading) {
      console.log('⏳ Session still loading, waiting...');
      toast.info('Please wait for session to be ready...');
      return;
    }

    // Ensure we have a valid session
    if (!currentSessionId) {
      console.log('⚠️ No active session, creating new one...');
      try {
        const newSessionId = await createSession();
        if (!newSessionId) {
          toast.error('Failed to create chat session');
          return;
        }
        console.log('🔄 New session created, waiting for state update...');
        
        // Wait for the state to be updated
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check if the session ID is now set
        if (!currentSessionId) {
          console.log('⚠️ Session ID still not set, retrying...');
          toast.error('Session creation failed, please try again');
          return;
        }
        
        console.log('✅ Session ID is now set, proceeding with message...');
      } catch (error) {
        console.error('❌ Failed to create session:', error);
        toast.error('Failed to create chat session');
        return;
      }
    }

    console.log('✅ Valid session exists, proceeding with message send...');

    // Add user message to chat history immediately
    const userMessage = {
      id: uuidv4(),
      content: message.trim(),
      type: 'user',
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    
    // Set typing indicator
    setIsTyping(true);
    
    // Send to AI
    sendMessageMutation.mutate({ message, context });
  }, [currentSessionId, isSessionLoading, createSession, sendMessageMutation]);

  // Get AI insights
  const getInsights = useCallback(async () => {
    try {
      const response = await axios.get('/api/ai/insights');
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to get AI insights:', error);
    }
    return null;
  }, []);

  // Analyze query intent
  const analyzeQuery = useCallback(async (query) => {
    try {
      const response = await axios.post('/api/ai/analyze-intent', { message: query });
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to analyze query:', error);
    }
    return null;
  }, []);

  // Clear chat history
  const clearChat = useCallback(() => {
    setChatHistory([]);
    toast.success('Chat history cleared');
  }, []);

  // Get chat sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery(
    'chat-sessions',
    async () => {
      const response = await axios.get('/api/chat/sessions');
      return response.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      retry: 2
    }
  );

  // Delete chat session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await axios.delete(`/api/chat/sessions/${sessionId}`);
      
      // If deleting current session, create new one
      if (sessionId === currentSessionId) {
        createSession();
      }
      
      // Refresh sessions list
      queryClient.invalidateQueries('chat-sessions');
      
      toast.success('Chat session deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    }
  }, [currentSessionId, createSession, queryClient]);

  const value = {
    // State
    currentSessionId,
    chatHistory,
    isTyping,
    isSessionLoading,
    
    // Data
    sessions: sessionsData?.data || [],
    sessionsLoading,
    
    // Functions
    sendMessage,
    createSession,
    clearChat,
    getInsights,
    analyzeQuery,
    deleteSession,
    loadChatHistory
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
