'use client';

import { useEffect, useState } from 'react';
import { StorageService } from '@/lib/storage';
import { TimeBlockType } from '@/types';
import { decrypt } from '@/lib/crypto';

export const CalendarDebug = () => {
  const [blocks, setBlocks] = useState<TimeBlockType[]>([]);
  const [rawData, setRawData] = useState<string>('');
  const [decryptedData, setDecryptedData] = useState<string>('');

  useEffect(() => {
    const storage = StorageService.getInstance();
    
    // Get initial data
    setBlocks(storage.getTimeBlocks());
    const encryptedData = localStorage.getItem('calendar_data') || 'No data';
    setRawData(encryptedData);

    // Try to decrypt the data
    try {
      if (encryptedData !== 'No data') {
        const decrypted = decrypt(encryptedData);
        setDecryptedData(decrypted);
      }
    } catch (error) {
      console.error('Failed to decrypt:', error);
      setDecryptedData('Failed to decrypt data');
    }

    // Subscribe to changes
    const unsubscribe = storage.subscribe(() => {
      setBlocks(storage.getTimeBlocks());
      const newEncryptedData = localStorage.getItem('calendar_data') || 'No data';
      setRawData(newEncryptedData);
      
      try {
        if (newEncryptedData !== 'No data') {
          const decrypted = decrypt(newEncryptedData);
          setDecryptedData(decrypted);
        }
      } catch (error) {
        console.error('Failed to decrypt:', error);
        setDecryptedData('Failed to decrypt data');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Calendar Debug</h3>
      <div className="mb-4">
        <h4 className="font-semibold">Time Blocks ({blocks.length}):</h4>
        <pre className="bg-white p-2 rounded text-sm">
          {JSON.stringify(blocks, null, 2)}
        </pre>
      </div>
      <div className="mb-4">
        <h4 className="font-semibold">Encrypted Storage Data:</h4>
        <pre className="bg-white p-2 rounded text-sm overflow-wrap-anywhere">
          {rawData}
        </pre>
      </div>
      <div>
        <h4 className="font-semibold">Decrypted Storage Data:</h4>
        <pre className="bg-white p-2 rounded text-sm overflow-wrap-anywhere">
          {decryptedData}
        </pre>
      </div>
    </div>
  );
}; 