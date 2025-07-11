"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, UserPlus, Download, AlertCircle, CheckCircle2, Users, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EnhancedInvitationModalProps {
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

export default function EnhancedInvitationModal({ isOpen, onClose, workspaceId, onInvite }: EnhancedInvitationModalProps) {
  // Single invitation state
  const [singleEmail, setSingleEmail] = useState("");
  const [singleRole, setSingleRole] = useState("MEMBER");

  // Bulk invitation state
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState("MEMBER");
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<InvitationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseEmails = (emailText: string): string[] => {
    return emailText
      .split(/[,\n\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));
  };

  const handleSingleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!singleEmail || !validateEmail(singleEmail)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: singleEmail,
          role: singleRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults([{ email: singleEmail, success: true }]);
        setShowResults(true);
        setSingleEmail("");
        
        toast({
          title: "Invitation sent",
          description: `Invitation has been sent to ${singleEmail}.`,
        });
        
        onInvite();
      } else {
        setResults([{ email: singleEmail, success: false, error: data.error }]);
        setShowResults(true);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error sending invitation",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailList = parseEmails(bulkEmails);
    
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
          role: bulkRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setShowResults(true);
        setBulkEmails("");
        
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
    setSingleEmail("");
    setSingleRole("MEMBER");
    setBulkEmails("");
    setBulkRole("MEMBER");
    setResults([]);
    setShowResults(false);
    setActiveTab("single");
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
      
      setBulkEmails(emailsFromCsv);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Team Members
          </DialogTitle>
        </DialogHeader>
        
        {!showResults ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Single Invite
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Bulk Invite
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Individual Invitation</CardTitle>
                  <CardDescription>
                    Send a personalized invitation to a specific team member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSingleInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="singleEmail">Email address</Label>
                      <Input
                        id="singleEmail"
                        type="email"
                        placeholder="colleague@example.com"
                        value={singleEmail}
                        onChange={(e) => setSingleEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="singleRole">Role</Label>
                      <Select value={singleRole} onValueChange={setSingleRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin - Full workspace access</SelectItem>
                          <SelectItem value="MEMBER">Member - Standard access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isLoading || !singleEmail.trim()} className="w-full">
                      {isLoading ? "Sending..." : "Send Invitation"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Bulk Invitations</CardTitle>
                  <CardDescription>
                    Invite multiple team members at once via email list or CSV upload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBulkInvite} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Manual Entry</h4>
                        <div className="space-y-2">
                          <Label htmlFor="bulkEmails">Email addresses</Label>
                          <Textarea
                            id="bulkEmails"
                            placeholder="Enter email addresses separated by commas or new lines:&#10;john@company.com&#10;jane@company.com&#10;team@company.com"
                            value={bulkEmails}
                            onChange={(e) => setBulkEmails(e.target.value)}
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
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                              <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
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

                    <div className="space-y-2">
                      <Label htmlFor="bulkRole">Default Role</Label>
                      <Select value={bulkRole} onValueChange={setBulkRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin - Full workspace access</SelectItem>
                          <SelectItem value="MEMBER">Member - Standard access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkEmails && (
                      <div className="space-y-2">
                        <Label>Preview ({parseEmails(bulkEmails).length} emails)</Label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border rounded-md p-2">
                          {parseEmails(bulkEmails).map((email, index) => (
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

                    <Button 
                      type="submit" 
                      disabled={isLoading || parseEmails(bulkEmails).length === 0}
                      className="w-full"
                    >
                      {isLoading ? "Sending..." : `Send ${parseEmails(bulkEmails).length} Invitations`}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
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
          </div>
        )}

        <DialogFooter className="pt-4">
          {!showResults ? (
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 