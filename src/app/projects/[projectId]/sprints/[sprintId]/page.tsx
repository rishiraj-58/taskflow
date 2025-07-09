import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { format } from "date-fns";
import { checkProjectAccess } from "@/lib/project-access";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ListChecksIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  AlertCircleIcon,
} from "lucide-react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import SprintProgressBar from "@/components/sprints/SprintProgressBar";
import Link from "next/link";
import SprintTaskList from "@/components/sprints/SprintTaskList";
import { Suspense } from "react";
import SprintStatistics from "@/components/sprints/SprintStatistics";

interface SprintPageProps {
  params: {
    projectId: string;
    sprintId: string;
  };
}

export async function generateMetadata({
  params,
}: SprintPageProps): Promise<Metadata> {
  try {
    const sprint = await db.sprint.findUnique({
      where: {
        id: params.sprintId,
        projectId: params.projectId,
      },
      select: {
        name: true,
      },
    });

    return {
      title: sprint?.name || "Sprint Details",
      description: "View and manage sprint details and tasks",
    };
  } catch (error) {
    console.error("Error fetching sprint metadata:", error);
    return {
      title: "Sprint Details",
      description: "View and manage sprint details and tasks",
    };
  }
}

// Main server component
export default async function SprintPage({ params }: SprintPageProps) {
  const authData = await auth();

  if (!authData) {
    redirect("/sign-in");
  }

  // Check user access to the project
  try {
    // Get the database user by Clerk ID
    const dbUser = await db.user.findUnique({
      where: { clerkId: authData.userId ?? undefined },
    });

    if (!dbUser) {
      notFound();
    }

    // Check if user has access to the project via workspace membership
    const project = await db.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: dbUser.id }
            }
          }
        }
      }
    });

    if (!project || project.workspace.members.length === 0) {
      notFound();
    }

    // Fetch the sprint and related statistics
    const sprint = await db.sprint.findUnique({
      where: {
        id: params.sprintId,
        projectId: params.projectId,
      },
    });

    if (!sprint) {
      notFound();
    }

    // Fetch tasks associated with this sprint
    const tasks = await db.task.findMany({
      where: {
        sprintId: params.sprintId,
      },
      include: {
        assignee: true,
      },
    });

    // Calculate task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task: { status: string }) => task.status === "done").length;
    const inProgressTasks = tasks.filter((task: { status: string }) => task.status === "in-progress").length;
    const todoTasks = tasks.filter((task: { status: string }) => task.status === "todo").length;
    
    // Format dates
    const startDate = format(new Date(sprint.startDate), "MMMM d, yyyy");
    const endDate = format(new Date(sprint.endDate), "MMMM d, yyyy");
    
    // Calculate days remaining
    const today = new Date();
    const endDateObj = new Date(sprint.endDate);
    const daysRemaining = Math.ceil((endDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const sprintDuration = Math.ceil((endDateObj.getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24));

    // Get status badge color
    const getStatusBadge = (status: string) => {
      switch (status) {
        case "planned":
          return <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">Planned</Badge>;
        case "active":
          return <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">Active</Badge>;
        case "completed":
          return <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">Completed</Badge>;
        default:
          return null;
      }
    };
    
    return (
      <div className="container mx-auto py-6 animate-fadeIn">
        <div className="relative rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 animate-gradient"></div>
          <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-4">
              <Link href={`/projects/${params.projectId}/sprints`} prefetch={true}>
                <Button variant="outline" size="icon" className="rounded-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all group">
                  <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="sr-only">Back to sprints</span>
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">{sprint.name}</h2>
                  <div className="ml-3">
                    {getStatusBadge(sprint.status)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-blue-500 dark:text-blue-400" />
                    {startDate} - {endDate}
                  </span>
                  {sprint.status === "active" && (
                    <span className="text-sm font-medium flex items-center">
                      <ClockIcon className="h-3.5 w-3.5 mr-1.5 text-amber-500 dark:text-amber-400" />
                      {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ends today'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-6">
          {sprint.description && (
            <Card className="border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-shadow overflow-hidden animate-scaleIn">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
              <CardContent className="pt-6 pl-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">DESCRIPTION</h3>
                <p className="text-foreground">{sprint.description}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Use the client component for statistics */}
          <SprintStatistics 
            initialTotalTasks={totalTasks}
            initialCompletedTasks={completedTasks}
            initialInProgressTasks={inProgressTasks}
            initialTodoTasks={todoTasks}
            sprintId={params.sprintId}
            daysRemaining={daysRemaining}
            sprintDuration={sprintDuration}
          />
          
          <div className="mt-2 animate-scaleIn" style={{ animationDelay: "200ms" }}>
            <Suspense fallback={<div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded-md"></div>}>
              <SprintTaskList projectId={params.projectId} sprintId={params.sprintId} />
            </Suspense>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading sprint:", error);
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href={`/projects/${params.projectId}/sprints`} prefetch={true}>
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Sprints
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Sprint Details</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4 text-red-500">
              <ExclamationTriangleIcon className="h-8 w-8" />
              <div>
                <h3 className="font-semibold">Error Loading Sprint</h3>
                <p>There was a problem loading the sprint details. Please try again later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
} 