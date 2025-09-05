"use client";

import { useState } from "react";
import { Navigation } from "./page/Navigation";
import { FileUpload } from "./page/FileUpload";
import "@radix-ui/themes/styles.css";
import ChatBot from "./page/ChatBot";

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return <FileUpload />;
      case 'clients':
        return <ChatBot />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <div className="h-screen bg-background flex">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
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
  );
}