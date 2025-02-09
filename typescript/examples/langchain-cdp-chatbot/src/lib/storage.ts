import { TimeBlockType, CalendarPresetType } from './schema';
import { encrypt, decrypt } from './crypto';

const STORAGE_KEY = 'calendar_presets';

export class StorageService {
  private static instance: StorageService;
  private data: CalendarPresetType;

  private constructor() {
    this.data = this.load();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private load(): CalendarPresetType {
    if (typeof window === 'undefined') return this.getDefaultData();
    
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return this.getDefaultData();

    try {
      const decrypted = decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to load data:', error);
      return this.getDefaultData();
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    
    const encrypted = encrypt(JSON.stringify(this.data));
    localStorage.setItem(STORAGE_KEY, encrypted);
  }

  private getDefaultData(): CalendarPresetType {
    return {
      timeBlocks: [],
      hourlyRate: 100,
      delegationServices: [],
    };
  }

  getTimeBlocks(): TimeBlockType[] {
    return this.data.timeBlocks;
  }

  addTimeBlock(block: TimeBlockType): void {
    this.data.timeBlocks.push(block);
    this.save();
  }

  updateTimeBlock(block: TimeBlockType): void {
    const index = this.data.timeBlocks.findIndex(b => b._id === block._id);
    if (index !== -1) {
      this.data.timeBlocks[index] = block;
      this.save();
    }
  }

  deleteTimeBlock(id: string): void {
    this.data.timeBlocks = this.data.timeBlocks.filter(b => b._id !== id);
    this.save();
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonData: string): void {
    try {
      const parsed = JSON.parse(jsonData);
      // Validate against schema here
      this.data = parsed;
      this.save();
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid data format');
    }
  }
} 