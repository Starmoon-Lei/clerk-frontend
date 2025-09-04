"use client";

import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { FileUpload } from "./components/FileUpload";
import "@radix-ui/themes/styles.css";
import ChatBot from "./components/ChatBot";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');


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

  // return (
  //   <>
  //     {messages.map(message => (
  //       <div key={message.id}>
  //         {message.role === 'user' ? 'User: ' : 'AI: '}
  //         {message.parts.map((part, index) =>
  //           part.type === 'text' ? <span key={index}>{part.text}</span> : null,
  //         )}
  //       </div>
  //     ))}

  //     <form
  //       onSubmit={e => {
  //         e.preventDefault();
  //         if (input.trim()) {
  //           sendMessage({ text: input });
  //           setInput('');
  //         }
  //       }}
  //     >
  //       <input
  //         value={input}
  //         onChange={e => setInput(e.target.value)}
  //         disabled={status !== 'ready'}
  //         placeholder="Say something..."
  //       />
  //       <button type="submit" disabled={status !== 'ready'}>
  //         Submit
  //       </button>
  //     </form>
  //   </>
  // );
}