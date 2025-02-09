'use client';

import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: {
    content: string;
    role: string;
    timestamp: string;
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Convert string timestamp to Date object
  const timestamp = new Date(message.timestamp);

  return (
    <div className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[70%] rounded p-3 ${
        message.role === 'assistant' ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        <p className="text-sm">{message.content}</p>
        <span className="text-xs opacity-70">
          {timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage; 