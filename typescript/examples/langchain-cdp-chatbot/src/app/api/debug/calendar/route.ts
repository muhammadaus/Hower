import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const storage = StorageService.getInstance();
    const timeBlocks = storage.getTimeBlocks();
    
    return NextResponse.json({ 
      success: true,
      timeBlocks,
      count: timeBlocks.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { 
      status: 500 
    });
  }
} 