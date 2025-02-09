'use client';

import dynamic from 'next/dynamic';
import { TimeBlock } from '@/types';
import { useState, useEffect } from 'react';
import { StorageService } from '@/lib/storage';

// Dynamically import Calendar with no SSR
const Calendar = dynamic(
  () => import('@/components/Calendar').then((mod) => mod.Calendar),
  { ssr: false }
);

export default function CalendarPage() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    const storage = StorageService.getInstance();
    const blocks = storage.getTimeBlocks();
    console.log('CalendarPage: Initial blocks:', blocks);
    setTimeBlocks(blocks);
  }, []);

  const debugState = () => {
    console.log('CalendarPage Debug:');
    console.log('Current blocks:', timeBlocks);
    const storage = StorageService.getInstance();
    console.log('Storage blocks:', storage.getTimeBlocks());
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <button 
          onClick={debugState}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          Debug State
        </button>
      </div>
      <Calendar 
        timeBlocks={timeBlocks} 
        onBlocksChange={setTimeBlocks} 
      />
    </div>
  );
} 