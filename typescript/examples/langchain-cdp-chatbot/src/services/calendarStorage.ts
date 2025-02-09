import { StorageConfig, NodeName } from '@/types';

const NODE_CONFIG = {
  // Your node configuration here
};

interface StorageConfig {
  url: string;
  jwt: string;
  schemaId: string;
}

export class CalendarStorageService {
  private static instance: CalendarStorageService;
  private config: StorageConfig | null = null;
  
  private constructor() {}

  static getInstance(): CalendarStorageService {
    if (!CalendarStorageService.instance) {
      CalendarStorageService.instance = new CalendarStorageService();
    }
    return CalendarStorageService.instance;
  }

  setConfig(config: StorageConfig) {
    this.config = config;
  }

  async storeEvents(events: CalendarEvent[]): Promise<string[]> {
    if (!this.config) {
      throw new Error('Storage not configured');
    }

    try {
      const response = await fetch(`${this.config.url}/api/v1/data/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: this.config.schemaId,
          data: events
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Events stored:', result);
      return result.data.created;
    } catch (error) {
      console.error('Error storing events:', error);
      throw error;
    }
  }
} 