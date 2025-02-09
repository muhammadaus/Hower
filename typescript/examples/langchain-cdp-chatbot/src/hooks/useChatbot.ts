'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatState } from '../types';

const CHAT_STORAGE_KEY = 'chat_history';

export const useChatbot = () => {
  const [state, setState] = useState<ChatState>(() => {
    // Load chat history from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            messages: parsed.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            })),
            isLoading: false,
            error: null
          };
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      }
    }
    return {
      messages: [],
      isLoading: false,
      error: null
    };
  });

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && state.messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        messages: state.messages
      }));
    }
  }, [state.messages]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      content,
      type: 'user',
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        content: data.response,
        type: 'assistant',
        timestamp: new Date()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }));
    }
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
  };
}; 