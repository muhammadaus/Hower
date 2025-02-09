'use client';

import { useState } from 'react';
import Chat from '@/components/Chat';
import Calendar from '@/components/Calendar';
import DataStorage from '@/components/DataStorage';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'calendar' | 'storage'>('chat');

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 ${activeTab === 'chat' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 ${activeTab === 'calendar' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2 ${activeTab === 'storage' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Data Storage
        </button>
      </div>

      <div className="flex-1">
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'storage' && <DataStorage />}
      </div>
    </main>
  );
} 