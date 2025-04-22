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
} from "lucide-react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import SprintProgressBar from "@/components/sprints/SprintProgressBar";
import Link from "next/link";
import SprintTaskList from "@/components/sprints/SprintTaskList";

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

export default async function SprintPage({ params }: SprintPageProps) {
  const authData = await auth();

  if (!authData) {
    redirect("/sign-in");
  }

  // Check user access to the project
  try {
    // Get the database user by Clerk ID
    const dbUser = await db.user.findUnique({
      where: { clerkId: authData.userId },
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

    // Get status badge color
    const getStatusBadge = (status: string) => {
      switch (status) {
        case "planned":
          return <Badge variant="outline" className="bg-slate-100 text-slate-800">Planned</Badge>;
        case "active":
          return <Badge variant="default" className="bg-blue-500">Active</Badge>;
        case "completed":
          return <Badge variant="default" className="bg-green-500">Completed</Badge>;
        default:
          return null;
      }
    };
    
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Link href={`/projects/${params.projectId}/sprints`}>
              <Button variant="outline" size="icon">
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{sprint.name}</h2>
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-muted-foreground text-sm">
                  <CalendarIcon className="inline h-3 w-3 mr-1" />
                  {startDate} - {endDate}
                </span>
                {getStatusBadge(sprint.status)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-8">
          {sprint.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">{sprint.description}</p>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {Math.ceil((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ListChecksIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{totalTasks}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircleIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{completedTasks}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <SprintProgressBar 
                  completedTasks={completedTasks} 
                  totalTasks={totalTasks} 
                />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <SprintTaskList projectId={params.projectId} sprintId={params.sprintId} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching sprint or task data:", error);
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <ExclamationTriangleIcon className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Database connection error</h1>
          <p className="text-muted-foreground">
            We encountered an error while retrieving sprint data. Please try again later.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/projects/${params.projectId}/sprints`}>
              Back to Sprints
            </Link>
          </Button>
        </div>
      </div>
    );
  }
} 