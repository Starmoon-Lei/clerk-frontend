"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { ArrowUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export function ClientsManagement() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasMessages = messages.length > 0;

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I understand your message. This is a demo response from the assistant. I'm here to help you with whatever you need. Feel free to ask me anything!",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Empty state - centered welcome screen
  if (!hasMessages && !isTyping) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Centered content area */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-8">
          <div className="text-center mb-16">
            <h1 className="text-3xl mb-4">What can I help with?</h1>
          </div>
        </div>

        {/* Bottom input area */}
        <div className="pb-8 px-8">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask ChatGPT"
                className="w-full pr-12 py-4 text-base rounded-full border-muted-foreground/20 focus:border-ring"
                disabled={isTyping}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputValue.trim() || isTyping}
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat view - full conversation interface
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                    {message.sender === 'user' ? 'You' : 'AI'}
                  </div>
                  <span className="text-sm text-muted-foreground capitalize">{message.sender}</span>
                </div>
                <div className="ml-11">
                  <div className="prose prose-sm max-w-none">
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                    AI
                  </div>
                  <span className="text-sm text-muted-foreground">Assistant</span>
                </div>
                <div className="ml-11">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom input area */}
      <div className="pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message ChatGPT"
              className="w-full pr-12 py-4 text-base rounded-full border-muted-foreground/20 focus:border-ring"
              disabled={isTyping}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isTyping}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}