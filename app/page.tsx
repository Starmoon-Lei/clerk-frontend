"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "./page/Navigation";
import { FileUpload } from "./page/FileUpload";
import "@radix-ui/themes/styles.css";
import ChatBot from "./page/ChatBot";
import { Button } from "./components/ui/button";
import Link from "next/link";
import { SectionErrorBoundary, PageErrorBoundary } from "../components/ui/error-boundary";

export default function App() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('upload');

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <SectionErrorBoundary>
            <FileUpload />
          </SectionErrorBoundary>
        );
      case 'clients':
        return (
          <SectionErrorBoundary>
            <ChatBot />
          </SectionErrorBoundary>
        );
      default:
        return (
          <SectionErrorBoundary>
            <FileUpload />
          </SectionErrorBoundary>
        );
    }
  };

  if (status === "loading") {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <main className="text-center space-y-4" role="main">
          <h1 className="text-4xl font-bold">Business Assistant - Clerk</h1>
          <p className="text-lg text-gray-600">Please sign in to access your business documents and clients</p>
          <Button asChild tabIndex={0}>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <PageErrorBoundary>
      <div className="h-screen bg-background flex">
        <SectionErrorBoundary>
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </SectionErrorBoundary>

        <main className="flex-1 overflow-auto">
          {activeTab === 'upload' ? (
            <div className="h-full flex items-center justify-center p-8">
              {renderContent()}
            </div>
          ) : (
            <div className="h-full">
              {renderContent()}
            </div>
          )}
        </main>
      </div>
    </PageErrorBoundary>
  );
}