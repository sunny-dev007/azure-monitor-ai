import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Plus,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAzure } from '../context/AzureContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const Chat = () => {
  const { 
    chatHistory, 
    sendMessage, 
    isTyping, 
    createSession, 
    clearChat, 
    sessions,
    deleteSession,
    currentSessionId,
    isSessionLoading
  } = useChat();
  
  const { subscriptionSummary, resources, costs, recommendations } = useAzure();
  
  const [inputMessage, setInputMessage] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Generate suggested questions based on Azure data
  useEffect(() => {
    const suggestions = [];
    
    if (subscriptionSummary) {
      suggestions.push(
        `What are my top 5 most expensive resources this month?`,
        `How can I optimize costs in my Azure subscription?`,
        `What are the latest Azure Advisor recommendations?`,
        `Show me a summary of my current Azure environment`
      );
    }
    
    if (resources && resources.length > 0) {
      // Check if there are web apps
      const hasWebApps = resources.some(r => r.type.includes('Microsoft.Web'));
      if (hasWebApps) {
        suggestions.push(
          `Show me my current web applications and their costs`,
          `How many web apps do I have running?`,
          `What are the costs of my web applications?`
        );
      }
      
      suggestions.push(
        `How many virtual machines do I have running?`,
        `What resources are in the ${subscriptionSummary?.resourceTypes ? Object.keys(subscriptionSummary.resourceTypes)[0] : 'default'} resource group?`
      );
    }
    
    if (costs && costs.totalCost > 0) {
      suggestions.push(
        `What's my cost trend for the last 30 days?`,
        `Which resource types are costing me the most?`
      );
    }
    
    setSuggestedQuestions(suggestions);
  }, [subscriptionSummary, resources, costs]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    
    console.log('🚀 Sending message:', message);
    console.log('🔑 Current session ID:', currentSessionId);
    console.log('⏳ Session loading:', isSessionLoading);
    
    // Prepare comprehensive context for AI
    const context = {
      subscriptionSummary,
      resources: resources ? resources.slice(0, 200) : [], // Increased limit to include more resources
      costs: costs?.summary || [],
      recommendations: recommendations?.recommendations || [],
      resourceGroups: resources ? [...new Set(resources.map(r => r.resourceGroup))].filter(Boolean) : [],
      resourceTypes: resources ? [...new Set(resources.map(r => r.type))] : [],
      locations: resources ? [...new Set(resources.map(r => r.location))].filter(Boolean) : []
    };
    
    console.log('📊 Sending context with:', {
      resourcesCount: context.resources.length,
      resourceTypes: context.resourceTypes.length,
      resourceGroups: context.resourceGroups.length,
      hasCosts: !!context.costs.length,
      hasRecommendations: !!context.recommendations.length
    });
    
    await sendMessage(message, context);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (type) => {
    if (type === 'user') {
      return (
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-azure-600 rounded-full flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
    );
  };

  const getMessageBubbleClass = (type) => {
    return type === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant';
  };

  const renderMessageContent = (message) => {
    if (message.type === 'assistant') {
      return (
        <ReactMarkdown
          className="prose prose-sm max-w-none"
          components={{
            code: ({ node, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline ? (
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            },
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-gray-700">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
            em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 bg-gray-50 py-2 rounded-r">
                {children}
              </blockquote>
            )
          }}
        >
          {message.content}
        </ReactMarkdown>
      );
    }
    
    return <p className="text-white">{message.content}</p>;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Azure AI Assistant</h1>
              <p className="text-sm text-gray-500">Your intelligent Azure optimization companion</p>
            </div>
          </div>
          
          {/* Session Status */}
          <div className="flex items-center space-x-4">
            {isSessionLoading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Creating session...</span>
              </div>
            )}
            {currentSessionId && (
              <div className="text-sm text-gray-500">
                Session: {currentSessionId.substring(0, 8)}...
              </div>
            )}
            <button
              onClick={createSession}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-azure-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Azure AI Assistant!</h2>
                <p className="text-gray-600 mb-6">I'm here to help you understand and optimize your Azure environment.</p>
                
                {/* Suggested Questions */}
                {showSuggestions && suggestedQuestions.length > 0 && (
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Try asking me about:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedQuestions.map((question, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleSuggestedQuestion(question)}
                          className="p-3 text-left text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                        >
                          {question}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <AnimatePresence>
                {chatHistory.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex space-x-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'assistant' && getMessageIcon('assistant')}
                    
                    <div className={`chat-bubble ${getMessageBubbleClass(message.type)} max-w-2xl`}>
                      {renderMessageContent(message)}
                      
                      {/* Message metadata */}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.metadata?.intent && (
                          <span className="px-2 py-1 bg-gray-200 rounded-full">
                            {message.metadata.intent}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {message.type === 'user' && getMessageIcon('user')}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex space-x-3"
              >
                {getMessageIcon('assistant')}
                <div className="chat-bubble-assistant">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-gray-500 text-sm">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isSessionLoading ? "Creating session..." : "Ask me about Azure optimization, costs, or resources..."}
                  disabled={isSessionLoading || isTyping}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={3}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSessionLoading || isTyping}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isTyping ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </p>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {showSuggestions ? 'Hide' : 'Show'} suggestions
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Chat Sessions */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat Sessions</h3>
          
          <div className="space-y-2">
            {sessions && sessions.length > 0 ? (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Session {session.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.messageCount || 0} messages
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No chat sessions yet</p>
                <p className="text-xs">Start a conversation to see sessions here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
