import { useState } from 'react';
import { CalendarStorageService } from '@/services/calendarStorage';

export default function DataStorage() {
  const [schemaId, setSchemaId] = useState('');
  const [nodeUrl, setNodeUrl] = useState('');
  const [jwt, setJwt] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleStore = async () => {
    try {
      setStatus('loading');
      const storage = CalendarStorageService.getInstance();
      
      // Get all calendar events from local storage
      const calendarData = localStorage.getItem('calendar_data');
      if (!calendarData) {
        throw new Error('No calendar data found');
      }

      const events = JSON.parse(calendarData);
      
      // Store configuration
      storage.setConfig({
        url: nodeUrl,
        jwt: jwt,
        schemaId: schemaId
      });

      // Store events
      const result = await storage.storeEvents(events);
      
      setStatus('success');
      setMessage(`Successfully stored ${result.length} events`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="flex flex-col p-6 space-y-4">
      <h2 className="text-xl font-bold">Data Storage Configuration</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Schema ID</label>
          <input
            type="text"
            value={schemaId}
            onChange={(e) => setSchemaId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter schema ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Node URL</label>
          <input
            type="text"
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter node URL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">JWT Token</label>
          <input
            type="password"
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter JWT token"
          />
        </div>

        <button
          onClick={handleStore}
          disabled={status === 'loading'}
          className={`px-4 py-2 rounded-md text-white ${
            status === 'loading' 
              ? 'bg-gray-400' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {status === 'loading' ? 'Storing...' : 'Store Calendar Data'}
        </button>

        {message && (
          <div className={`p-4 rounded-md ${
            status === 'error' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Current Calendar Data</h3>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
          {localStorage.getItem('calendar_data') || 'No data found'}
        </pre>
      </div>
    </div>
  );
} 