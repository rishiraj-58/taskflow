"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Upload, UserPlus, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BulkInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onInvite: () => void;
}

interface InvitationResult {
  email: string;
  success: boolean;
  error?: string;
}

export default function BulkInvitationModal({ isOpen, onClose, workspaceId, onInvite }: BulkInvitationModalProps) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<InvitationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const parseEmails = (emailText: string): string[] => {
    return emailText
      .split(/[,\n\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailList = parseEmails(emails);
    
    if (emailList.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one valid email address.",
      });
      return;
    }

    // Validate all emails
    const invalidEmails = emailList.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid Email Addresses",
        description: `Please fix these emails: ${invalidEmails.join(', ')}`,
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: emailList,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setShowResults(true);
        
        const successCount = data.results.filter((r: InvitationResult) => r.success).length;
        const failureCount = data.results.filter((r: InvitationResult) => !r.success).length;
        
        toast({
          title: "Bulk Invitation Complete",
          description: `${successCount} invitations sent successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}.`,
        });
        
        onInvite();
      } else {
        throw new Error(data.error || "Failed to send invitations");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error sending invitations",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmails("");
    setRole("MEMBER");
    setResults([]);
    setShowResults(false);
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = "email,role\nexample1@company.com,MEMBER\nexample2@company.com,ADMIN\nexample3@company.com,MEMBER";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invitation-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header
      const emailsFromCsv = lines
        .map(line => line.split(',')[0]?.trim())
        .filter(email => email && email.includes('@'))
        .join('\n');
      
      setEmails(emailsFromCsv);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Bulk Invite Team Members
          </DialogTitle>
        </DialogHeader>
        
        {!showResults ? (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Invitation Methods</CardTitle>
                <CardDescription>
                  Choose how you'd like to add team members to your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Manual Entry</h4>
                    <div className="space-y-2">
                      <Label htmlFor="emails">Email addresses</Label>
                      <Textarea
                        id="emails"
                        placeholder="Enter email addresses separated by commas or new lines:&#10;john@company.com&#10;jane@company.com&#10;team@company.com"
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        rows={6}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate emails with commas or new lines
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">CSV Upload</h4>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadTemplate}
                        className="w-full"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                      </Button>
                      <Label htmlFor="csvFile" className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm font-medium">Upload CSV File</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click to browse files
                          </p>
                        </div>
                        <input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="role">Default Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin - Full workspace access</SelectItem>
                  <SelectItem value="MEMBER">Member - Standard access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {emails && (
              <div className="space-y-2">
                <Label>Preview ({parseEmails(emails).length} emails)</Label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto border rounded-md p-2">
                  {parseEmails(emails).map((email, index) => (
                    <Badge 
                      key={index} 
                      variant={validateEmail(email) ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || parseEmails(emails).length === 0}>
                {isLoading ? "Sending..." : `Send ${parseEmails(emails).length} Invitations`}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">Invitations Sent</h3>
              <p className="text-muted-foreground">Review the results below</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Results Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <span className="text-sm font-mono">{result.email}</span>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 