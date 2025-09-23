"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Chrome } from "lucide-react"

export default function SignInPage() {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <main role="main" className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center" data-testid="signin-title">Welcome to Business Assistant</CardTitle>
            <CardDescription className="text-center" data-testid="signin-description">
              Sign in to your account to manage your business documents and clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGoogleSignIn}
              className="w-full min-h-[44px]"
              variant="outline"
              data-testid="google-signin-button"
              tabIndex={0}
              aria-label="Sign in with Google"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            
            <div className="text-xs text-center text-gray-500 mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}