import { TimeBlockType, CalendarPresetType } from './schema';
import { encrypt, decrypt } from './crypto';

const CALENDAR_STORAGE_KEY = 'calendar_data';

type StorageListener = () => void;

export class StorageService {
  private static instance: StorageService;
  private data: CalendarPresetType;
  private listeners: Set<StorageListener> = new Set();

  private constructor() {
    this.data = this.load();
    console.log('StorageService: Initialized with data:', this.data);
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private load(): CalendarPresetType {
    if (typeof window === 'undefined') {
      return this.getDefaultData();
    }

    try {
      const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
      console.log('StorageService: Loading raw data:', raw);

      if (!raw) {
        console.log('StorageService: No data found, using default');
        return this.getDefaultData();
      }

      const decrypted = decrypt(raw);
      console.log('StorageService: Decrypted data:', decrypted);
      
      const parsed = JSON.parse(decrypted);
      console.log('StorageService: Parsed data:', parsed);
      
      return parsed;
    } catch (error) {
      console.error('StorageService: Load error:', error);
      return this.getDefaultData();
    }
  }

  private _save(): void {
    if (typeof window === 'undefined') {
      console.log('StorageService: Skipping save - no window object');
      return;
    }

    try {
      const dataToSave = JSON.stringify(this.data);
      console.log('StorageService: About to save:', this.data);
      
      const encrypted = encrypt(dataToSave);
      localStorage.setItem(CALENDAR_STORAGE_KEY, encrypted);
      
      // Verify the save
      const savedData = localStorage.getItem(CALENDAR_STORAGE_KEY);
      const decrypted = decrypt(savedData || '');
      console.log('StorageService: Save verification:', JSON.parse(decrypted));
      
      this.notifyListeners();
    } catch (error) {
      console.error('StorageService: Save failed:', error);
    }
  }

  addTimeBlock(block: TimeBlockType): void {
    console.log('StorageService: Current blocks:', this.data.timeBlocks);
    console.log('StorageService: Adding block:', block);
    
    // Make sure we're not adding duplicates
    if (!this.data.timeBlocks.some(b => b._id === block._id)) {
      this.data.timeBlocks = [...this.data.timeBlocks, block];
      console.log('StorageService: Updated blocks:', this.data.timeBlocks);
      this._save();
    } else {
      console.log('StorageService: Block already exists:', block._id);
    }
  }

  getTimeBlocks(): TimeBlockType[] {
    console.log('StorageService: Getting blocks:', this.data.timeBlocks);
    return [...this.data.timeBlocks];
  }

  getTimeBlock(id: string): TimeBlockType | null {
    const block = this.data.timeBlocks.find(block => block._id === id);
    console.log('StorageService: Getting block:', id, block);
    return block || null;
  }

  updateTimeBlock(block: TimeBlockType): void {
    this.data.timeBlocks = this.data.timeBlocks.map(b => 
      b._id === block._id ? block : b
    );
    this._save();
  }

  deleteTimeBlock(id: string): void {
    this.data.timeBlocks = this.data.timeBlocks.filter(b => b._id !== id);
    this._save();
  }

  subscribe(listener: StorageListener): () => void {
    console.log('StorageService: Adding listener');
    this.listeners.add(listener);
    return () => {
      console.log('StorageService: Removing listener');
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    console.log('StorageService: Notifying listeners, count:', this.listeners.size);
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('StorageService: Listener error:', error);
      }
    });
  }

  save(): void {
    this._save();
  }

  private getDefaultData(): CalendarPresetType {
    return {
      timeBlocks: [],
      hourlyRate: 100,
      delegationServices: []
    };
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

  // Add a method to verify if a block exists
  hasTimeBlock(id: string): boolean {
    const exists = this.data.timeBlocks.some(block => block._id === id);
    console.log(`StorageService: Checking if block ${id} exists:`, exists);
    return exists;
  }

  // Add a method to dump all data (for debugging)
  dumpData(): void {
    console.log('StorageService: Current data:', {
      timeBlocks: this.data.timeBlocks,
      hourlyRate: this.data.hourlyRate,
      delegationServices: this.data.delegationServices,
    });
  }

  updateAllBlocks(blocks: TimeBlockType[]): void {
    console.log('StorageService: Updating all blocks:', blocks);
    this.data.timeBlocks = [...blocks];
    this._save();
    this.notifyListeners();
  }

  static debugCurrentInstance() {
    if (StorageService.instance) {
      console.log('Current instance data:', StorageService.instance.data);
      return StorageService.instance.data;
    }
    return null;
  }

  // Add backup/restore methods for migration
  async backup(): Promise<string> {
    const dataToBackup = JSON.stringify(this.data);
    return encrypt(dataToBackup);
  }

  async restore(encryptedData: string): Promise<void> {
    try {
      const decrypted = decrypt(encryptedData);
      const parsed = JSON.parse(decrypted);
      this.data = parsed;
      this._save();
      console.log('StorageService: Restore successful');
    } catch (error) {
      console.error('StorageService: Restore failed:', error);
      throw error;
    }
  }
}

export function debugStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    console.log('Raw storage:', raw);
    
    if (raw) {
      const decrypted = decrypt(raw);
      console.log('Decrypted:', decrypted);
      
      const parsed = JSON.parse(decrypted);
      console.log('Parsed:', parsed);
      
      return parsed;
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
  return null;
}

export function debugEncryption(data: string): void {
  try {
    console.log('Original data:', data);
    const encrypted = encrypt(data);
    console.log('Encrypted:', encrypted);
    const decrypted = decrypt(encrypted);
    console.log('Decrypted:', decrypted);
  } catch (error) {
    console.error('Encryption debug error:', error);
  }
} 