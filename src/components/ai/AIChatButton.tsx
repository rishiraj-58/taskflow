'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import AIChatWindow from './AIChatWindow';

interface ConversationStatus {
  hasActiveConversation: boolean;
  context?: {
    sessionId?: string;
    messageCount?: number;
    activeIntent?: string;
  };
}

export default function AIChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const { currentWorkspace, currentProject } = useWorkspaceContext();

  // Get conversation status on mount and when context changes
  useEffect(() => {
    async function fetchConversationStatus() {
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          setConversationStatus({
            hasActiveConversation: data.hasActiveConversation,
            context: data.context
          });
        }
      } catch (error) {
        console.error('Failed to fetch conversation status:', error);
      }
    }

    if (user) {
      fetchConversationStatus();
    }
  }, [user, currentWorkspace?.id, currentProject?.id]);

  // Get role-based AI assistant info
  const getAssistantInfo = () => {
    const role = user?.publicMetadata?.primaryRole as string || 'developer';
    
    switch (role) {
      case 'workspace_creator':
        return {
          icon: Brain,
          name: 'Strategic Advisor',
          color: 'from-purple-600 to-indigo-600',
          description: 'Portfolio insights & strategic planning'
        };
      case 'project_manager':
        return {
          icon: Zap,
          name: 'Project Conductor',
          color: 'from-blue-600 to-cyan-600',
          description: 'Sprint planning & team coordination'
        };
      case 'team_lead':
        return {
          icon: Brain,
          name: 'Technical Architect',
          color: 'from-emerald-600 to-teal-600',
          description: 'Code quality & architecture guidance'
        };
      case 'stakeholder':
        return {
          icon: Sparkles,
          name: 'Business Translator',
          color: 'from-orange-600 to-red-600',
          description: 'Project insights & ROI tracking'
        };
      default:
        return {
          icon: MessageCircle,
          name: 'Code Companion',
          color: 'from-blue-600 to-purple-600',
          description: 'Development assistance & best practices'
        };
    }
  };

  const assistantInfo = getAssistantInfo();
  const IconComponent = assistantInfo.icon;

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Context indicator */}
          {conversationStatus?.hasActiveConversation && (
            <div className="absolute -top-2 -right-2 z-10">
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 border-green-200">
                {conversationStatus.context?.messageCount || 0}
              </Badge>
            </div>
          )}

          {/* Main chat button */}
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            disabled={isLoading}
            className={cn(
              "h-14 w-14 rounded-full shadow-lg hover:shadow-xl",
              `bg-gradient-to-r ${assistantInfo.color} hover:scale-110`,
              "transition-all duration-200 group relative overflow-hidden",
              "flex items-center justify-center"
            )}
          >
            <IconComponent className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
            
            {/* Pulse animation for active conversation */}
            {conversationStatus?.hasActiveConversation && (
              <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
            )}
          </Button>

          {/* Tooltip on hover */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              <div className="font-medium">{assistantInfo.name}</div>
              <div className="text-gray-300">{assistantInfo.description}</div>
              {currentProject && (
                <div className="text-gray-400 mt-1">Project: {currentProject.name}</div>
              )}
            </div>
            <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <AIChatWindow 
          onClose={() => setIsOpen(false)}
          assistantInfo={assistantInfo}
          conversationStatus={conversationStatus}
          context={{
            workspaceId: currentWorkspace?.id,
            projectId: currentProject?.id
          }}
          onConversationUpdate={(newStatus) => setConversationStatus(newStatus)}
        />
      )}
    </>
  );
} 