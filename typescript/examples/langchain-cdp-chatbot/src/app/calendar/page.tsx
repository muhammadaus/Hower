'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/Calendar';
import { TimeBlock } from '@/types';

export default function CalendarPage() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number>(100);

  useEffect(() => {
    // Load saved time blocks from localStorage
    const savedBlocks = localStorage.getItem('timeBlocks');
    const savedRate = localStorage.getItem('hourlyRate');
    
    if (savedBlocks) {
      setTimeBlocks(JSON.parse(savedBlocks));
    }
    if (savedRate) {
      setHourlyRate(Number(savedRate));
    }
  }, []);

  const handleSavePresets = () => {
    localStorage.setItem('timeBlocks', JSON.stringify(timeBlocks));
    localStorage.setItem('hourlyRate', String(hourlyRate));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar Presets</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Hourly Rate (USD)
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="ml-2 p-1 border rounded"
          />
        </label>
      </div>

      <Calendar
        timeBlocks={timeBlocks}
        onBlocksChange={setTimeBlocks}
      />

      <button
        onClick={handleSavePresets}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Save Presets
      </button>
    </div>
  );
} 