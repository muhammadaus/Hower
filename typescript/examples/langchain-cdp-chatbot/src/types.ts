export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'tool';
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export type Priority = 'urgent-important' | 'important' | 'urgent' | 'neither';

export interface TimeBlock {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  priority: Priority;
  delegatable: boolean;
  maxBudget?: number;
}

export interface CalendarState {
  timeBlocks: TimeBlock[];
  hourlyRate: number;
} 