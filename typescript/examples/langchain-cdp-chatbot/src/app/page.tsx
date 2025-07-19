'use client';

import { useState } from 'react';
import { MessageCircle, Calendar as CalendarIcon, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import Chat from '@/components/Chat';
import Calendar from '@/components/Calendar';
import DataStorage from '@/components/DataStorage';
import { Card } from '@/components/ui/card';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'calendar' | 'storage'>('chat');

  const tabs = [
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageCircle,
      component: Chat
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarIcon,
      component: Calendar
    },
    {
      id: 'storage',
      label: 'Data Storage',
      icon: Database,
      component: DataStorage
    }
  ] as const;

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Card className="shadow-lg">
          <div className="flex border-b bg-white rounded-t-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
                    'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6 bg-white rounded-b-lg min-h-[600px]">
            {tabs.map((tab) => {
              const Component = tab.component;
              return activeTab === tab.id && <Component key={tab.id} />;
            })}
          </div>
        </Card>
      </div>
    </main>
  );
}