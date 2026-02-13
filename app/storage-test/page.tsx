'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function StorageTestPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const addStatus = (msg: string) => {
    setStatus(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setStatus([]);

    try {
      // Test 1: Check Supabase connection
      addStatus('Testing Supabase connection...');
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        addStatus(`❌ Connection error: ${listError.message}`);
        return;
      }
      addStatus(`✅ Connected to Supabase`);
      addStatus(`📦 Available buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}`);

      // Test 2: Check if 'expenses' bucket exists
      const expensesBucket = buckets?.find(b => b.name === 'expenses');
      if (!expensesBucket) {
        addStatus(`❌ Bucket 'expenses' not found!`);
        addStatus(`💡 Go to Supabase Dashboard > Storage > New Bucket`);
        addStatus(`   Name: expenses`);
        addStatus(`   ✓ Check "Public bucket"`);
        return;
      }
      addStatus(`✅ Bucket 'expenses' exists (public: ${expensesBucket.public})`);

      // Test 3: List bucket contents
      addStatus('Checking bucket access...');
      const { data: files, error: filesError } = await supabase.storage
        .from('expenses')
        .list('', { limit: 5 });
      
      if (filesError) {
        addStatus(`❌ Cannot list bucket contents: ${filesError.message}`);
        addStatus(`💡 Add SELECT policy in Supabase > Storage > expenses > Policies`);
      } else {
        addStatus(`✅ Can read bucket (${files?.length || 0} items found)`);
      }

      // Test 4: Test upload (if file provided)
      if (file && user?.uid) {
        addStatus(`Testing upload with file: ${file.name} (${(file.size/1024).toFixed(1)}KB, ${file.type})`);
        
        const testPath = `test/${user.uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('expenses')
          .upload(testPath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream'
          });

        if (uploadError) {
          addStatus(`❌ Upload failed: ${uploadError.message}`);
          
          if (uploadError.message.includes('policy') || uploadError.message.includes('security') || uploadError.message.includes('violates')) {
            addStatus(`💡 FIX: Add INSERT policy in Supabase Dashboard:`);
            addStatus(`   1. Go to Storage > expenses bucket > Policies`);
            addStatus(`   2. Click "New Policy" > "For full customization"`);
            addStatus(`   3. Name: "Allow uploads"`);
            addStatus(`   4. Operation: INSERT`);
            addStatus(`   5. Target roles: anon, authenticated`);
            addStatus(`   6. Policy definition: true`);
            addStatus(`   7. Click "Review" then "Save policy"`);
          }
        } else {
          addStatus(`✅ Upload successful!`);
          addStatus(`   Path: ${uploadData?.path}`);
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('expenses')
            .getPublicUrl(testPath);
          
          addStatus(`   URL: ${urlData?.publicUrl}`);
          
          // Clean up test file
          await supabase.storage.from('expenses').remove([testPath]);
          addStatus(`🧹 Test file cleaned up`);
        }
      } else if (!file) {
        addStatus(`ℹ️ Select a file above to test upload functionality`);
      } else if (!user?.uid) {
        addStatus(`❌ Not logged in - cannot test upload`);
      }

    } catch (err: any) {
      addStatus(`❌ Unexpected error: ${err.message}`);
      console.error('Diagnostics error:', err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Storage Diagnostics</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="text-sm mb-2">
          <strong>User:</strong> {user?.email || 'Not logged in'}
        </p>
        <p className="text-sm">
          <strong>User ID:</strong> {user?.uid || 'N/A'}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Select a test file (optional - for upload test):
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm border rounded p-2"
        />
        {file && (
          <p className="text-sm text-gray-600 mt-1">
            Selected: {file.name} ({(file.size/1024).toFixed(1)}KB)
          </p>
        )}
      </div>

      <button
        onClick={runDiagnostics}
        disabled={testing}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {testing ? 'Running diagnostics...' : 'Run Storage Diagnostics'}
      </button>

      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm min-h-64 overflow-auto">
        {status.length === 0 ? (
          <p className="text-gray-500">Click the button above to run diagnostics...</p>
        ) : (
          status.map((line, i) => (
            <div key={i} className="mb-1">{line}</div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="font-bold mb-2">Quick Fix Steps:</h2>
        <ol className="list-decimal list-inside text-sm space-y-2">
          <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Supabase Dashboard</a></li>
          <li>Select your project</li>
          <li>Go to <strong>Storage</strong> in the left sidebar</li>
          <li>If no "expenses" bucket exists:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Click <strong>New Bucket</strong></li>
              <li>Name: <code className="bg-gray-200 px-1">expenses</code></li>
              <li>✓ Check <strong>"Public bucket"</strong></li>
              <li>Click <strong>Create bucket</strong></li>
            </ul>
          </li>
          <li>Click on the "expenses" bucket</li>
          <li>Go to <strong>Policies</strong> tab</li>
          <li>Add these policies (if not present):
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><strong>INSERT</strong> policy: Allow uploads (target: anon, authenticated; definition: <code className="bg-gray-200 px-1">true</code>)</li>
              <li><strong>SELECT</strong> policy: Allow reads (target: anon, authenticated; definition: <code className="bg-gray-200 px-1">true</code>)</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}
