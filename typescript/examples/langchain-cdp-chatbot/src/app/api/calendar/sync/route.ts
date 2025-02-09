import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const storage = StorageService.getInstance();
    const timeBlocks = storage.getTimeBlocks();
    
    return NextResponse.json({ 
      success: true,
      timeBlocks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { 
      status: 500 
    });
  }
} 