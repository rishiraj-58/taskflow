"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { RoleSelection } from '@/components/onboarding/RoleSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          if (userData.primaryRole) {
            // User has already completed onboarding, redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.log('User not found in database yet, continuing with onboarding');
      } finally {
        setCheckingProfile(false);
      }
    };

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, router]);

  const handleNextStep = () => {
    if (!firstName || !lastName) {
      setError('Please fill in both first and last name.');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleComplete = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user context');
      }

      await user?.reload();
      router.push('/dashboard');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking profile
  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className={`w-full transition-all duration-500 ${currentStep === 1 ? 'max-w-2xl' : 'max-w-6xl'}`}>
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Personal Info</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                2
              </div>
              <span className="text-sm font-medium">Choose Role</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          {currentStep === 1 ? (
            // Step 1: Personal Information - Compact Layout
            <>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  Welcome to TaskFlow
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  Let's start by getting to know you better
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12 text-base border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 text-base border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleNextStep}
                    disabled={!firstName || !lastName}
                    className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <div className="flex items-center justify-center space-x-3 text-sm text-gray-500 dark:text-gray-400 pt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Your information is encrypted and secure</span>
                </div>
              </CardContent>
            </>
          ) : (
            // Step 2: Role Selection - Full Width Layout
            <>
              <CardHeader className="text-center pb-12">
                <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Choose Your Role
                </CardTitle>
                <CardDescription className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Select your primary role to unlock a personalized TaskFlow experience tailored to your workflow and responsibilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-12 pb-12">
                {/* Full-width role selection */}
                <div className="w-full">
                  <RoleSelection onRoleSelected={setSelectedRole} selectedRole={selectedRole} />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">{error}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-8 max-w-4xl mx-auto">
                  <Button 
                    onClick={handlePreviousStep}
                    variant="outline"
                    className="h-12 px-8 text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Personal Info
                  </Button>

                  <Button 
                    onClick={handleComplete}
                    disabled={loading || !selectedRole}
                    className="h-12 px-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Setting up your workspace...</span>
                      </div>
                    ) : (
                      'Complete Setup & Start Using TaskFlow'
                    )}
                  </Button>
                </div>

                {/* Help text */}
                <div className="text-center space-y-2 pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You can always change your role later in account settings
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Each role provides unique dashboards, AI assistants, and workflow optimizations
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
} 