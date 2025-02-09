'use client';

import { useState, useEffect } from 'react';
import { TimeBlock, Priority } from '@/types';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, addMonths } from 'date-fns';
import { StorageService } from '@/lib/storage';

interface CalendarProps {
  timeBlocks: TimeBlock[];
  onBlocksChange: (blocks: TimeBlock[]) => void;
}

type ViewType = 'week' | 'month';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent-important':
      return 'bg-red-200';
    case 'important':
      return 'bg-yellow-200';
    case 'urgent':
      return 'bg-green-200';
    case 'neither':
      return 'bg-blue-200';
    default:
      return 'bg-gray-200';
  }
};

export default function Calendar({ timeBlocks: propTimeBlocks, onBlocksChange }: CalendarProps) {
  const [isClient, setIsClient] = useState(false);
  const [localTimeBlocks, setLocalTimeBlocks] = useState<TimeBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle custom events from Chat component
  useEffect(() => {
    const handleCalendarUpdate = (event: CustomEvent<TimeBlock>) => {
      console.log('Calendar: Received update event:', event.detail);
      const storage = StorageService.getInstance();
      const blocks = storage.getTimeBlocks();
      console.log('Calendar: Current blocks after update:', blocks);
      setLocalTimeBlocks(blocks);
    };

    // Add event listener
    window.addEventListener('calendarUpdate', handleCalendarUpdate as EventListener);
    
    // Initial load
    const storage = StorageService.getInstance();
    const blocks = storage.getTimeBlocks();
    console.log('Calendar: Initial load - blocks:', blocks);
    setLocalTimeBlocks(blocks);

    // Cleanup
    return () => {
      window.removeEventListener('calendarUpdate', handleCalendarUpdate as EventListener);
    };
  }, []);

  // Add a subscription to storage changes
  useEffect(() => {
    const storage = StorageService.getInstance();
    const unsubscribe = storage.subscribe(() => {
      console.log('Calendar: Storage change detected');
      const blocks = storage.getTimeBlocks();
      console.log('Calendar: Updated blocks:', blocks);
      setLocalTimeBlocks([...blocks]); // Force a new array reference
    });

    return () => unsubscribe();
  }, []);

  // Debug function
  const debugCalendar = () => {
    const storage = StorageService.getInstance();
    console.log('Calendar Debug:');
    console.log('Local state blocks:', localTimeBlocks);
    console.log('Storage blocks:', storage.getTimeBlocks());
    console.log('Raw localStorage:', localStorage.getItem('calendar_data'));
  };

  const getDaysInView = () => {
    if (viewType === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday start
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const days = [];
      let current = start;
      
      // Include days from previous month to fill first week
      const firstDayOfMonth = start.getDay();
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.unshift(addDays(start, -i - 1));
      }
      
      // Add all days of current month
      while (current <= end) {
        days.push(current);
        current = addDays(current, 1);
      }
      
      return days;
    }
  };

  const getBlocksForDay = (date: Date) => {
    console.log('Getting blocks for date:', format(date, 'yyyy-MM-dd'));
    console.log('All blocks:', localTimeBlocks.map(b => ({
      id: b._id,
      title: b.title,
      date: format(new Date(b.startTime), 'yyyy-MM-dd'),
      startTime: b.startTime
    })));
    
    return localTimeBlocks.filter(block => {
      const blockDate = new Date(block.startTime);
      const compareDate = date;
      
      // Compare year, month, and day
      const matches = 
        blockDate.getUTCFullYear() === compareDate.getFullYear() &&
        blockDate.getUTCMonth() === compareDate.getMonth() &&
        blockDate.getUTCDate() === compareDate.getDate();
      
      console.log(`Block ${block.title}:
        Block date: ${format(blockDate, 'yyyy-MM-dd')}
        Compare date: ${format(compareDate, 'yyyy-MM-dd')}
        Block year/month/day: ${blockDate.getUTCFullYear()}/${blockDate.getUTCMonth()}/${blockDate.getUTCDate()}
        Compare year/month/day: ${compareDate.getFullYear()}/${compareDate.getMonth()}/${compareDate.getDate()}
        Matches: ${matches}
      `);
      return matches;
    });
  };

  const testStorage = () => {
    const storage = StorageService.getInstance();
    const testEvent = {
      _id: 'test-123',
      title: 'Test Event',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      priority: 'urgent-important' as const,
      delegatable: false,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Testing storage...');
    storage.addTimeBlock(testEvent);
    console.log('Added test event');
    console.log('Current blocks:', storage.getTimeBlocks());
  };

  if (!isClient) {
    return <div>Loading calendar...</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setSelectedDate(addMonths(selectedDate, -1))}
          className="px-3 py-1 rounded bg-gray-200"
        >
          Previous Month
        </button>
        <h2 className="text-xl font-bold">
          {format(selectedDate, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
          className="px-3 py-1 rounded bg-gray-200"
        >
          Next Month
        </button>
      </div>

      <div className={`flex justify-between items-center mb-4`}>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('week')}
            className={`px-3 py-1 rounded ${
              viewType === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewType('month')}
            className={`px-3 py-1 rounded ${
              viewType === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className={`grid ${viewType === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-2`}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-bold p-2">
            {day}
          </div>
        ))}
        
        {getDaysInView().map(date => (
          <div
            key={date.toISOString()}
            className={`min-h-[100px] border rounded p-2 ${
              isSameDay(date, new Date()) ? 'bg-blue-50' : ''
            }`}
          >
            <div className="text-right text-sm text-gray-500">
              {format(date, 'd')}
            </div>
            <div className="space-y-1">
              {getBlocksForDay(date).map(block => (
                <div
                  key={block._id}
                  onClick={() => setEditingBlock(block)}
                  className={`p-1 text-sm rounded cursor-pointer ${getPriorityColor(block.priority)} bg-opacity-50`}
                >
                  <div className="font-medium truncate">{block.title}</div>
                  <div className="text-xs">
                    {format(new Date(block.startTime), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Eisenhower Matrix */}
      <div className="mt-4">
        <h3 className="font-bold mb-2">Task Matrix</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-100 p-4 rounded">
            <h4 className="font-bold mb-2">Urgent & Important</h4>
            {localTimeBlocks.filter(b => b.priority === 'urgent-important').map(block => (
              <div key={block._id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <h4 className="font-bold mb-2">Important, Not Urgent</h4>
            {localTimeBlocks.filter(b => b.priority === 'important').map(block => (
              <div key={block._id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h4 className="font-bold mb-2">Urgent, Not Important</h4>
            {localTimeBlocks.filter(b => b.priority === 'urgent').map(block => (
              <div key={block._id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <h4 className="font-bold mb-2">Neither</h4>
            {localTimeBlocks.filter(b => b.priority === 'neither').map(block => (
              <div key={block._id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
        </div>
      </div>

      {editingBlock && (
        <TimeBlockEditor
          block={editingBlock}
          onSave={(block) => {
            const storage = StorageService.getInstance();
            storage.updateTimeBlock(block);
            const updatedBlocks = storage.getTimeBlocks();
            setLocalTimeBlocks(updatedBlocks);
            onBlocksChange(updatedBlocks);
            setEditingBlock(null);
          }}
          onDelete={(id) => {
            const storage = StorageService.getInstance();
            storage.deleteTimeBlock(id);
            const updatedBlocks = storage.getTimeBlocks();
            setLocalTimeBlocks(updatedBlocks);
            onBlocksChange(updatedBlocks);
            setEditingBlock(null);
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}

      <button onClick={testStorage} className="bg-blue-500 text-white px-4 py-2 rounded">
        Test Storage
      </button>
    </div>
  );
}

const TimeBlockEditor: React.FC<{
  block: TimeBlock;
  onSave: (block: TimeBlock) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ block, onSave, onDelete, onClose }) => {
  const [editedBlock, setEditedBlock] = useState(block);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded">
        <h3 className="text-lg font-bold mb-4">Edit Time Block</h3>
        
        <input
          type="text"
          value={editedBlock.title}
          onChange={e => setEditedBlock({ ...editedBlock, title: e.target.value })}
          className="block w-full mb-2 p-2 border rounded"
        />

        <select
          value={editedBlock.priority}
          onChange={e => setEditedBlock({ ...editedBlock, priority: e.target.value as Priority })}
          className="block w-full mb-2 p-2 border rounded"
        >
          <option value="urgent-important">Urgent & Important</option>
          <option value="important">Important, Not Urgent</option>
          <option value="urgent">Urgent, Not Important</option>
          <option value="neither">Neither</option>
        </select>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => onDelete(block._id)}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Delete
          </button>
          <button
            onClick={() => {
              onSave(editedBlock);
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
} 