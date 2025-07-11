export interface ConversationState {
  sessionId: string;
  userId: string;
  currentContext: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    sprintId?: string;
  };
  activeIntent: ConversationIntent | null;
  pendingActions: PendingAction[];
  userPreferences: UserPreferences;
  conversationHistory: ConversationTurn[];
  lastInteraction: Date;
  contextUpdatedAt: Date;
}

export type ConversationIntent = 
  | 'task_creation'
  | 'task_update'
  | 'project_planning'
  | 'sprint_management'
  | 'bug_reporting'
  | 'status_inquiry'
  | 'analytics_request'
  | 'team_coordination'
  | 'general_help';

export interface PendingAction {
  id: string;
  type: ActionType;
  extractedData: Record<string, any>;
  missingFields: string[];
  confidenceScore: number;
  userConfirmationRequired: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export type ActionType = 
  | 'create_task'
  | 'update_task'
  | 'create_project'
  | 'update_project'
  | 'create_sprint'
  | 'assign_task'
  | 'move_task'
  | 'create_bug'
  | 'generate_report';

export interface UserPreferences {
  preferredResponseStyle: 'concise' | 'detailed' | 'technical';
  notificationLevel: 'minimal' | 'normal' | 'verbose';
  autoConfirmActions: boolean;
  preferredTimeFormat: '12h' | '24h';
  timezone: string;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  intent: ConversationIntent | null;
  actionsExecuted: string[];
  context: any;
}

// In-memory conversation state store
class ConversationStateManager {
  private states: Map<string, ConversationState> = new Map();
  private readonly STATE_EXPIRY_HOURS = 24;
  
  constructor() {
    // Clean up expired states every hour
    setInterval(() => this.cleanupExpiredStates(), 60 * 60 * 1000);
  }
  
  getState(userId: string): ConversationState | null {
    const state = this.states.get(userId);
    if (!state) return null;
    
    // Check if state is expired
    const expiryTime = new Date(state.lastInteraction.getTime() + this.STATE_EXPIRY_HOURS * 60 * 60 * 1000);
    if (new Date() > expiryTime) {
      this.states.delete(userId);
      return null;
    }
    
    return state;
  }
  
  createState(userId: string, context?: Partial<ConversationState['currentContext']>): ConversationState {
    const state: ConversationState = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      currentContext: context || {},
      activeIntent: null,
      pendingActions: [],
      userPreferences: {
        preferredResponseStyle: 'detailed',
        notificationLevel: 'normal',
        autoConfirmActions: false,
        preferredTimeFormat: '12h',
        timezone: 'UTC'
      },
      conversationHistory: [],
      lastInteraction: new Date(),
      contextUpdatedAt: new Date()
    };
    
    this.states.set(userId, state);
    return state;
  }
  
  updateState(userId: string, updates: Partial<ConversationState>): ConversationState | null {
    const state = this.getState(userId);
    if (!state) return null;
    
    const updatedState = {
      ...state,
      ...updates,
      lastInteraction: new Date()
    };
    
    this.states.set(userId, updatedState);
    return updatedState;
  }
  
  addConversationTurn(userId: string, turn: Omit<ConversationTurn, 'id' | 'timestamp'>): boolean {
    const state = this.getState(userId);
    if (!state) return false;
    
    const fullTurn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...turn
    };
    
    state.conversationHistory.push(fullTurn);
    
    // Keep only last 50 turns
    if (state.conversationHistory.length > 50) {
      state.conversationHistory = state.conversationHistory.slice(-50);
    }
    
    state.lastInteraction = new Date();
    this.states.set(userId, state);
    return true;
  }
  
  addPendingAction(userId: string, action: Omit<PendingAction, 'id' | 'createdAt' | 'expiresAt'>): boolean {
    const state = this.getState(userId);
    if (!state) return false;
    
    const fullAction: PendingAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      ...action
    };
    
    state.pendingActions.push(fullAction);
    state.lastInteraction = new Date();
    this.states.set(userId, state);
    return true;
  }
  
  removePendingAction(userId: string, actionId: string): boolean {
    const state = this.getState(userId);
    if (!state) return false;
    
    const initialLength = state.pendingActions.length;
    state.pendingActions = state.pendingActions.filter(action => action.id !== actionId);
    
    if (state.pendingActions.length < initialLength) {
      state.lastInteraction = new Date();
      this.states.set(userId, state);
      return true;
    }
    
    return false;
  }
  
  updateContext(userId: string, context: Partial<ConversationState['currentContext']>): boolean {
    const state = this.getState(userId);
    if (!state) return false;
    
    state.currentContext = { ...state.currentContext, ...context };
    state.contextUpdatedAt = new Date();
    state.lastInteraction = new Date();
    this.states.set(userId, state);
    return true;
  }
  
  setActiveIntent(userId: string, intent: ConversationIntent | null): boolean {
    const state = this.getState(userId);
    if (!state) return false;
    
    state.activeIntent = intent;
    state.lastInteraction = new Date();
    this.states.set(userId, state);
    return true;
  }
  
  private cleanupExpiredStates(): void {
    const now = new Date();
    const expiredUsers: string[] = [];
    
    for (const [userId, state] of Array.from(this.states.entries())) {
      const expiryTime = new Date(state.lastInteraction.getTime() + this.STATE_EXPIRY_HOURS * 60 * 60 * 1000);
      if (now > expiryTime) {
        expiredUsers.push(userId);
      }
    }
    
    expiredUsers.forEach(userId => {
      this.states.delete(userId);
      console.log(`Cleaned up expired conversation state for user: ${userId}`);
    });
    
    if (expiredUsers.length > 0) {
      console.log(`Cleaned up ${expiredUsers.length} expired conversation states`);
    }
  }
  
  // Development helper methods
  getStateCount(): number {
    return this.states.size;
  }
  
  getAllUserIds(): string[] {
    return Array.from(this.states.keys());
  }
  
  clearState(userId: string): boolean {
    return this.states.delete(userId);
  }
}

// Export singleton instance
export const conversationStateManager = new ConversationStateManager();

// Helper functions
export function createInitialUserPreferences(userRole?: string): UserPreferences {
  const basePreferences: UserPreferences = {
    preferredResponseStyle: 'detailed',
    notificationLevel: 'normal',
    autoConfirmActions: false,
    preferredTimeFormat: '12h',
    timezone: 'UTC'
  };
  
  // Customize based on role
  switch (userRole?.toLowerCase()) {
    case 'workspace_creator':
      return { ...basePreferences, preferredResponseStyle: 'concise', notificationLevel: 'minimal' };
    case 'developer':
      return { ...basePreferences, preferredResponseStyle: 'technical', notificationLevel: 'normal' };
    case 'project_manager':
      return { ...basePreferences, preferredResponseStyle: 'detailed', notificationLevel: 'verbose' };
    default:
      return basePreferences;
  }
}

export function isActionExpired(action: PendingAction): boolean {
  return new Date() > action.expiresAt;
}

export function getActiveActions(state: ConversationState): PendingAction[] {
  return state.pendingActions.filter(action => !isActionExpired(action));
}

export function getRecentHistory(state: ConversationState, count: number = 10): ConversationTurn[] {
  return state.conversationHistory.slice(-count);
} 