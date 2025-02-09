'use client';

import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useChatbot } from '@/hooks/useChatbot';
import { useRef, useEffect } from 'react';

export default function Home() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, error, sendMessage } = useChatbot();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-500 text-white p-4">
        <h1 className="text-xl font-bold">CDP Chatbot</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
          
          {error && (
            <div className="text-red-500 text-center p-2">
              {error}
            </div>
          )}
        </div>
      </main>

      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
    </div>
  );
} 