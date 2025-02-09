'use client';

import { useState, useEffect } from 'react';
import { StorageService } from '@/lib/storage';
import { TimeBlockType } from '@/types';
import { initializeAgent } from '@/services/chatbot';
import { HumanMessage } from "@langchain/core/messages";
import { useChatbot } from '@/hooks/useChatbot';
import ChatMessage from './ChatMessage';

export default function Chat() {
  const [inputValue, setInputValue] = useState('');
  const { messages, setMessages, isLoading, sendMessage } = useChatbot();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      content: inputValue,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    await sendMessage(inputValue);
  };

  const debugChat = () => {
    const storage = StorageService.getInstance();
    console.log('Chat Debug:');
    console.log('Storage blocks:', storage.getTimeBlocks());
    console.log('Raw localStorage:', localStorage.getItem('calendar_data'));
  };

  const testAddEvent = () => {
    const testEvent = {
      _id: `test-${Date.now()}`,
      title: 'Test Event',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      priority: 'urgent-important' as const,
      delegatable: false,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const storage = StorageService.getInstance();
    console.log('Test: Adding event');
    storage.addTimeBlock(testEvent);
    console.log('Test: Event added');
    
    const event = new CustomEvent('calendarUpdate', {
      detail: testEvent
    });
    window.dispatchEvent(event);
    console.log('Test: Event dispatched');
  };

  const testDirectAdd = () => {
    const testEvent = {
      _id: `direct-${Date.now()}`,
      title: 'Direct Test Event',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      priority: 'urgent-important' as const,
      delegatable: false,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const storage = StorageService.getInstance();
    console.log('Direct Test: Before adding:', storage.getTimeBlocks());
    storage.addTimeBlock(testEvent);
    console.log('Direct Test: After adding:', storage.getTimeBlocks());
    
    const event = new CustomEvent('calendarUpdate', {
      detail: testEvent
    });
    window.dispatchEvent(event);
  };

  const testSendMessage = async () => {
    try {
      console.log('=== START testSendMessage ===');
      await sendMessage('can you add one urgent and important event at 2pm at 11th february for one hour?');
      console.log('=== END testSendMessage ===');
    } catch (error) {
      console.error('Error in testSendMessage:', error);
    }
  };

  const testAPI = async () => {
    console.log('Testing API route...');
    const response = await fetch('/api/test');
    console.log('Test API response:', await response.text());
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 border-b">
        <h1 className="text-xl font-semibold text-gray-800">AI Assistant</h1>
        <p className="text-sm text-gray-500">Ask me to schedule events for you</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>👋 Hello! I can help you schedule events and arrange transportation.</p>
            <p className="text-sm mt-2">Try saying: "Schedule an urgent meeting tomorrow at 2pm"</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))
        )}
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 disabled:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
} 