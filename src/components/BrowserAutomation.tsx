'use client';

import { useState } from 'react';

export default function BrowserAutomation() {
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!instruction.trim()) {
      setError('Please enter an instruction');
      return;
    }

    setIsProcessing(true);
    setStatus('Processing your instruction...');
    setError('');

    try {
      const response = await fetch('/api/browser-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction })
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`Success: ${data.message || 'Action completed'}`);
      } else {
        setError(`Error: ${data.error || 'Something went wrong'}`);
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Browser Automation</h2>
      
      <div className="space-y-4">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="w-full p-3 border rounded-lg shadow-sm"
          rows={4}
          placeholder="Try: 'Go to google.com'"
          disabled={isProcessing}
        />
        
        <button 
          onClick={handleSubmit}
          disabled={isProcessing}
          className={`w-full py-2 px-4 rounded-lg text-white ${
            isProcessing 
              ? 'bg-gray-400' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Execute'}
        </button>
        
        {status && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg">
            {status}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 