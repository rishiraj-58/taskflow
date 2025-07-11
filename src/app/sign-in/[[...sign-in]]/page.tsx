import { SignIn } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - TaskFlow",
  description: "Sign in to your TaskFlow account",
};

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Welcome back to TaskFlow
          </p>
        </div>
        <div className="mt-8">
          <SignIn 
            redirectUrl="/dashboard"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  );
} 