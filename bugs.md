# TaskFlow Bugs and Issues

## High Priority

1. **Task Details Not Loading**
   - Description: When clicking on a task from the task list, the details page is not loading properly
   - Location: /src/app/projects/[projectId]/tasks/[taskId]/page.tsx
   - Priority: High
   - Status: To Fix

2. **Edit Task Button Not Working**
   - Description: Clicking the Edit button on a task results in a 404 error
   - Location: Task detail page
   - Priority: High
   - Status: ✅ Fixed - Created the edit task page component

3. **Sprint Progress Not Showing**
   - Description: The progress bar on the sprint cards is not working correctly
   - Location: /src/components/sprints/SprintProgressBar.tsx
   - Priority: High
   - Status: ✅ Fixed - Corrected status comparison in API (uppercase vs lowercase issue)

4. **Sprint Statistics Not Updating**
   - Description: When tasks are added or their status changes, the sprint statistics do not update
   - Location: /src/components/sprints/SprintTaskList.tsx
   - Priority: High
   - Status: ✅ Fixed - Implemented real-time updates with custom events

5. **Sprints Page Error**
   - Description: TypeError when accessing sprints page related to status.toLowerCase()
   - Location: /src/components/sprints/SprintList.tsx
   - Priority: High
   - Status: ✅ Fixed - Added null check for status value

## Medium Priority

6. **Project Deletion Not Working**
   - Description: Clicking Delete or Archive on a project results in a Prisma validation error
   - Location: Project settings tab and API routes
   - Priority: Medium
   - Status: ✅ Fixed - Fixed Prisma query to correctly handle role permissions

7. **Project Settings Not Saving**
   - Description: When editing project details (name, description, status), changes aren't being saved
   - Location: /src/components/projects/ProjectDetail.tsx
   - Priority: Medium
   - Status: ✅ Fixed - Added proper form handling and state management for settings

8. **Task Filtering Broken**
   - Description: Filtering tasks by status doesn't work
   - Location: /src/components/tasks/TaskFilters.tsx
   - Priority: Medium
   - Status: To Fix

9. **Member Removal Fails**
   - Description: Removing a member from a project or changing their role doesn't work
   - Location: /src/app/api/projects/[projectId]/members/route.ts
   - Priority: Medium
   - Status: ✅ Fixed - Implemented PATCH and DELETE endpoints and connected UI actions

## Low Priority

10. **Dark Mode Toggle Missing**
    - Description: No way to toggle between light and dark mode
    - Location: /src/components/ThemeToggle.tsx needed
    - Priority: Low
    - Status: To Fix

11. **Profile Image Upload**
    - Description: User profile image upload not working
    - Location: /src/app/profile/page.tsx
    - Priority: Low
    - Status: To Fix

12. **Mobile Responsiveness Issues**
    - Description: Some pages don't display well on mobile devices
    - Location: Various components
    - Priority: Low
    - Status: To Fix

## Feature Implementations

13. **AI Assistant for Natural Language Task Management**
    - Description: Implement AI chat window for natural language task creation and management
    - Location: Multiple components and API routes
    - Priority: High
    - Status: ✅ Implemented - Created AI service, chat UI, and task action system

## Fixed Issues

✅ **Edit Task Button Not Working**: Created the missing edit task page at `/projects/[projectId]/tasks/[taskId]/edit` with full functionality.

✅ **Sprint Statistics Not Updating**: Implemented real-time updates using custom events for both task status changes and sprint statistics. Added refresh functionality.

✅ **Sprints Page Error**: Fixed the TypeError in SprintList.tsx by adding null checking before accessing toLowerCase() method.

✅ **Sprint Progress Not Showing**: Fixed a case-sensitivity issue in the sprints API where it was looking for "DONE" status (uppercase) but the database uses "done" (lowercase).

✅ **Project Deletion Not Working**: Fixed Prisma validation errors in the API by removing invalid role enum values and implementing a proper permission check for owners and admins.

✅ **Project Settings Not Saving**: Implemented proper form state management with React hooks and connected form submission to the PATCH API endpoint for updating project details.

✅ **Member Removal Fails**: Added missing API endpoints (PATCH for role changes, DELETE for removal) and connected them to the UI buttons in the member management section.

✅ **AI Assistant for Natural Language Task Management**: Implemented an AI-powered chat interface that allows users to create and manage tasks using natural language. Created AI service with Azure Inference API integration, chat window UI component, API routes for AI communication, and a task action system with confirmation dialogs. 