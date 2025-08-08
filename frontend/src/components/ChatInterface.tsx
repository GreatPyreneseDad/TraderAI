import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Database, Brain, Newspaper } from 'lucide-react';
import { useMarketStore } from '@/stores/marketStore';
import { api } from '@/services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'pandas' | 'claude';
  data?: any;
  timestamp: Date;
}

interface ChatInterfaceProps {
  chatType: 'pandas' | 'claude';
}

export function ChatInterface({ chatType }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: chatType === 'pandas' 
        ? 'Ask me anything about the market data! I can analyze trends, find correlations, and generate insights from real-time data.'
        : 'I\'m Claude, your AI market analyst. I can help you understand market patterns using GCT coherence metrics and provide strategic insights.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { marketData, selectedSymbols } = useMarketStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (chatType === 'pandas') {
        // Get current market data for selected symbols
        const currentData = selectedSymbols.map(symbol => ({
          symbol,
          ...marketData[symbol]
        }));

        const response = await api.chatPandas({
          query: input,
          marketData: currentData
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          type: 'pandas',
          data: response.analysis,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Claude chat
        const response = await api.chatClaude({
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          })).concat([{ role: 'user', content: input }]),
          context: {
            selectedSymbols,
            marketData: Object.fromEntries(
              selectedSymbols.map(s => [s, marketData[s]])
            )
          }
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message.content,
          type: 'claude',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.role === 'user') return User;
    if (message.type === 'pandas') return Database;
    return Brain;
  };

  const formatMessage = (message: Message) => {
    // If it's a PandasAI message with insights, format them nicely
    if (message.type === 'pandas' && message.data?.insights?.length > 0) {
      return (
        <div className="space-y-3">
          <p>{message.content}</p>
          {message.data.insights.map((insight: any, idx: number) => (
            <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">{insight.type.replace('_', ' ').toUpperCase()}</p>
              <p className="text-sm text-blue-800">{insight.message}</p>
              {insight.data && (
                <div className="mt-2 text-xs text-blue-600">
                  {Object.entries(insight.data).map(([key, value]) => (
                    <span key={key} className="mr-3">
                      {key}: {typeof value === 'number' ? (value as number).toFixed(2) : String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return message.content;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {chatType === 'pandas' ? (
              <>
                <Database className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">PandasAI Analysis</h3>
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Claude Market Analyst</h3>
              </>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Newspaper className="h-4 w-4 mr-1" />
            <span>Live data & news</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => {
          const Icon = getMessageIcon(message);
          const isUser = message.role === 'user';
          
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isUser ? 'bg-gray-600' : 
                    message.type === 'pandas' ? 'bg-indigo-600' : 'bg-purple-600'
                  }`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-lg px-4 py-2 ${
                    isUser ? 'bg-gray-600 text-white' : 
                    message.role === 'system' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-50 text-gray-900'
                  }`}>
                    <div className="text-sm">{formatMessage(message)}</div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              chatType === 'pandas' 
                ? "Ask about correlations, trends, or patterns..."
                : "Ask about market strategy, coherence metrics, or insights..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary flex items-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Analyzing: {selectedSymbols.length > 0 ? selectedSymbols.join(', ') : 'Add symbols to watchlist'}
        </p>
      </form>
    </div>
  );
}