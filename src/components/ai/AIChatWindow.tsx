'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Send, Bot, User, Loader2, AlertCircle, CheckCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  intent?: string;
  toolsUsed?: string[];
  actions?: PendingActionSummary[];
}

interface PendingActionSummary {
  type: string;
  description: string;
  confidence: number;
}

interface AssistantInfo {
  icon: any;
  name: string;
  color: string;
  description: string;
}

interface ConversationStatus {
  hasActiveConversation: boolean;
  context?: {
    sessionId?: string;
    messageCount?: number;
    activeIntent?: string;
  };
}

interface AIChatWindowProps {
  onClose: () => void;
  assistantInfo: AssistantInfo;
  conversationStatus: ConversationStatus | null;
  context?: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
  };
  onConversationUpdate?: (status: ConversationStatus) => void;
}

export default function AIChatWindow({ 
  onClose, 
  assistantInfo, 
  conversationStatus, 
  context,
  onConversationUpdate 
}: AIChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Focus textarea when window opens
  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  // Load conversation history on mount
  useEffect(() => {
    if (conversationStatus?.hasActiveConversation) {
      // In a real implementation, we'd load the conversation history here
      // For now, we'll start fresh but show that there's an active conversation
      console.log('Loading conversation history...');
    }
  }, [conversationStatus]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Send message to our enhanced AI chat API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          context: context,
          action: 'chat'
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Update user message status
      setMessages(prev => 
        prev.map(m => 
          m.id === userMessage.id 
            ? { ...m, status: 'sent' }
            : m
        )
      );

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        intent: data.intent,
        toolsUsed: data.toolsUsed || [],
        actions: data.actions || []
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation status
      if (onConversationUpdate) {
        onConversationUpdate({
          hasActiveConversation: true,
          context: {
            sessionId: data.conversationId,
            messageCount: messages.length + 2,
            activeIntent: data.intent
          }
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update user message status to error
      setMessages(prev => 
        prev.map(m => 
          m.id === userMessage.id 
            ? { ...m, status: 'error' }
            : m
        )
      );

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
        status: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearConversation = async () => {
    try {
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear'
        }),
      });

      setMessages([]);
      
      if (onConversationUpdate) {
        onConversationUpdate({
          hasActiveConversation: false
        });
      }

    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const IconComponent = assistantInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <Card className="w-full max-w-md h-[600px] shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className={cn(
          "pb-3 bg-gradient-to-r text-white rounded-t-lg",
          assistantInfo.color
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {assistantInfo.name}
                </CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  {assistantInfo.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {messages.length > 0 && (
                <Button
                  onClick={clearConversation}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={onClose}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[calc(600px-120px)]">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">
                    Hi! I'm your {assistantInfo.name}.
                  </p>
                  <p className="text-sm text-gray-400">
                    How can I help you today?
                  </p>
                  {context?.projectId && (
                    <Badge variant="outline" className="mt-2">
                      Working on current project
                    </Badge>
                  )}
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm",
                      `bg-gradient-to-r ${assistantInfo.color}`
                    )}>
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn(
                        "text-xs",
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      )}>
                        {formatTimestamp(message.timestamp)}
                      </span>

                      {message.status === 'sending' && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-200" />
                      )}
                      {message.status === 'error' && (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      )}
                      {message.status === 'sent' && message.role === 'user' && (
                        <CheckCircle className="h-3 w-3 text-blue-200" />
                      )}
                    </div>

                    {/* Show AI tools used */}
                    {message.toolsUsed && message.toolsUsed.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.toolsUsed.map((tool, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Show detected intent */}
                    {message.intent && message.role === 'assistant' && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {message.intent.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex space-x-3 justify-start">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm",
                    `bg-gradient-to-r ${assistantInfo.color}`
                  )}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex space-x-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask your ${assistantInfo.name} anything...`}
                className="min-h-[40px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className={cn(
                  "h-10 w-10 p-0",
                  `bg-gradient-to-r ${assistantInfo.color}`
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {context?.projectId && (
              <div className="mt-2 text-xs text-gray-500">
                💡 I have context about your current project and workspace
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 