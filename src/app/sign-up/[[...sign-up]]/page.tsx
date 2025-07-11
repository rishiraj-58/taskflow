import { SignUp } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - TaskFlow",
  description: "Create a new TaskFlow account",
};

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Join TaskFlow to manage your projects efficiently
          </p>
        </div>
        <div className="mt-8">
          <SignUp
            redirectUrl="/onboarding"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
} 