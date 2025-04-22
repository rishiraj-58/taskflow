"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { isLoaded, isSignedIn, user } = useUser();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid invitation link");
      return;
    }
    
    // Only proceed if the user is authenticated
    if (isLoaded && isSignedIn && user) {
      acceptInvitation();
    } else if (isLoaded && !isSignedIn) {
      // Redirect to sign-in page if not authenticated
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/invitations/accept?token=${token}`)}`);
    }
  }, [token, isLoaded, isSignedIn, user]);
  
  const acceptInvitation = async () => {
    try {
      console.log("Accepting invitation with token:", token?.substring(0, 8) + "...");
      
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }
      
      setWorkspace(data.workspace);
      setStatus("success");
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };
  
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Processing your invitation</h1>
        <p className="text-gray-500">Please wait while we add you to the workspace...</p>
      </div>
    );
  }
  
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-6 bg-red-50 rounded-lg mb-6 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-red-700 mb-4">Unable to accept invitation</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="p-6 bg-green-50 rounded-lg mb-6 max-w-md w-full text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-green-700 mb-4">Invitation Accepted!</h1>
        <p className="text-gray-700 mb-4">
          You have successfully joined{" "}
          <span className="font-semibold">{workspace?.name}</span>.
        </p>
        <p className="text-gray-500 mb-6">You can now collaborate with your team.</p>
        <Button 
          onClick={() => router.push(`/workspaces/${workspace?.id}`)}
          className="w-full"
        >
          Go to Workspace
        </Button>
      </div>
    </div>
  );
} 