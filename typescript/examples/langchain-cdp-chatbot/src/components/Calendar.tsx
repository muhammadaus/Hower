'use client';

import { useState } from 'react';
import { TimeBlock, Priority } from '@/types';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

interface CalendarProps {
  timeBlocks: TimeBlock[];
  onBlocksChange: (blocks: TimeBlock[]) => void;
}

type ViewType = 'week' | 'month';

export const Calendar: React.FC<CalendarProps> = ({ timeBlocks, onBlocksChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  const getDaysInView = () => {
    if (viewType === 'week') {
      const start = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const days = [];
      let current = start;
      while (current <= end) {
        days.push(current);
        current = addDays(current, 1);
      }
      return days;
    }
  };

  const getBlocksForDay = (date: Date) => {
    return timeBlocks.filter(block => 
      isSameDay(new Date(block.startTime), date)
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {format(selectedDate, 'MMMM yyyy')}
        </h2>
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
                  key={block.id}
                  onClick={() => setEditingBlock(block)}
                  className={`p-1 text-sm rounded cursor-pointer ${getPriorityColor(block.priority)}`}
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
            {timeBlocks.filter(b => b.priority === 'urgent-important').map(block => (
              <div key={block.id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <h4 className="font-bold mb-2">Important, Not Urgent</h4>
            {timeBlocks.filter(b => b.priority === 'important').map(block => (
              <div key={block.id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h4 className="font-bold mb-2">Urgent, Not Important</h4>
            {timeBlocks.filter(b => b.priority === 'urgent').map(block => (
              <div key={block.id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <h4 className="font-bold mb-2">Neither</h4>
            {timeBlocks.filter(b => b.priority === 'neither').map(block => (
              <div key={block.id} className="text-sm mb-1">{block.title}</div>
            ))}
          </div>
        </div>
      </div>

      {editingBlock && (
        <TimeBlockEditor
          block={editingBlock}
          onSave={(block) => {
            onBlocksChange(timeBlocks.map(b => b.id === block.id ? block : b));
            setEditingBlock(null);
          }}
          onDelete={(id) => {
            onBlocksChange(timeBlocks.filter(b => b.id !== id));
            setEditingBlock(null);
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};

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
            onClick={() => onDelete(block.id)}
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

function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'urgent-important': return 'bg-red-200';
    case 'important': return 'bg-yellow-200';
    case 'urgent': return 'bg-green-200';
    case 'neither': return 'bg-blue-200';
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
} 