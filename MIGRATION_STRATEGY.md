# TaskFlow Redesign Migration Strategy

## 🎯 Migration Approach Overview

**Strategy**: Incremental transformation leveraging existing components while implementing role-based architecture.

**Focus**: Desktop-first optimization (mobile later)

**Branch**: Working on redesign branch while preserving main

---

## 📋 Current Asset Inventory

### ✅ Components We Can Reuse
Based on your existing structure, these components have solid foundations:

#### Core UI Components (`src/components/ui/`)
- ✅ **Keep as-is**: `button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`
- ✅ **Keep as-is**: `dialog.tsx`, `dropdown-menu.tsx`, `table.tsx`
- ✅ **Keep as-is**: `avatar.tsx`, `badge.tsx`, `separator.tsx`
- 🔄 **Enhance**: `form.tsx` (add role-based validation)

#### Existing Business Components
- ✅ **Reuse Core**: `tasks/TaskCard.tsx`, `tasks/TaskForm.tsx`
- ✅ **Reuse Core**: `projects/ProjectDetail.tsx`, `projects/ProjectsList.tsx`
- ✅ **Reuse Core**: `workspaces/WorkspaceDetail.tsx`, `workspaces/WorkspaceSwitcher.tsx`
- ✅ **Reuse Core**: `sprints/SprintCard.tsx`, `sprints/SprintList.tsx`
- ✅ **Reuse Core**: `bugs/BugList.tsx`, `bugs/CreateBugModal.tsx`

#### AI Components
- ✅ **Enhance**: `ai/AIChatWindow.tsx` (add role-awareness)
- ✅ **Enhance**: `ai/TaskCreationInput.tsx` (role-specific prompts)

### 🔄 Components to Transform

#### Navigation & Layout
- 🔄 **Transform**: `DashboardNav.tsx` → Role-based navigation
- 🔄 **Transform**: `AuthedLayout.tsx` → Context-aware layout
- 🔄 **Add**: Permission-based routing

#### Dashboard Components
- 🔄 **Transform**: `src/app/(dashboard)/dashboard/page.tsx` → Role routing
- 🔄 **Create**: 5 new role-specific dashboard components

### 🆕 New Components Needed

#### Permission System
- `components/permissions/PermissionGate.tsx`
- `components/permissions/RoleBasedView.tsx`
- `components/context/ContextSwitcher.tsx`

#### Role-Specific Dashboards
- `components/dashboards/ExecutiveDashboard.tsx`
- `components/dashboards/ProjectManagerDashboard.tsx`
- `components/dashboards/DeveloperDashboard.tsx`
- `components/dashboards/StakeholderDashboard.tsx`
- `components/dashboards/TeamLeadDashboard.tsx`

---

## 🚀 Phase-by-Phase Migration Plan

### Phase 1A: Database Enhancement (Week 1)
**Goal**: Enhance existing schema without breaking current functionality

```sql
-- Add new columns to existing tables
ALTER TABLE users ADD COLUMN primary_role user_role_enum;
ALTER TABLE users ADD COLUMN ai_preferences jsonb DEFAULT '{}';
ALTER TABLE users ADD COLUMN dashboard_preferences jsonb DEFAULT '{}';

-- Create new tables alongside existing ones
-- (Full schema from implementation plan)
```

**Migration Steps**:
1. ✅ Backup current database
2. ✅ Run schema migration with new role system
3. ✅ Update existing users with default roles
4. ✅ Test current functionality still works

### Phase 1B: Permission Foundation (Week 1-2)
**Goal**: Layer permission system on top of existing components

**New Files to Create**:
```
src/
├── lib/
│   ├── permissions.ts          # Permission checking logic
│   ├── roles.ts                # Role definitions
│   └── context-manager.ts      # Workspace/project context
├── hooks/
│   ├── usePermissions.ts       # Permission checking hook
│   ├── useContext.ts           # Context management hook
│   └── useRoleBasedData.ts     # Role-filtered data fetching
└── components/
    └── permissions/
        ├── PermissionGate.tsx   # Conditional rendering wrapper
        └── RoleBasedView.tsx    # Role-specific view switcher
```

**Enhance Existing Components**:
```tsx
// Example: Enhance existing TaskCard.tsx
export function TaskCard({ task }: TaskCardProps) {
  const permissions = usePermissions();
  
  return (
    <Card>
      <CardContent>
        <h3>{task.title}</h3>
        <p>{task.description}</p>
        
        <PermissionGate action="edit" resource="task">
          <Button onClick={() => editTask(task.id)}>Edit</Button>
        </PermissionGate>
        
        <PermissionGate action="delete" resource="task">
          <Button variant="destructive">Delete</Button>
        </PermissionGate>
      </CardContent>
    </Card>
  );
}
```

### Phase 1C: Context Management (Week 2)
**Goal**: Add workspace/project context switching to existing layout

**Enhance Existing**:
```tsx
// Transform existing AuthedLayout.tsx
export function AuthedLayout({ children }: AuthedLayoutProps) {
  const { user } = useAuth();
  const { currentWorkspace, currentProject } = useContext();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <Logo />
          <ContextSwitcher /> {/* New component */}
          <nav className="ml-auto">
            <RoleBasedNavigation /> {/* Enhanced navigation */}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

### Phase 2A: Role-Based Dashboard Routing (Week 3)
**Goal**: Transform main dashboard into role router

**Transform Existing Dashboard**:
```tsx
// Transform src/app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user.primaryRole;
  
  // Route to appropriate dashboard based on role
  switch (role) {
    case 'workspace_creator':
      return <ExecutiveDashboard />;
    case 'project_manager':
      return <ProjectManagerDashboard />;
    case 'developer':
      return <DeveloperDashboard />;
    case 'stakeholder':
      return <StakeholderDashboard />;
    case 'team_lead':
      return <TeamLeadDashboard />;
    default:
      return <DefaultDashboard />;
  }
}
```

### Phase 2B: Build Role-Specific Dashboards (Weeks 3-6)
**Goal**: Create 5 specialized dashboards reusing existing components

**Dashboard Architecture**:
```tsx
// Example: ExecutiveDashboard.tsx
export function ExecutiveDashboard() {
  const workspaceData = useDashboardData('workspace_creator');
  
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1>Executive Dashboard</h1>
        <WorkspaceSelector /> {/* Existing component */}
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WorkspaceHealthCard data={workspaceData.health} />
        <PortfolioOverview projects={workspaceData.projects} />
        <ResourceUtilization data={workspaceData.resources} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategicRecommendations /> {/* AI-powered */}
        <RecentActivity activities={workspaceData.activities} />
      </div>
    </div>
  );
}
```

**Reuse Strategy for Each Dashboard**:
- **Executive**: Reuse `ProjectsList`, `WorkspaceDetail`, add new analytics
- **PM**: Reuse `SprintList`, `TasksList`, add workload management
- **Developer**: Reuse `TaskCard`, `CalendarView`, add focus mode
- **Stakeholder**: Reuse `ProjectDetail`, add ROI tracking
- **Team Lead**: Reuse existing components, add code quality metrics

---

## 🔧 Implementation Strategy

### Week 1: Foundation Setup
```bash
# 1. Database migration
npm run db:migrate

# 2. Install new dependencies if needed
npm install @tanstack/react-query zustand

# 3. Create permission system
mkdir -p src/lib src/hooks src/components/permissions
```

### Week 2: Component Enhancement
```bash
# Gradually enhance existing components
# Start with most-used components first:
# 1. TaskCard.tsx
# 2. ProjectDetail.tsx  
# 3. WorkspaceDetail.tsx
# 4. Navigation components
```

### Week 3-4: Dashboard Development
```bash
# Create dashboards one by one:
# Priority order: Executive → PM → Developer → Stakeholder → Team Lead
```

### Week 5-6: AI Enhancement
```bash
# Enhance existing AI components:
# 1. Make AIChatWindow role-aware
# 2. Add role-specific AI assistants
# 3. Integrate AI into dashboards
```

---

## 🔄 Gradual Rollout Strategy

### Strategy 1: Feature Flags
```typescript
// Add feature flags for gradual rollout
const useNewDashboard = process.env.NEXT_PUBLIC_NEW_DASHBOARD === 'true';

export default function DashboardPage() {
  if (useNewDashboard) {
    return <NewRoleBasedDashboard />;
  }
  return <ExistingDashboard />;
}
```

### Strategy 2: Role-by-Role Rollout
```typescript
// Roll out new dashboards by role
const ENABLED_ROLES = ['workspace_creator', 'project_manager'];

export default function DashboardPage() {
  const { user } = useAuth();
  
  if (ENABLED_ROLES.includes(user.primaryRole)) {
    return <NewRoleBasedDashboard />;
  }
  return <ExistingDashboard />;
}
```

---

## 📊 Component Reuse Matrix

| Existing Component | Reuse Level | Required Changes | New Role Usage |
|-------------------|-------------|------------------|----------------|
| `TaskCard` | ✅ High | Add permissions | All roles |
| `ProjectDetail` | ✅ High | Add role filtering | PM, Stakeholder, Lead |
| `SprintCard` | ✅ High | Add PM-specific actions | PM, Developer |
| `WorkspaceSwitcher` | ✅ High | Add context awareness | All roles |
| `AIChatWindow` | 🔄 Medium | Add role-specific prompts | All roles |
| `DashboardNav` | 🔄 Medium | Role-based menu items | All roles |
| `BugList` | ✅ High | Add severity filtering | PM, Developer, Lead |
| `CalendarView` | ✅ High | Add role-based task filtering | Developer, PM |

---

## 🚦 Testing During Migration

### Regression Testing
```bash
# Ensure existing functionality works
npm run test
npm run test:e2e

# Test with existing user data
npm run test:migration
```

### Role-Based Testing
```bash
# Test each role's experience
npm run test:role:executive
npm run test:role:pm
npm run test:role:developer
npm run test:role:stakeholder
npm run test:role:teamlead
```

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup current database
- [ ] Document current user roles/permissions
- [ ] Test current functionality
- [ ] Set up feature flags

### Week 1 (Foundation)
- [ ] Database schema migration completed
- [ ] Permission system implemented
- [ ] Context management working
- [ ] Existing components still functional

### Week 2 (Enhancement)
- [ ] Key components enhanced with permissions
- [ ] Role-based navigation implemented
- [ ] Context switching working
- [ ] No breaking changes to existing features

### Week 3-6 (Dashboard Development)
- [ ] Executive dashboard completed and tested
- [ ] PM dashboard completed and tested
- [ ] Developer dashboard completed and tested
- [ ] Stakeholder dashboard completed and tested
- [ ] Team lead dashboard completed and tested

### Post-Migration
- [ ] All existing features work with new system
- [ ] Performance maintained or improved
- [ ] User experience improved for all roles
- [ ] Documentation updated

---

This migration strategy lets you build incrementally on your existing work while transforming it into the role-based system. You keep what works and enhance what needs improvement, minimizing risk while maximizing reuse of your current components. 